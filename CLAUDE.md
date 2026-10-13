# turboengine: instructions for the AI

This repo is a reference and template for TurboNZL apps, not a library. Keep it that way.

## Principles
1. **Code that works beats code that is general.** Modules are copies of files that already run in a real app (TurboMusic first). Do not rewrite them into abstractions; do not add configuration nobody has needed. Provenance goes in `module.json` (`source.repo`, `source.ref`).
2. **Apps pin, they do not track.** An app records `.turboengine.json` (`engine.ref`, the modules it uses, `moved` paths). Upgrading is a deliberate act: run `node scripts/engine-diff.mjs <app> --show`, port what is wanted, update `ref`.
3. **New capability = optional.** If an app's requirement could help others, add it as a new module or an option inside a module. Never change a default in a way that makes an already-pinned app wrong.
4. **Each module documents its gotchas.** `MODULE.md` is where lessons live (what broke, why). When an app fixes a bug in a module's file, copy the fix back here and add a line.
5. **Consistency is the point:** versions `vYYYY.M.N`, lowercase asset names, `docs/guides` (user) vs `docs/development` (internal), `CLAUDE.md` + `PROJECT_BRIEF.md` at the root, themes on by default (the `themes/` package), Settings tabs that wrap, one hook-class vocabulary (`.btn .card .bt-*`).

## Naming
The first app was called Music Curator / Curator and is now **TurboMusic** (`TurboNZL/turbomusic`; GitHub redirects the old URL). Docs say TurboMusic. What stays "curator" on purpose, because renaming it would break installed apps or the copies in `modules/*/files/`: the Android package path `app/musiccurator/android` and `CuratorBridge`, `curatorEdition`, the IPC name `curator:server-module`, the default storage prefix `'curator'`, `.deb` package names, and image file names under `themes/docs/img`. `source.ref` in each `module.json` is a commit from before the rename.

## Starting an app
Copy `templates/*`, pick modules (`release-pipeline`, `updaters`, `appearance`, `guides-and-docs` are for everyone; the rest are optional), copy their `files/`, follow each `MODULE.md`, fill in `.turboengine.json` with the engine commit you used, and write the "Engine" section of the app's `CLAUDE.md` (the template has it).

## Taking an app's improvement back
1. Diff: `node scripts/engine-diff.mjs <app> --show`.
2. Copy the improved files into `modules/<m>/files/<same path>`; keep app-specific names out of anything that is meant to be generic, or leave them and say so in `MODULE.md`.
3. Update `module.json` `source.ref`, add the gotcha to `MODULE.md`, bump nothing else.
4. Commit with a message that names the app and the module.

## Cloud-session note
A session only sees repositories attached to it. When working on an app that is pinned to this repo, attach it read-only (`add_repo`) to copy from it.

## Themes (`themes/`)
The theme engine and all themes live here (package `turbothemes`; the old repository is retired). Read `themes/CLAUDE.md` before touching them. Rules that differ from the rest of the repo: this is a real **package** (apps install it, they do not copy it), `themes/dist` is committed by CI (`.github/workflows/themes-build.yml`) and downloaded by running apps, and the engine half almost never changes while themes do. Themes are the default for every app; opting out is a documented option (`modules/appearance`), never the template's default.

## Not here
App domain code (a music library, a budget) belongs in the app.
