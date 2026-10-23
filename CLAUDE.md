# turboengine: instructions for the AI

This repo is the main framework for TurboNZL apps, delivered as a reference and template, not a library. Keep it that way. Its concepts began in TurboMusic; the engine is now the common source and no app is privileged over another.

## Principles
1. **Code that works beats code that is general.** Modules are copies of files that already run in a real app (TurboMusic first). Do not rewrite them into abstractions; do not add configuration nobody has needed. Provenance goes in `module.json` (`source.repo`, `source.ref`).
2. **Apps pin, they do not track.** An app records `.turboengine.json` (`engine.ref`, the modules it uses, `moved` paths). Upgrading is a deliberate act: run `node scripts/engine-diff.mjs <app> --show`, port what is wanted, update `ref`.
3. **New capability = optional.** If an app's requirement could help others, add it as a new module or an option inside a module. Never change a default in a way that makes an already-pinned app wrong.
4. **Each module documents its gotchas.** `MODULE.md` is where lessons live (what broke, why). When an app fixes a bug in a module's file, copy the fix back here and add a line.
5. **Consistency is the point:** versions `vYYYY.M.N`, lowercase asset names, `docs/guides` (user) vs `docs/development` (internal), `CLAUDE.md` + `PROJECT_BRIEF.md` at the root, themes on by default (the `themes/` package), Settings tabs that wrap, one hook-class vocabulary (`.btn .card .bt-*`), **one logo family** (the engine mark plus the app's own emblem, `modules/logos`; never hand-edit icon files, regenerate them; **favicons and anything 48 px or smaller use only the coloured centre symbol**, not the full emblem), **one motion language** (`modules/motion`: what is new arrives, a replaced list swaps, a panel slides in, a window pops), **drop-downs drawn by the look, never a native `<select>`** (`enhanceSelects()` from `turbothemes`, or TurboKeep's `Select.tsx`; the OS draws a native list and no style can restyle it; `themes/examples/verify-looks.mjs` fails on one).

