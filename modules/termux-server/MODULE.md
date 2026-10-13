# Termux server module (Android)

An Android app that can install, start and stop its own library server inside Termux (beta; never run on a real device when written).

Optional. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbomusic` at `ea3f5ea`.

**Requires:** `android-shell`.

Beta. An Android app that installs, starts and stops its own library server inside Termux, through Termux's RUN_COMMAND service (`com.termux.app.RunCommandService`, permission `com.termux.permission.RUN_COMMAND`). The scripts are assets filled by `TermuxScripts.fill` (values are validated: they land in a shell script). The server bundle is a CI asset (`termux-bundle` job in `release-pipeline`).

## Gotchas
- The one unavoidable manual step: Termux only lets `allow-external-apps = true` be changed from inside Termux, so the app shows one line to paste (`one-time-line.sh`).
- The app generates the server token itself (the server reads it from its environment), so it never reads files out of Termux.
- A glob such as `assets/termux/*.sh` inside a Kotlin block comment opens a **nested** comment and the file ends with "Unclosed comment".
- Extras and result keys were written from memory of the RUN_COMMAND wiki; never run on a device.

## Files
- `apps/android/app/src/main/kotlin/app/musiccurator/android/TermuxServer.kt`
- `apps/android/app/src/main/assets/termux/setup.sh`
- `apps/android/app/src/main/assets/termux/start.sh`
- `apps/android/app/src/main/assets/termux/stop.sh`
- `apps/android/app/src/main/assets/termux/remove.sh`
- `apps/android/app/src/main/assets/termux/one-time-line.sh`
- `apps/web/src/lib/termux.ts`
- `apps/web/src/components/TermuxServerCard.tsx`
