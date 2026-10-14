# Editions: full, app-only and server (and the server module)

One Electron codebase shipped as three editions (window + library server, window only, headless server) with a server module that can be installed or removed inside the app.

Optional. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbomusic` at `62934e8`, where they run.

## Shape
- **full** (`package.json` build): window + the app's own server on 127.0.0.1.
- **app** (`electron-builder.app.json`, `turbomusicEdition: "app"`): window only; serves just the web client (`staticServer.ts`), port = full's + 1 so both can be installed.
- **server**: Windows = tray app + setup wizard (`electron-builder.server.json`); Linux = headless (`electron-builder.server-linux.json`): `headless.ts` run by the Electron binary as plain Node. `serverWrapper.cjs` (electron-builder `afterPack`) swaps the program for a launcher that sets `ELECTRON_RUN_AS_NODE=1`, so the same files serve a systemd `.deb` and an `.AppImage` and nothing has to be installed first (Electron brings Node with `node:sqlite`).
- **server module**: `desktop.json` `serverModule` (default on in full, off in app) + IPC `turbomusic:server-module` (see TurboMusic `apps/electron/src/main.ts`), so the app can install or remove its own server from Settings.

## Gotchas
- Give each edition its own `appId`, `productName`, `executableName`, `desktopName`/`StartupWMClass` and update `channel`.
- `electron-builder --dir` is enough to test the headless launcher without fpm/appimagetool.
- A `//` comment appended inside a one-line `if (...) { ...; return; }` swallows the rest of the line (it happened twice).

## Files
- `apps/electron/package.json`
- `apps/electron/electron-builder.app.json`
- `apps/electron/electron-builder.server.json`
- `apps/electron/electron-builder.server-linux.json`
- `apps/electron/scripts/build.mjs`
- `apps/electron/scripts/serverWrapper.cjs`
- `apps/electron/src/headless.ts`
- `packages/server/src/staticServer.ts`
- `apps/electron/build/server-postinst.sh`
- `apps/electron/build/server-prerm.sh`
- `apps/electron/build/server-postrm.sh`
