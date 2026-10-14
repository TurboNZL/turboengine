package app.turbomusic.android

import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import java.io.ByteArrayInputStream
import java.net.HttpURLConnection
import java.net.URI
import java.net.URL

/**
 * Pure decisions of [AccessProxy] (JVM-testable, no Android classes).
 */
object AccessRoute {
    /** "scheme://host:port" of a URL, lower-cased; "" when it is not an http(s) URL. */
    fun origin(url: String): String = try {
        val u = URI(url.trim())
        val scheme = u.scheme?.lowercase() ?: ""
        val port = if (u.port >= 0) u.port else if (scheme == "https") 443 else 80
        if ((scheme == "http" || scheme == "https") && !u.host.isNullOrEmpty()) "$scheme://${u.host.lowercase()}:$port" else ""
    } catch (e: Exception) { "" }

    /** The request is for the library server and needs the service token added (page <img>/<audio> cannot send headers). */
    fun isServerRequest(serverUrl: String, requestUrl: String): Boolean {
        val s = origin(serverUrl)
        return s.isNotEmpty() && s == origin(requestUrl)
    }

    /** Request headers worth forwarding: not the browser's own origin/host/cookie bookkeeping. */
    fun forwardable(headers: Map<String, String>): Map<String, String> =
        headers.filterKeys { it.lowercase() !in setOf("host", "origin", "referer", "cookie", "connection") }

    /** The answer to a CORS preflight, so Cloudflare Access (which refuses header-less preflights) never sees it. */
    fun preflightHeaders(requestedHeaders: String?): Map<String, String> = mapOf(
        "Access-Control-Allow-Origin" to "*",
        "Access-Control-Allow-Methods" to "GET, POST, PUT, DELETE, HEAD, OPTIONS",
        "Access-Control-Allow-Headers" to (requestedHeaders?.takeIf { it.isNotBlank() } ?: "Authorization, Content-Type, Range"),
        "Access-Control-Max-Age" to "86400",
    )

    /**
     * The upstream answer's headers as the WebView should get them. The server (and Cloudflare in front of it) already send their own
     * `Access-Control-Allow-Origin` (often in lower case), and adding ours next to it made two values, which Chromium refuses ("contains multiple
     * values '*, *'"): every fetch() the page made through the proxy, sync included, failed. Ours replace theirs, case-insensitively. Hop-by-hop
     * headers are dropped too, because the body is handed over already de-chunked.
     */
    fun answerHeaders(upstream: Map<String, String>): Map<String, String> {
        val ours = corsAnswer.keys.map { it.lowercase() }.toSet()
        val drop = setOf("transfer-encoding", "connection", "keep-alive", "proxy-authenticate", "te", "trailer", "upgrade") + ours
        val out = LinkedHashMap<String, String>()
        for ((k, v) in upstream) if (k.lowercase() !in drop) out[k] = v
        out.putAll(corsAnswer)
        return out
    }

    /** Headers added to every proxied answer so the page (http://localhost) may read it. */
    val corsAnswer: Map<String, String> = mapOf(
        "Access-Control-Allow-Origin" to "*",
        "Access-Control-Expose-Headers" to "Content-Range, Accept-Ranges, Content-Length, Content-Type",
    )
}

/**
 * The page is served from http://localhost while the library server is another origin behind Cloudflare Access. An <img> or <audio> element
 * cannot send the Access service token, so before this the page had to download every cover and every Rank preview whole with fetch() and
 * hand the element a blob (about 5 s for one song). Here the token is added to the page's GET/HEAD requests for the server natively and the
 * answer is streamed back with Range support, so previews start at once. Preflights are answered locally. Does nothing without a token.
 * (Requests with a body are not visible here: the page sends the token itself on those.)
 */
class AccessProxy(private val prefs: ServerPrefs) {
    fun handle(request: WebResourceRequest): WebResourceResponse? {
        val extra = prefs.accessHeaders()
        if (extra.isEmpty()) return null
        val url = request.url.toString()
        if (!AccessRoute.isServerRequest(prefs.serverUrl, url)) return null
        return try {
            when (request.method.uppercase()) {
                "OPTIONS" -> WebResourceResponse("text/plain", "utf-8", 204, "No Content",
                    AccessRoute.preflightHeaders(request.requestHeaders["Access-Control-Request-Headers"]), ByteArrayInputStream(ByteArray(0)))
                "GET", "HEAD" -> fetch(request, url, extra)
                else -> null
            }
        } catch (e: Exception) { null } // fall back to Chromium's own request (the page's own headers apply)
    }

    private fun fetch(request: WebResourceRequest, url: String, extra: Map<String, String>): WebResourceResponse? {
        val c = URL(url).openConnection() as HttpURLConnection
        c.requestMethod = request.method.uppercase()
        c.connectTimeout = 15_000
        c.readTimeout = 60_000
        c.instanceFollowRedirects = true
        AccessRoute.forwardable(request.requestHeaders).forEach { (k, v) -> c.setRequestProperty(k, v) }
        extra.forEach { (k, v) -> c.setRequestProperty(k, v) }
        val code = c.responseCode
        val upstream = LinkedHashMap<String, String>()
        for ((k, v) in c.headerFields) if (k != null && v.isNotEmpty()) upstream[k] = v.last()
        val headers = AccessRoute.answerHeaders(upstream)
        val mime = (c.contentType ?: "application/octet-stream").substringBefore(';').trim()
        val body = if (code >= 400) c.errorStream else c.inputStream
        return WebResourceResponse(mime, null, code, c.responseMessage?.takeIf { it.isNotBlank() } ?: if (code == 206) "Partial Content" else "OK", headers, body ?: ByteArrayInputStream(ByteArray(0)))
    }
}
