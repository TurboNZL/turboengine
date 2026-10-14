package app.turbomusic.android

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.FrameLayout
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader
import app.turbomusic.android.update.AppUpdater

/**
 * Shows the web client (bundled in the app's assets, served from http://localhost, a secure context, so IndexedDB and fetch behave like on the
 * web) full screen. The library, voting and everything else are the web app; this class only supplies what a browser cannot:
 * file picking, opening links outside, the update bridge and the server address for Android Auto.
 */
class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private var audioEmit: ((String) -> Unit)? = null
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private val chooser = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { r ->
        fileCallback?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(r.resultCode, r.data))
        fileCallback = null
    }
    private val notifications = registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        web = WebView(this)
        // Android 15 draws apps edge to edge, and a WebView does not apply its own padding to the page, so the insets go on a
        // container around it (status bar, navigation bar/buttons, display cutout and keyboard).
        WindowCompat.setDecorFitsSystemWindows(window, false)
        val root = FrameLayout(this).apply { setBackgroundColor(0xFF0B0B10.toInt()) }
        root.addView(web, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
        setContentView(root)
        ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
            val b = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout() or WindowInsetsCompat.Type.ime())
            v.setPadding(b.left, b.top, b.right, b.bottom)
            WindowInsetsCompat.CONSUMED
        }
        // the app is always dark behind the bars: light icons
        WindowCompat.getInsetsController(window, root).apply { isAppearanceLightStatusBars = false; isAppearanceLightNavigationBars = false }
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            // the page is https, the user's server is often plain http on the home network
            mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            allowFileAccess = false
            allowContentAccess = false
        }
        web.setBackgroundColor(0xFF0B0B10.toInt())
        NativeAudio.init(this)
        audioEmit = { json -> web.post { web.evaluateJavascript("window.dispatchEvent(new CustomEvent('turbomusic-audio',{detail:$json}))", null) } }
        NativeAudio.emit = audioEmit
        web.addJavascriptInterface(TurboMusicBridge(this, web), "TurboMusicAndroid")

        val accessProxy = AccessProxy(ServerPrefs(this))
        val loader = WebViewAssetLoader.Builder().setDomain(HOST).setHttpAllowed(true).addPathHandler("/", SpaAssets(this)).build()
        web.webViewClient = object : WebViewClient() {
            // only the app's own pages are answered here; the library's images and audio go straight to the server through Chromium's own network stack
            // with a Cloudflare Access service token set, requests for the library server get the token added here (AccessProxy) so images and
            // audio stream directly instead of being downloaded whole by the page first
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                loader.shouldInterceptRequest(request.url) ?: accessProxy.handle(request)
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (request.url.host == HOST) return false
                runCatching { startActivity(Intent(Intent.ACTION_VIEW, request.url)) }
                return true
            }
        }
        web.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(view: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = callback
                return try { chooser.launch(params.createIntent()); true } catch (e: Exception) { fileCallback = null; false }
            }
        }
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (web.canGoBack()) web.goBack() else { isEnabled = false; onBackPressedDispatcher.onBackPressed() }
            }
        })

        AppUpdater.listener = { s ->
            web.post { web.evaluateJavascript("window.dispatchEvent(new CustomEvent('turbomusic-update',{detail:${s.json()}}))", null) }
        }
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED)
            notifications.launch(Manifest.permission.POST_NOTIFICATIONS)

        if (savedInstanceState == null) web.loadUrl("http://$HOST/") else web.restoreState(savedInstanceState)
    }

    override fun onStart() {
        super.onStart()
        // look for a new version when the app opens, at most every 6 hours
        if (System.currentTimeMillis() - ServerPrefs(this).lastUpdateCheck > 6 * 3600_000L) AppUpdater.check(this)
    }

    override fun onSaveInstanceState(outState: Bundle) { super.onSaveInstanceState(outState); web.saveState(outState) }

    override fun onDestroy() {
        if (NativeAudio.emit === audioEmit) NativeAudio.emit = null // a newer activity may already have taken over
        AppUpdater.listener = null
        web.destroy()
        super.onDestroy()
    }

    /**
     * Serves the bundled web client. The stock AssetsPathHandler answers a missing file (and the bare "/") with an empty
     * response, which the WebView reports as ERR_INVALID_RESPONSE, so "/" and every route of the app (/albums/…) get index.html.
     */
    private class SpaAssets(private val context: android.content.Context) : WebViewAssetLoader.PathHandler {
        override fun handle(path: String): WebResourceResponse? {
            val name = path.trimStart('/').ifEmpty { "index.html" }
            val stream = try { context.assets.open(name) } catch (e: java.io.IOException) { null }
            if (stream != null) return WebResourceResponse(mime(name), null, stream)
            if (name.substringAfterLast('/').contains('.'))
                return WebResourceResponse("text/plain", "utf-8", 404, "Not Found", emptyMap(), java.io.ByteArrayInputStream(ByteArray(0)))
            return WebResourceResponse("text/html", "utf-8", context.assets.open("index.html"))
        }

        private fun mime(name: String): String = when (name.substringAfterLast('.', "").lowercase()) {
            "html" -> "text/html"
            "js", "mjs" -> "text/javascript"
            "css" -> "text/css"
            "json" -> "application/json"
            "webmanifest" -> "application/manifest+json"
            "svg" -> "image/svg+xml"
            "png" -> "image/png"
            "jpg", "jpeg" -> "image/jpeg"
            "webp" -> "image/webp"
            "ico" -> "image/x-icon"
            "woff2" -> "font/woff2"
            "woff" -> "font/woff"
            "ttf" -> "font/ttf"
            "wasm" -> "application/wasm"
            "mp3" -> "audio/mpeg"
            else -> "application/octet-stream"
        }
    }

    private companion object {
        /**
         * The page is served from http://localhost (answered by the asset loader, never sent anywhere). Chromium treats localhost as a
         * secure context (crypto.subtle, IndexedDB, media session all work) but, unlike an https page, it applies no mixed-content rules,
         * so a plain-http home server's images and audio load directly through Chromium's network stack: as fast as in a browser.
         */
        const val HOST = "localhost"
    }
}
