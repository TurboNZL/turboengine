# Android shell: WebView app, bridge, media service, server module

A native Kotlin app hosting the web client from http://localhost, with a JS bridge, a Media3 player (notification, Android Auto), and an optional Termux-hosted server.

Optional. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbomusic` at `62934e8`, where they run.

- The page is served from `http://localhost` (secure context, no mixed-content rules), so images and audio load straight from an http home server.
- The bridge is a Java interface: strings only, results as JSON, changes as events.
- Signing: one committed keystore on purpose; Android only installs an update signed with the same key.

## Split out, and not here yet
- Termux server module: `termux-server`. The Access proxy and the Access headers for the player: `cloudflare-access`.
- **Not in the engine yet:** the media service (`PlaybackService`, `NativeAudio`, `FocusKeeper`, `AudioFx`: notification, lock screen, Android Auto, equalizer). It is the biggest Android file set and still lives only in TurboMusic.

## Files
- `apps/android/app/src/main/kotlin/app/turbomusic/android/MainActivity.kt`
- `apps/android/app/src/main/kotlin/app/turbomusic/android/TurboMusicBridge.kt`
- `apps/android/app/src/main/kotlin/app/turbomusic/android/ServerPrefs.kt`
- `apps/android/app/src/main/AndroidManifest.xml`
- `apps/android/app/build.gradle.kts`
