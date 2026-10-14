# Release pipeline and naming

Every merge to main becomes a release: auto-PR for pushed branches, checks, next version vYYYY.M.N, installers and APK attached, lowercase asset names.

Recommended for every app. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbomusic` at `62934e8` (workflows refreshed; they run there).

## What it does
- `auto-pr.yml`: a push of any non-main branch opens a PR (needs the repo setting *Actions > General > Allow GitHub Actions to create and approve pull requests*).
- `check.yml`: typecheck, tests, web build and the Android compile, **on pushes to main only**.
- `release.yml`: a push to main (docs-only changes ignored; "Run workflow" releases on demand) works out the next tag `vYYYY.M.N` (year, month, a counter that restarts each month), creates the release (`gh release create --target $GITHUB_SHA`, which also creates the tag), then builds and attaches the assets in parallel jobs.
- A merged PR cannot take new work: the next change goes on a fresh branch from main (the AI should restart its branch from main).

## Before the first release (see `templates/NEW_APP_CHECKLIST.md`)
The repository needs a default `main` branch, GitHub Actions enabled, workflow permission **Read and write** with **Allow GitHub Actions to create and approve pull requests**, and (if Claude is limited to selected repositories) the repo added to the Claude connection. Remind the user of each; the pipeline fails silently or with a 403 without them.

## Jobs in `release.yml` (drop the ones the app does not ship)
| Job | Builds | Needs module |
|---|---|---|
| `release` | next tag + the GitHub release (always) | none |
| `desktop` | Electron installers: full, app (and Linux server) editions | `editions`, `window-frame` |
| `windows-server` | the tray server installer | `server-install-update` |
| `android` | signed APK | `android-shell` |
| `termux-bundle` | the server bundle the Android app installs into Termux | `termux-server` |
| `docker` / `node-bundle` | multi-arch image on ghcr.io and a Node tarball (web-only apps; replace `desktop`/`android`) | `docker-self-host` |

## Asset naming (all lowercase)
`<app>[-<edition>]-<version>-<os>-<arch>.<ext>`: `turbomusic-2026.10.31-linux-amd64.deb`, `...-windows-x64-setup.exe`, `...-android.apk`. The updaters never look at file names (electron-updater reads `latest*.yml`, Android takes the first `.apk`), so names can change without a transition period. Set names with `artifactName` in the electron-builder config.

## Gotchas
- Releases the pipeline makes are visible to updaters as soon as `gh release create` runs, while assets arrive minutes later: the updater must treat "release exists, manifest not there yet" as "still being built" (see the `updaters` module).
- electron-builder names its update manifests after the channel (`latest.yml`, `app.yml`, `server.yml`): give every edition its own `publish.channel` or they overwrite each other.
- Pre-releases count: `/releases/latest` ignores them and 404s when every release is one. Updaters list `/releases` instead.
- `pnpm install --ignore-scripts` in CI, with `--filter` for just what each job needs.

## Files
- `.github/workflows/release.yml`
- `.github/workflows/auto-pr.yml`
- `.github/workflows/check.yml`
