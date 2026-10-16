# Android shell: WebView app, bridge, media service, server module

A native Kotlin app hosting the web client from http://localhost, with a JS bridge, a Media3 player (notification, Android Auto), and an optional Termux-hosted server.

Optional. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbomusic` at `62934e8`, where they run.

- The page is served from `http://localhost` (secure context, no mixed-content rules), so images and audio load straight from an http home server.
- The bridge is a Java interface: strings only, results as JSON, changes as events.
- Signing: one committed keystore on purpose; Android only installs an update signed with the same key.

## Split out, and not here yet
- Termux server module: `termux-server`. The Access proxy and the Access headers for the player: `cloudflare-access`.
- **Not in the engine yet:** the media service (`PlaybackService`, `NativeAudio`, `FocusKeeper`, `AudioFx`: notification, lock screen, Android Auto, equalizer). It is the biggest Android file set and still lives only in TurboMusic.

## Notes from TurboPantry (2026-10-16, first app to take this without the media service)
- The module ships only `app/`: a new app also needs `settings.gradle.kts`, a root `build.gradle.kts` with the plugin versions, `gradle.properties` and the resources. TurboPantry's working set (Android Gradle plugin 8.7.3, Kotlin 2.0.21, Gradle 8.9 or newer, a `copyWeb` task that bundles `apps/web/dist`) is in `TurboNZL/turbopantry` `apps/android` (written without a Gradle run: its first CI build is the first real one).
- The shell answers `/api/*` with a JSON 404 when no server address is set, so the page fails cleanly instead of loading `index.html` as JSON.
- Share target: an `ACTION_SEND` text filter; the first http(s) address in the shared text (with a JVM unit test) opens the page at `/<route>?url=<encoded>`; the page reads `?url=` and starts the import.
- Signing: the release job uses the four `ANDROID_*` secrets when present and falls back to the committed keystore; a different key per CI run would break self-update (Android refuses an update signed with another key). If the repository is public, prefer the secrets.
- The web client forwards the applied server address, token and Access id/secret to the bridge (`window.<App>Android.setServer/setAccess`) whenever they change and once at start.

## Files
- `apps/android/app/src/main/kotlin/app/turbomusic/android/MainActivity.kt`
- `apps/android/app/src/main/kotlin/app/turbomusic/android/TurboMusicBridge.kt`
- `apps/android/app/src/main/kotlin/app/turbomusic/android/ServerPrefs.kt`
- `apps/android/app/src/main/AndroidManifest.xml`
- `apps/android/app/build.gradle.kts`
