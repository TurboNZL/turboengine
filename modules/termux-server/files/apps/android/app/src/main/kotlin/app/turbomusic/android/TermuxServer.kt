package app.turbomusic.android

import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import org.json.JSONObject
import java.security.SecureRandom

/**
 * Pure part of the server module (JVM-testable): the scripts the app asks Termux to run are plain assets (the scripts in assets/termux) with @NAME@
 * placeholders, filled in here. Termux runs `bash -c <script>` for us, so nothing has to be copied into Termux first.
 */
object TermuxScripts {
    const val PORT = 47813

    /** Replaces every @NAME@ in [template]; a value is checked first because it ends up inside a shell script. */
    fun fill(template: String, values: Map<String, String>): String {
        var out = template
        for ((k, v) in values) {
            require(v.all { it.isLetterOrDigit() || it in "-_.:/=+" }) { "unsafe value for $k" }
            out = out.replace("@$k@", v)
        }
        return out
    }

    /** A random access token for the module's server, made by the app so it never has to read one back out of Termux. */
    fun newToken(random: SecureRandom = SecureRandom()): String {
        val alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        return (1..32).map { alphabet[random.nextInt(alphabet.length)] }.joinToString("")
    }
}

/**
 * The server module of the Android app (beta): the TurboMusic server running in Termux, driven from the app so the user never types a command
 * except one pasted line, once, which lets other apps start commands in Termux (Termux's own safety setting, `allow-external-apps`, can only
 * be switched on from inside Termux). After that the app installs Node, ffmpeg and yt-dlp there, downloads the server bundle from the project's
 * releases (`*-termux.tar.gz`), starts and stops it, and removes it again.
 *
 * Termux's RUN_COMMAND service: action `com.termux.RUN_COMMAND` on `com.termux.app.RunCommandService`, extras `com.termux.RUN_COMMAND_*`,
 * needs the permission `com.termux.permission.RUN_COMMAND` (asked at run time) and `allow-external-apps = true` in ~/.termux/termux.properties.
 */
object Termux {
    const val PACKAGE = "com.termux"
    const val PERMISSION = "com.termux.permission.RUN_COMMAND"
    private const val HOME = "/data/data/com.termux/files/home"
    private const val BASH = "/data/data/com.termux/files/usr/bin/bash"
    const val F_DROID = "https://f-droid.org/packages/com.termux/"
    const val ASK_CODE = 4711

    fun installed(ctx: Context): Boolean = try { ctx.packageManager.getPackageInfo(PACKAGE, 0); true } catch (e: PackageManager.NameNotFoundException) { false }
    fun granted(ctx: Context): Boolean = ctx.checkSelfPermission(PERMISSION) == PackageManager.PERMISSION_GRANTED

    fun asset(ctx: Context, name: String): String = ctx.assets.open("termux/$name").bufferedReader().use { it.readText() }

    /** The one line the user pastes into Termux once (assets/termux/one-time-line.sh). */
    fun oneTimeLine(ctx: Context): String = asset(ctx, "one-time-line.sh").trim()

    fun copy(ctx: Context, text: String) {
        val cm = ctx.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        cm.setPrimaryClip(ClipData.newPlainText("Termux line", text))
    }

    fun openTermux(ctx: Context): Boolean {
        val i = ctx.packageManager.getLaunchIntentForPackage(PACKAGE) ?: return false
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        ctx.startActivity(i)
        return true
    }

    fun openInstallPage(ctx: Context) {
        ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(F_DROID)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }

    fun requestPermission(activity: Activity) { activity.requestPermissions(arrayOf(PERMISSION), ASK_CODE) }

