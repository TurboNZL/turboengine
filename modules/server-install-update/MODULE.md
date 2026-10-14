# Server install and self-update

How a library server gets onto a machine (one-command Linux/Pi installer, Windows tray app with a setup wizard) and how it updates itself from a button in Settings.

Optional. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbomusic` at `62934e8`.

**Requires:** `cloudflare-access`, `updaters`.

How a library server gets onto a machine and how it updates itself. **Mandatory for any app that runs its own server** (see `self-hosted-server`), so every server is installed and updated the same way.

## Pieces
- **Update button** (`update.ts`, `ServerUpdate.tsx`): the server runs `scripts/update.sh --live` (pull, install, build; no systemctl or sudo), streams the log, then `process.exit(1)` so systemd (`Restart=on-failure`) starts the new code; the page polls until the server is back. Routes: `GET|POST /api/admin/update`. Offered only when `config.updateScript` is set: a git checkout with the script **and** (a systemd `INVOCATION_ID` or `UPDATE=1`); switched off with `UPDATE=0`; never offered by an embedded server (the desktop app updates itself through `updaters`).
- **Linux / Raspberry Pi** (`install-pi.sh`, `update.sh`, guides): one command installs Node, the service user, the systemd unit, the data folder and (optionally) yt-dlp. The service user needs a sudoers entry for `systemctl` for the full update path. Guides must not assume a Pi: it is one option next to a Windows PC.
- **Windows** (`serverEdition/`): a tray app with a setup wizard (`setup.html`): folders for database, music, downloads and cache (junctions), network (home or this computer, port, firewall note), downloaded tools (`tools.ts`: yt-dlp, ffmpeg, Deno), an optional Cloudflare tunnel (`tunnel.ts` runs `cloudflared` with a pasted tunnel token), start with Windows. Own app id, product name and update channel (`editions` module).

- **Docker** (`Dockerfile`, `docker-compose.yml`, `docker-entrypoint.sh`, `.env.example`, `.dockerignore`, guide `MIGRATE_TO_DOCKER.md`): the simplest install. The image is the headless bundle (`apps/electron/dist/headless.mjs`, the same one a Termux or `.deb` server runs) plus the built web client on `node:22-bookworm-slim` with ffmpeg and yt-dlp's standalone binary (it updates itself at every start, and `--js-runtimes node` is set). User `node`, one volume (`/data`, a bind mount so an existing data folder is opened in place), one port, a health check, and a `cloudflared` service in the `tunnel` profile. No service account, no sudoers entry, no Node on the host; the update is `docker compose pull && docker compose up -d` (the in-app Update button does not appear, there is no git checkout). Needs `packages: write` and a `docker` job in `release.yml` (ghcr.io, amd64 + arm64). A container has no host sound server, so features that play through the host's audio (TurboMusic's Soloist and "beam") do not work in it. For a **web-only** app with its own auth, `docker-self-host` is the variant.

## Rename for your app
The scripts and server read the app's environment variables (`TURBOMUSIC_*` in TurboMusic: `TURBOMUSIC_DATA_DIR`, `TURBOMUSIC_PORT`, `TURBOMUSIC_TOKEN`, `TURBOMUSIC_UPDATE`...), the service user, `/var/lib/<app>` and the checkout folder. Rename them together. An app that already shipped under other names needs a small, tested shim that adopts the old data on the first start (TurboMusic: `adoptOldDatabaseName` in `packages/server/src/db.ts`, which renames the old database file instead of letting the server create an empty one).

## Gotchas
- The update success path (restart, page reconnects) is covered by unit tests with fake scripts, not run against systemd or a real Pi when written.
- The in-app update only works when the server runs from a git checkout; a packaged server updates through its installer.
- Put Cloudflare Access (`cloudflare-access`) in front of the tunnel only with a Bypass policy for what the apps cannot send headers to.
- The Docker files were never built here (the sandbox has no Docker daemon): the bundle they copy was built, copied to an empty folder with the web build, and started with the image's environment against a real data folder; do one real `docker build` and `docker compose up` on a machine that has Docker. Bind-mounted folders must belong to uid 1000 (`chown -R 1000:1000`), and a symlinked storage folder needs its target mounted at the same path.
- The installer and wizard were run with `--dry-run` / in Chromium with a stub bridge; the tray, junctions, downloads and tunnel were never run on a real Windows machine.

## Files
- `packages/server/src/update.ts`
- `scripts/update.sh`
- `scripts/install-pi.sh`
- `apps/web/src/components/ServerUpdate.tsx`
- `docs/guides/UPDATING.md`
- `docs/guides/DEPLOY_PI.md`
- `docs/guides/WINDOWS_SERVER.md`
- `apps/electron/src/serverEdition/main.ts`
- `apps/electron/src/serverEdition/serverConfig.ts`
- `apps/electron/src/serverEdition/setup-preload.ts`
- `apps/electron/src/serverEdition/setup.html`
- `apps/electron/src/serverEdition/tools.ts`
- `apps/electron/src/serverEdition/tunnel.ts`
- `Dockerfile`
- `docker-compose.yml`
- `docker-entrypoint.sh`
- `.env.example`
- `.dockerignore`
- `docs/guides/MIGRATE_TO_DOCKER.md`
