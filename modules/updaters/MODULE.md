# Self-update (desktop and Android)

electron-updater from GitHub releases (with a .deb path that works without a polkit agent) and a native Android updater, both through one Settings card.

Recommended for every app. Reference files are in `files/` (the paths are the paths in the app); they were taken from Curator at `b6d85a8`, where they are known to work.

## Rules learned
- Use the newest published release **including pre-releases**; skip drafts. `electron-updater`: `allowPrerelease = true`. Android: list `/releases?per_page=20` and take the newest with an `.apk`.
- "Release exists but its manifest is not there yet" is not an error: say it is still being built (`updateErrors.ts`).
- A private repository needs a read-only token (Settings card has the field); public needs none.
- **.deb installs need root.** electron-updater's pkexec call is blocking and fails with exit 127 without a polkit agent. `updater.ts` installs asynchronously, falls back to a terminal window running sudo, and shows a copyable `sudo apt install` command. If the app process has `NoNewPrivs: 1` (read `/proc/self/status`) sudo/pkexec are refused for it and every child, so the terminal is started through `systemd-run --user` (outside its process tree). The long-term answer is a signed apt repository (see Curator `docs/development/PACKAGING.md`). The AppImage never needs root.
- Linux asset names do not matter to the updater; the manifest does.

## Files
- `apps/electron/src/updater.ts`
- `apps/electron/src/updateErrors.ts`
- `apps/electron/src/debInstall.ts`
- `apps/android/app/src/main/kotlin/app/musiccurator/android/update/AppUpdater.kt`
- `apps/android/app/src/main/kotlin/app/musiccurator/android/update/Releases.kt`
- `apps/web/src/lib/native.ts`
- `apps/web/src/components/AppSettings.tsx`
