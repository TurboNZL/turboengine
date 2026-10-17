package com.turbonzl.turbocut;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * In-app updater, the engine's Android updater system: the page finds the newest release, this downloads its .apk into the
 * cache with progress events and hands it to Android's installer (same signing key, so it installs over the running app).
 */
@CapacitorPlugin(name = "ApkUpdater")
public class ApkUpdaterPlugin extends Plugin {
    private volatile boolean busy = false;

    private File file() {
        File dir = new File(getContext().getCacheDir(), "updates");
        dir.mkdirs();
        return new File(dir, "update.apk");
    }

    @PluginMethod
    public void download(PluginCall call) {
        final String url = call.getString("url");
        if (url == null || !url.startsWith("https://")) { call.reject("A https address is needed."); return; }
        if (busy) { call.reject("A download is already running."); return; }
        busy = true;
        new Thread(() -> {
            try {
                File out = file();
                File[] old = out.getParentFile().listFiles();
                if (old != null) for (File f : old) f.delete();
                String target = url;
                HttpURLConnection c = null;
                for (int hop = 0; hop < 6; hop++) {
                    c = (HttpURLConnection) new URL(target).openConnection();
                    c.setInstanceFollowRedirects(false);
                    c.setConnectTimeout(15000);
                    c.setReadTimeout(60000);
                    c.setRequestProperty("User-Agent", "turbocut-android");
                    int code = c.getResponseCode();
                    if (code >= 300 && code < 400) { target = c.getHeaderField("Location"); c.disconnect(); continue; }
                    if (code != 200) throw new IllegalStateException("The download answered " + code);
                    break;
                }
                long total = c.getContentLengthLong(), done = 0;
                int last = -1;
                try (InputStream in = c.getInputStream(); OutputStream o = new java.io.FileOutputStream(out)) {
                    byte[] buf = new byte[64 * 1024];
                    int n;
                    while ((n = in.read(buf)) >= 0) {
                        o.write(buf, 0, n);
                        done += n;
                        int pct = total > 0 ? (int) (done * 100 / total) : -1;
                        if (pct != last) { last = pct; JSObject e = new JSObject(); e.put("percent", pct); notifyListeners("progress", e); }
                    }
                } finally { c.disconnect(); }
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage());
            } finally { busy = false; }
        }).start();
    }

    /** Opens the installer; the first time it opens the page where "install unknown apps" is allowed for TurboCut. */
    @PluginMethod
    public void install(PluginCall call) {
        File f = file();
        if (!f.exists()) { call.reject("Nothing has been downloaded."); return; }
        if (!getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent s = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            s.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(s);
            JSObject r = new JSObject();
            r.put("needsPermission", true);
            call.resolve(r);
            return;
        }
        Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
        Intent i = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive");
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }
}
