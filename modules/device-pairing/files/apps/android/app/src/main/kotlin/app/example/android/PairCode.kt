package app.example.android

import org.json.JSONObject
import java.util.Base64

/**
 * A pairing code made by the web page (Settings > Pair a device): "XXX1-" and a base64url JSON object with the server's address (u), an API
 * token for this device (t) and, when the server is behind Cloudflare Access, the service token's client id (i) and secret (s). Pasting it on the setup
 * screen fills in everything the widget needs. The code IS the credentials: it is never logged or kept, only its parts are saved.
 */
object PairCode {
    const val PREFIX = "XXX1-"
    class Payload(val url: String, val token: String, val cfId: String, val cfSecret: String)

    private val ADDRESS = Regex("^https?://[^\\s/]+", RegexOption.IGNORE_CASE)

    /** The parts of a code, or null when it is not one of ours or is damaged. Spaces and line breaks (a messenger adds them) are ignored. */
    fun decode(raw: String): Payload? {
        val code = raw.filter { !it.isWhitespace() }
        if (!code.startsWith(PREFIX)) return null
        return try {
            val j = JSONObject(String(Base64.getUrlDecoder().decode(code.removePrefix(PREFIX)), Charsets.UTF_8))
            val url = j.optString("u", "").trim().trimEnd('/')
            val token = j.optString("t", "")
            if (token.isEmpty() || (url.isNotEmpty() && !ADDRESS.containsMatchIn(url))) return null
            val id = j.optString("i", ""); val secret = j.optString("s", "")
            Payload(url, token, if (id.isNotEmpty() && secret.isNotEmpty()) id else "", if (id.isNotEmpty() && secret.isNotEmpty()) secret else "")
        } catch (e: Exception) { null }
    }
}