## Naming
The first app was called Music Curator and is now **TurboMusic** (`TurboNZL/turbomusic`). Since 2026-10-14 the old name is out of its code: packages `@turbomusic/*`, env vars `TURBOMUSIC_*`, bridges `TurboMusicAndroid` / `turbomusicDesktop`, package `app.turbomusic.android`, `.deb` names `turbomusic*`, and the module files here match (`source.ref` `62934e8`). What is left of the old name in TurboMusic is only shims that carry old data over (settings keys, the local database, the server's database file, the Electron settings folders) and the Android signing key's alias; the copies in `modules/*/files/` already use the new names. **An app that renames itself after release** must do the same: change every identifier, and add small tested shims that adopt the old data (never rename a database file or a storage key without one), then delete them once every device has run the new version.

## Splitting modules
On 2026-10-13 `window-frame`, `android-shell` and `settings-shell` were split. An app pinned to the old module keeps working (its files are still in the engine, in the new module); add the new module name to `.turboengine.json` or `engine-diff` will no longer list those files: `gpu-modes`, `discord-presence` and `cloudflare-access` (from `window-frame`), `termux-server` and `cloudflare-access` (from `android-shell`), `device-pairing` (from `settings-shell`).

## Starting an app
Copy `templates/*`, pick modules (`release-pipeline`, `prebuilt-release`, `updaters`, `appearance`, `guides-and-docs`, `logos` are for everyone; the rest are optional), copy their `files/`, follow each `MODULE.md`, fill in `.turboengine.json` with the engine commit you used, and write the "Engine" section of the app's `CLAUDE.md` (the template has it).

**Always follow `templates/NEW_APP_CHECKLIST.md`.** A new program must get a default `main` branch, an MIT `LICENSE` and a `README.md`, and the AI must remind the user to enable GitHub Actions, turn on workflow write permission with "Allow GitHub Actions to create and approve pull requests", and (if Claude's GitHub access is limited to selected repositories) add the new repository to the Claude connection.

## Taking an app's improvement back
1. Diff: `node scripts/engine-diff.mjs <app> --show`.
2. Copy the improved files into `modules/<m>/files/<same path>`; keep app-specific names out of anything that is meant to be generic, or leave them and say so in `MODULE.md`.
3. Update `module.json` `source.ref`, add the gotcha to `MODULE.md`, bump nothing else.
4. Commit with a message that names the app and the module.

## Pull requests
`.github/workflows/auto-pr.yml` opens a pull request for every branch pushed to this repo (not `main`), unless that branch already has an open one or has nothing main lacks, so merging is the only step left. It needs *Settings > Actions > General > Allow GitHub Actions to create and approve pull requests*. Apps get the same file from `release-pipeline`.

## Cloud-session note
A session only sees repositories attached to it. When working on an app that is pinned to this repo, attach it read-only (`add_repo`) to copy from it.

## Themes (`themes/`)
The theme engine and all themes live here (package `turbothemes`; the old repository is retired). Read `themes/CLAUDE.md` before touching them. Rules that differ from the rest of the repo: this is a real **package** (apps install it, they do not copy it), `themes/dist` is committed by CI (`.github/workflows/themes-build.yml`) and downloaded by running apps, and the engine half almost never changes while themes do. Themes are the default for every app; opting out is a documented option (`modules/appearance`), never the template's default.

**Each app may add one light and one dark palette of its own** (a pair, `themes/<app>/`, see `themes/docs/AUTHORING.md` "Every app can have its own two palettes"). Pickers show a Light / Dark switch rather than listing every theme twice; a theme with only one mode is fine.

## Desktop updates
Every app with an Electron desktop build updates a Linux `.deb` the same way (download with electron-updater, install through pkexec, then a sudo terminal, then `systemd-run --user` under `no_new_privs`, success only when `dpkg-query` shows the new version). The rules and both implementations (TypeScript class, vanilla CommonJS in `modules/updaters/variants/vanilla-electron/`) are in `modules/updaters/MODULE.md`.

## Mandatory sets
An app that runs its own server takes `self-hosted-server`: `cloudflare-access` + `server-install-update` + `updaters` + `release-pipeline`. Every app with a desktop or Android build takes `updaters` and `release-pipeline`. A **web-only** app served by its own server takes `docker-self-host` + `release-pipeline` instead (see `self-hosted-server`).

## Prebuilt release
Every app takes `prebuilt-release` with `release-pipeline`: the pull request builds, the merge publishes those same files (the user merges within minutes, so a second build is wasted). It replaces the build-on-merge `release.yml` with `build.yml` (see its `MODULE.md`). It is mandatory for new apps and for any app that upgrades its release workflow; an already-pinned app keeps working as it is until it adopts it deliberately (principle 2). It always falls back to building, so a doubt never blocks a release.

## Cloudflare
`docs/CLOUDFLARE.md` is the full Cloudflare Tunnel + Access setup (service token, the **Service Auth** policy, CORS, what each client must send, a symptom table, curl checks). Read it before touching any app that talks to a server behind Access. Two rules apps keep breaking: the policy action must be Service Auth (Allow means the portal login), and **every pairing code and every code path that applies one must carry the service token id and secret**.

## Server apps and ports
`docs/SERVER_APPS.md` is the standard for building and hosting a server app (native service the TurboMusic way, or Docker the TurboKeep way). `docs/PORTS.md` is the **port registry**: port numbers must be unique on a machine, never default to 8080 or another common port, take the next free number from 47800-47999 when creating a server app and add its row in the same commit, and make the port a setting (`<APP>_PORT`).

## Two theme packs
`themes/` is the full pack (default). `themes-open/` is the stripped-down pack for apps that are or may be sold: no third-party names, logos, brand fonts or trade dress. It is generated from `themes/` by `themes-open/make.py` (edit the keep/rename lists there, not the generated folders), so a fix in `themes/` reaches it by regenerating. When adding a theme to `themes/`, decide whether it belongs in the open pack; anything named after a product, game, OS or vendor does not.

## Not here
App domain code (a music library, a budget) belongs in the app.
