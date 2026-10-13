# turboengine

A **reference point** for TurboNZL apps: working, battle-tested code and conventions that apps copy and pin to, so they share one feel (release flow, updates, naming, the theme picker, window chrome, settings layout, docs and briefing). It is not a package and not a framework. It is a template that gets better every time an app teaches it something.

- `CLAUDE.md`: how the AI should use and grow this repo (read it first).
- `modules/<name>/`: one capability each, with `MODULE.md` (what, how to integrate, gotchas), `module.json` and `files/` (the real files, at the paths they have in an app).
- `themes/`: the theme engine and every theme (the npm package `turbothemes`, formerly its own repository). **On by default**; an app can opt out (see `modules/appearance`).
- `templates/`: `CLAUDE.md`, `PROJECT_BRIEF.md` and the `.turboengine.json` pin to start an app from.
- `scripts/engine-diff.mjs`: compares an app with the modules it pins (same, changed, missing).

The themes are part of this repository (`themes/`, with their own `CLAUDE.md`): apps install the package from this repo and receive theme updates at run time from `themes/dist`. The `appearance` module is how an app wires them in.

## Modules
| Module | Optional | What |
|---|---|---|
| [`release-pipeline`](modules/release-pipeline/MODULE.md) | no | Release pipeline and naming: Every merge to main becomes a release: auto-PR for pushed branches, checks, next version vYYYY.M.N, installers and APK attached, lowercase asset names. |
| [`editions`](modules/editions/MODULE.md) | yes | Editions: full, app-only and server (and the server module): One Electron codebase shipped as three editions (window + library server, window only, headless server) with a server module that can be installed or removed inside the app. |
| [`updaters`](modules/updaters/MODULE.md) | no | Self-update (desktop and Android): electron-updater from GitHub releases (with a .deb path that works without a polkit agent) and a native Android updater, both through one Settings card. |
| [`appearance`](modules/appearance/MODULE.md) | no | Appearance: turbothemes glue, layouts and the picker: How an app starts the turbothemes engine, owns its layouts, shows the picker (colour theme, UI style, layout, wallpaper) and the theme-update card. |
| [`window-frame`](modules/window-frame/MODULE.md) | yes | Desktop window: custom frame, preload bridge and main process: A theme-drawn title bar (traffic lights by UI style), the preload bridge `window.<app>Desktop`, the single-instance main process, GPU modes and graphics readback. |
| [`guides-and-docs`](modules/guides-and-docs/MODULE.md) | no | Docs layout, in-app guides and the project brief: `docs/guides` = user guides bundled into Settings > Guides; `docs/development` = developer notes; `PROJECT_BRIEF.md` and `CLAUDE.md` at the root. |
| [`settings-shell`](modules/settings-shell/MODULE.md) | yes | Settings shell and device pairing: Wrapping tab strip, card order conventions, and a pairing code (`CUR1-<base64url>`) that carries address, token and access credentials to a new device. |
| [`android-shell`](modules/android-shell/MODULE.md) | yes | Android shell: WebView app, bridge, media service, server module: A native Kotlin app hosting the web client from http://localhost, with a JS bridge, a Media3 player (notification, Android Auto), and an optional Termux-hosted server. |

## Using it
**New app:** copy `templates/` into the repo (`CLAUDE.md`, `PROJECT_BRIEF.md`, `.turboengine.json`), then add modules by copying their `files/` and following `MODULE.md`. Tell the AI: *"Read TurboNZL/turboengine (CLAUDE.md and the modules you need) and set this app up from it; pin to commit X."*

**Existing app:** add `.turboengine.json`, then `node scripts/engine-diff.mjs ../my-app --show` shows how far it has drifted.

**Improving the engine:** when an app needs something that other apps could use, port it into the engine as an **optional** module or option (never as a default that breaks existing apps). Branches named `app/<name>` are welcome for an app's own variant; run the AI on the engine to fold the useful parts into `main`.