    /** Runs a script in Termux in the background (no terminal window). The answer (exit code, output) comes back to [TermuxResultReceiver]. */
    fun run(ctx: Context, label: String, script: String): Boolean {
        val back = PendingIntent.getBroadcast(
            ctx, label.hashCode(), Intent(ctx, TermuxResultReceiver::class.java).putExtra("label", label),
            PendingIntent.FLAG_UPDATE_CURRENT or (if (android.os.Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0),
        )
        val i = Intent("com.termux.RUN_COMMAND").setClassName(PACKAGE, "com.termux.app.RunCommandService")
            .putExtra("com.termux.RUN_COMMAND_PATH", BASH)
            .putExtra("com.termux.RUN_COMMAND_ARGUMENTS", arrayOf("-c", script))
            .putExtra("com.termux.RUN_COMMAND_WORKDIR", HOME)
            .putExtra("com.termux.RUN_COMMAND_BACKGROUND", true)
            .putExtra("com.termux.RUN_COMMAND_COMMAND_LABEL", label)
            .putExtra("com.termux.RUN_COMMAND_PENDING_INTENT", back)
        ServerPrefs(ctx).termuxResult = JSONObject().put("label", label).put("state", "running").put("at", System.currentTimeMillis()).toString()
        return try { ctx.startForegroundService(i); true } catch (e: Exception) {
            ServerPrefs(ctx).termuxResult = JSONObject().put("label", label).put("state", "failed").put("err", e.message ?: e.javaClass.simpleName).put("at", System.currentTimeMillis()).toString()
            false
        }
    }

    private fun values(ctx: Context, prefs: ServerPrefs, extra: Map<String, String> = emptyMap()) = mapOf(
        "OWNER" to BuildConfig.REPO_OWNER, "REPO" to BuildConfig.REPO_NAME, "GH_TOKEN" to prefs.updateToken,
        "PORT" to TermuxScripts.PORT.toString(), "TOKEN" to prefs.termuxToken, "WAKE" to if (prefs.termuxWake) "1" else "0",
    ) + extra

    /** install (or repair/update) the server in Termux, then start it */
    fun install(ctx: Context): Boolean {
        val prefs = ServerPrefs(ctx)
        if (prefs.termuxToken.isEmpty()) prefs.termuxToken = TermuxScripts.newToken()
        prefs.termuxInstalled = true
        val script = TermuxScripts.fill(asset(ctx, "setup.sh") + "\n" + asset(ctx, "start.sh"), values(ctx, prefs))
        return run(ctx, "install", script)
    }
    fun start(ctx: Context): Boolean { val p = ServerPrefs(ctx); return run(ctx, "start", TermuxScripts.fill(asset(ctx, "start.sh"), values(ctx, p))) }
    fun stop(ctx: Context): Boolean = run(ctx, "stop", asset(ctx, "stop.sh"))
    fun remove(ctx: Context, deleteLibrary: Boolean): Boolean {
        val p = ServerPrefs(ctx)
        val ok = run(ctx, "remove", TermuxScripts.fill(asset(ctx, "remove.sh"), mapOf("DELETE_LIBRARY" to if (deleteLibrary) "1" else "0")))
        if (ok) { p.termuxInstalled = false; p.termuxToken = "" }
        return ok
    }

    /** what the page needs to draw the module's card */
    fun status(ctx: Context): String {
        val p = ServerPrefs(ctx)
        return JSONObject().put("termuxInstalled", installed(ctx)).put("granted", granted(ctx)).put("module", p.termuxInstalled)
            .put("port", TermuxScripts.PORT).put("token", p.termuxToken).put("autoStart", p.termuxAutoStart).put("wake", p.termuxWake)
            .put("result", runCatching { JSONObject(p.termuxResult.ifEmpty { "{}" }) }.getOrDefault(JSONObject())).toString()
    }
}

/** Termux reports back here when a command it was asked to run has finished (exit code and the end of its output). */
class TermuxResultReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val r = intent.getBundleExtra("result")
        val o = JSONObject().put("label", intent.getStringExtra("label") ?: "").put("at", System.currentTimeMillis())
        if (r == null) { o.put("state", "failed").put("err", "Termux gave no answer"); } else {
            val exit = r.getInt("exitCode", -1)
            val internal = r.getInt("err", -1)
            o.put("state", if (exit == 0 && (internal == -1 || internal == 0)) "done" else "failed").put("exit", exit)
                .put("out", (r.getString("stdout") ?: "").takeLast(600)).put("err", ((r.getString("stderr") ?: "") + (r.getString("errmsg") ?: "")).takeLast(600))
        }
        ServerPrefs(context).termuxResult = o.toString()
    }
}
