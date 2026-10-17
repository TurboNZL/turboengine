# Self-update (desktop and Android)

electron-updater from GitHub releases (with a .deb path that works without a polkit agent) and a native Android updater, both through one Settings card.

Recommended for every app. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbomusic` at `62934e8`, where they run.

**Mandatory** for every app that ships a desktop or Android build, and part of `self-hosted-server`: the server and the apps must update the same way, from the same releases (`release-pipeline`).

## Rules learned
- Use the newest published release **including pre-releases**; skip drafts. `electron-updater`: `allowPrerelease = true`. Android: list `/releases?per_page=20` and take the newest with an `.apk`.
- "Release exists but its manifest is not there yet" is not an error: say it is still being built (`updateErrors.ts`).
- A private repository needs a read-only token (Settings card has the field); public needs none.
- **.deb installs need root.** electron-updater's pkexec call is blocking and fails with exit 127 without a polkit agent. `updater.ts` installs asynchronously, falls back to a terminal window running sudo, and shows a copyable `sudo apt install` command. If the app process has `NoNewPrivs: 1` (read `/proc/self/status`) sudo/pkexec are refused for it and every child, so the terminal is started through `systemd-run --user` (outside its process tree). The long-term answer is a signed apt repository (see TurboMusic `docs/development/PACKAGING.md`). The AppImage never needs root.
- Linux asset names do not matter to the updater; the manifest does.

## The .deb auto-update system (desktop Linux)
A `.deb` install cannot replace itself the way an AppImage or the Windows installer can: installing a package needs root. The updater therefore splits an update into two parts and every desktop app must do both the same way.

**1. Find and download (electron-updater).** `autoUpdater` reads `latest-linux.yml` from the newest GitHub release (pre-releases included), downloads the `.deb` and reports `downloadedFile` in `update-downloaded`. Settings: `autoDownload` as the app prefers, `allowPrerelease = true`, **`autoInstallOnAppQuit = false` for a .deb** (its own install is a blocking `pkexec --disable-internal-agent` call that freezes the app, fails with exit 127 on a desktop without a polkit agent, and would run while quitting). Detect a deb install by `process.resourcesPath/package-type` containing `deb` (electron-builder writes it; an AppImage has none and sets `APPIMAGE`).

**2. Install it ourselves (`debInstall`), in this order, asynchronously, so the window stays alive:**
1. If `/proc/self/status` has `NoNewPrivs: 1`, sudo and pkexec are refused for the app and every child. Start the terminal through `systemd-run --user` (outside the process tree, with the display variables copied by `--setenv`) and skip step 2.
2. `pkexec /bin/sh -c "dpkg -i <file> || apt-get install -f -y"`. Exit 126 = the prompt was closed (stop, say so); 127 or "not authorized" = no polkit agent (go to 3); anything else = failure with the last stderr lines.
3. A terminal window (first of `x-terminal-emulator`, gnome-terminal, kgx, konsole, xfce4-terminal, mate-terminal, kitty, alacritty, xterm) runs the same install under `sudo`, then waits for Enter so the output can be read.
4. **Success is decided by dpkg, not by exit codes:** after the terminal closes, `dpkg-query -W -f='${Version}' <package>` must equal the version that was downloaded; only then `app.relaunch(); app.exit(0)`.
5. If every route failed, the Settings card shows the message **and the one command to copy** (`sudo apt install '<file>'`). Never leave the user with only an error.

**Settings contract.** `install()` answers `{ ok: true }` (the app restarts) or `{ ok: false, message, command? }`; the card shows `message`, a `<pre>` with `command` and a Copy button. "Release exists but the manifest is not attached yet" is not an error (`isStillBuilding`).

**Per-app constants:** the dpkg package name (electron-builder uses the npm package name: `music-curator` in TurboMusic, `turbocut` in TurboCut), the app name in the terminal text, the repository. The release workflow must attach `latest-linux.yml` next to the `.deb` (`release-pipeline`).

**Two implementations, same behaviour:**
- TypeScript, class-based, in `files/apps/electron/src/` (TurboMusic, source of truth).
- Vanilla CommonJS for apps whose Electron main process is plain `.cjs`: `variants/vanilla-electron/debInstall.cjs` (pure helpers) and `updater.cjs` (`setupUpdater(getWindow)`, IPC `updater:check|download|install`). Source: `TurboNZL/turbocut`. Copy both next to `main.cjs`, change `DEB_PACKAGE` and the app name in the messages, and call `setupUpdater` after `app.whenReady()`. The variant is **not** listed in `module.json` `files` (those paths mirror a React app and `engine-diff` compares them); it is opt-in.

**Test it without a desktop:** the helpers are pure; assert quoting (`shQuote` with a `'` in the path), each `describePkexec` code, `hasNoNewPrivs` on a real `/proc/self/status` sample, the `systemd-run` argument list, `isStillBuilding` and `installedMatches` (`test/updater.test.ts` in TurboCut). The real install (polkit prompt, terminal fallback, restart) has only been exercised by hand in TurboMusic; TurboCut has not run it on a desktop yet.

## Files
- `apps/electron/src/updater.ts`
- `apps/electron/src/updateErrors.ts`
- `apps/electron/src/debInstall.ts`
- `apps/android/app/src/main/kotlin/app/turbomusic/android/update/AppUpdater.kt`
- `apps/android/app/src/main/kotlin/app/turbomusic/android/update/Releases.kt`
- `apps/web/src/lib/native.ts`
- `apps/web/src/components/AppSettings.tsx`

## Capacitor apps (no Kotlin project)
`files/apps/android-capacitor/ApkUpdaterPlugin.java` is the same updater as a Capacitor plugin (from TurboCut): the page finds the newest release asset, `download({url})` saves the `.apk` to the cache following GitHub's redirect, emitting `progress` events, and `install()` opens Android's installer through a `FileProvider` (or the "install unknown apps" page the first time, resolving `{needsPermission: true}`). Register it in `MainActivity` with `registerPlugin(ApkUpdaterPlugin.class)` before `super.onCreate`, add `REQUEST_INSTALL_PACKAGES` to the manifest, and keep a `fileprovider` entry with a `cache-path`. Open the GitHub release page in a browser only as a fallback. Not compiled in the sandbox: the first CI build is the check.
