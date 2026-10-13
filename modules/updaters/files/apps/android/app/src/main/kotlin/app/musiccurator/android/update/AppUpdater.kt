package app.musiccurator.android.update

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.core.content.FileProvider
import app.musiccurator.android.BuildConfig
import app.musiccurator.android.ServerPrefs
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * Updates the app from the newest GitHub release that carries an .apk, so nothing has to be done on a computer. The APK is signed with
 * the same key every time, which is what lets Android install it over the running app. Android always asks the user to confirm the install.
 */
object AppUpdater {
    class State(val status: String, val version: String? = null, val percent: Int? = null, val message: String? = null) {
        fun json(): String = JSONObject().put("status", status).apply {
            version?.let { put("version", it) }; percent?.let { put("percent", it) }; message?.let { put("message", it) }
        }.toString()
    }

    @Volatile var state = State("idle"); private set
    var listener: ((State) -> Unit)? = null
    private val io = Executors.newSingleThreadExecutor()
    private fun set(s: State) { state = s; listener?.invoke(s) }

    fun check(context: Context) {
        val ctx = context.applicationContext
        if (state.status == "checking" || state.status == "downloading") return
        set(State("checking"))
        io.execute {
            val prefs = ServerPrefs(ctx)
            try {
                // The list, not /releases/latest: "latest" skips releases marked pre-release (and answers 404 when every release is one).
                val releases = JSONArray(get("https://api.github.com/repos/${BuildConfig.REPO_OWNER}/${BuildConfig.REPO_NAME}/releases?per_page=20", prefs.updateToken, "application/vnd.github+json").bytes.toString(Charsets.UTF_8))
                prefs.lastUpdateCheck = System.currentTimeMillis()
                val found = Releases.newestWithApk(releases)
                if (found == null) { set(State("none", message = "No release with an Android app (.apk) has been published yet.")); return@execute }
                val (tag, apkUrl) = found
                if (!Releases.isNewer(tag, BuildConfig.VERSION_NAME)) { set(State("none")); return@execute }
                val version = tag.removePrefix("v")
                set(State("downloading", version, 0))
                val dir = File(ctx.cacheDir, "updates").apply { mkdirs(); listFiles()?.forEach { it.delete() } }
                val out = File(dir, "update.apk")
                download(apkUrl, prefs.updateToken, out) { pct -> if (pct != state.percent) set(State("downloading", version, pct)) }
                set(State("ready", version))
            } catch (e: java.net.UnknownHostException) {
                set(State("error", message = "No connection to GitHub. Check the phone's internet."))
            } catch (e: Exception) {
                set(State("error", message = e.message ?: e.javaClass.simpleName))
            }
        }
    }

    /** Opens Android's installer for the downloaded file (first time: the page where "install unknown apps" is allowed for this app). */
    fun install(context: Context) {
        val file = File(context.cacheDir, "updates/update.apk")
        if (!file.exists()) return
        if (!context.packageManager.canRequestPackageInstalls()) {
            context.startActivity(Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            return
        }
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
        context.startActivity(Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    private class Reply(val bytes: ByteArray)

    private fun open(url: String, token: String, accept: String): HttpURLConnection {
        var u = url
        // GitHub answers asset downloads with a redirect to its storage host; that host must NOT get the GitHub token, so follow by hand
        for (hop in 0 until 5) {
            val c = URL(u).openConnection() as HttpURLConnection
            c.instanceFollowRedirects = false
            c.connectTimeout = 15_000; c.readTimeout = 60_000
            c.setRequestProperty("Accept", accept)
            c.setRequestProperty("User-Agent", "music-curator-android")
            if (token.isNotEmpty() && URL(u).host.endsWith("github.com")) c.setRequestProperty("Authorization", "Bearer $token")
            val code = c.responseCode
            if (code in 300..399) { u = c.getHeaderField("Location") ?: throw IllegalStateException("Redirect without a target"); c.disconnect(); continue }
            if (code == 404 || code == 401) throw IllegalStateException(
                if (token.isEmpty()) "GitHub cannot find the repository. If it is private, add a GitHub token in Settings › App updates."
                else "GitHub cannot find the repository with this token. It needs read access to the repository's contents.")
            if (code != 200) throw IllegalStateException("GitHub answered $code")
            return c
        }
        throw IllegalStateException("Too many redirects")
    }

    private fun get(url: String, token: String, accept: String): Reply {
        val c = open(url, token, accept)
        try { return Reply(c.inputStream.use { it.readBytes() }) } finally { c.disconnect() }
    }

    private fun download(url: String, token: String, out: File, progress: (Int) -> Unit) {
        val c = open(url, token, "application/octet-stream")
        try {
            val total = c.contentLengthLong
            var done = 0L
            c.inputStream.use { input -> out.outputStream().use { o ->
                val buf = ByteArray(64 * 1024)
                while (true) {
                    val n = input.read(buf); if (n < 0) break
                    o.write(buf, 0, n); done += n
                    if (total > 0) progress((done * 100 / total).toInt())
                }
            } }
        } finally { c.disconnect() }
    }
}
