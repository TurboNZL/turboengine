# Android shell: WebView app, bridge, media service, server module

A native Kotlin app hosting the web client from http://localhost, with a JS bridge, a Media3 player (notification, Android Auto), and an optional Termux-hosted server.

Optional. Reference files are in `files/` (the paths are the paths in the app); they were taken from Curator at `b6d85a8`, where they are known to work.

- The page is served from `http://localhost` (secure context, no mixed-content rules), so images and audio load straight from an http home server.
- The bridge is a Java interface: strings only, results as JSON, changes as events.
- Signing: one committed keystore on purpose; Android only installs an update signed with the same key.
- **Termux server module**: Termux's RUN_COMMAND service (`com.termux.app.RunCommandService`, permission `com.termux.permission.RUN_COMMAND`) runs scripts from assets. The unavoidable manual step is one pasted line that sets `allow-external-apps = true` in Termux. The app makes the server token itself. Never run on a device when written: expect fixes.
- A proxy that adds headers to an upstream answer must replace, never add, `Access-Control-Allow-Origin` (two values make Chromium reject the response).

## Files
- `apps/android/app/src/main/kotlin/app/musiccurator/android/MainActivity.kt`
- `apps/android/app/src/main/kotlin/app/musiccurator/android/CuratorBridge.kt`
- `apps/android/app/src/main/kotlin/app/musiccurator/android/ServerPrefs.kt`
- `apps/android/app/src/main/kotlin/app/musiccurator/android/AccessProxy.kt`
- `apps/android/app/src/main/kotlin/app/musiccurator/android/TermuxServer.kt`
- `apps/android/app/src/main/AndroidManifest.xml`
- `apps/android/app/build.gradle.kts`
- `apps/android/app/src/main/assets/termux/setup.sh`
- `apps/android/app/src/main/assets/termux/start.sh`
- `apps/android/app/src/main/assets/termux/stop.sh`
- `apps/android/app/src/main/assets/termux/remove.sh`
- `apps/android/app/src/main/assets/termux/one-time-line.sh`
- `apps/web/src/lib/termux.ts`
- `apps/web/src/components/TermuxServerCard.tsx`
