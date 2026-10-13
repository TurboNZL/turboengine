package app.musiccurator.android.update

import org.json.JSONArray

/** What the update check reads out of GitHub's release list. No Android classes, so it is tested on the JVM. */
object Releases {
    /** "0.2.10" > "0.2.9": compare number by number */
    fun isNewer(remote: String, local: String): Boolean {
        fun parts(v: String) = v.removePrefix("v").substringBefore('-').split('.').map { it.toIntOrNull() ?: 0 }
        val a = parts(remote); val b = parts(local)
        for (i in 0 until maxOf(a.size, b.size)) {
            val x = a.getOrElse(i) { 0 }; val y = b.getOrElse(i) { 0 }
            if (x != y) return x > y
        }
        return false
    }

    /** The newest published (not draft) release that carries an .apk, pre-releases included, as its tag and the asset's API address. GitHub lists newest first. */
    fun newestWithApk(releases: JSONArray): Pair<String, String>? {
        for (i in 0 until releases.length()) {
            val r = releases.getJSONObject(i)
            if (r.optBoolean("draft")) continue
            val assets = r.optJSONArray("assets") ?: continue
            for (j in 0 until assets.length()) {
                val a = assets.getJSONObject(j)
                if (a.getString("name").endsWith(".apk")) return r.getString("tag_name") to a.getString("url")
            }
        }
        return null
    }
}
