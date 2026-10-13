package app.musiccurator.android

import android.content.Context

/**
 * What the native side (Android Auto, notifications, updates) needs to know. The server address and token are pushed here by the web
 * client whenever its Settings change; the update token is typed in Settings > App updates.
 */
class ServerPrefs(context: Context) {
    private val p = context.applicationContext.getSharedPreferences("curator", Context.MODE_PRIVATE)

    var serverUrl: String
        get() = p.getString("serverUrl", "") ?: ""
        set(v) { p.edit().putString("serverUrl", v.trim().trimEnd('/')).apply() }
    var token: String
        get() = p.getString("token", "") ?: ""
        set(v) { p.edit().putString("token", v.trim()).apply() }
    /** a Cloudflare Access service token (CF-Access-Client-Id / -Secret), for a server behind Cloudflare Access; blank when none */
    var cfId: String
        get() = p.getString("cfId", "") ?: ""
        set(v) { p.edit().putString("cfId", v.trim()).apply() }
    var cfSecret: String
        get() = p.getString("cfSecret", "") ?: ""
        set(v) { p.edit().putString("cfSecret", v.trim()).apply() }
    /** the headers every request to the server carries; empty unless both halves of the service token are set */
    fun accessHeaders(): Map<String, String> =
        if (cfId.isNotEmpty() && cfSecret.isNotEmpty()) mapOf("CF-Access-Client-Id" to cfId, "CF-Access-Client-Secret" to cfSecret) else emptyMap()
    /** a GitHub token with read access, only needed while the repository is private */
    var updateToken: String
        get() = p.getString("updateToken", "") ?: ""
        set(v) { p.edit().putString("updateToken", v.trim()).apply() }
    var lastUpdateCheck: Long
        get() = p.getLong("lastUpdateCheck", 0L)
        set(v) { p.edit().putLong("lastUpdateCheck", v).apply() }

    /** the equaliser curve (JSON, see EqMap), kept so Android Auto playback has it too */
    var eq: String
        get() = p.getString("eq", "") ?: ""
        set(v) { p.edit().putString("eq", v).apply() }

    // ---- the server module (Termux), see TermuxServer.kt
    var termuxInstalled: Boolean
        get() = p.getBoolean("termuxInstalled", false)
        set(v) { p.edit().putBoolean("termuxInstalled", v).apply() }
    /** the module's access token, made by the app */
    var termuxToken: String
        get() = p.getString("termuxToken", "") ?: ""
        set(v) { p.edit().putString("termuxToken", v).apply() }
    var termuxAutoStart: Boolean
        get() = p.getBoolean("termuxAutoStart", true)
        set(v) { p.edit().putBoolean("termuxAutoStart", v).apply() }
    /** keep the phone awake while the server runs (uses more battery) */
    var termuxWake: Boolean
        get() = p.getBoolean("termuxWake", false)
        set(v) { p.edit().putBoolean("termuxWake", v).apply() }
    /** the last thing Termux was asked to do and how it went (JSON) */
    var termuxResult: String
        get() = p.getString("termuxResult", "") ?: ""
        set(v) { p.edit().putString("termuxResult", v).apply() }

    val configured get() = serverUrl.isNotEmpty()
}
