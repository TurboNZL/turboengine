# Server install and self-update

How a library server gets onto a machine (one-command Linux/Pi installer, Windows tray app with a setup wizard) and how it updates itself from a button in Settings.

Optional. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbomusic` at `ea3f5ea`.

**Requires:** `cloudflare-access`, `updaters`.

How a library server gets onto a machine and how it updates itself. **Mandatory for any app that runs its own server** (see `self-hosted-server`), so every server is installed and updated the same way.

## Pieces
- **Update button** (`update.ts`, `ServerUpdate.tsx`): the server runs `scripts/update.sh --live` (pull, install, build; no systemctl or sudo), streams the log, then `process.exit(1)` so systemd (`Restart=on-failure`) starts the new code; the page polls until the server is back. Routes: `GET|POST /api/admin/update`. Offered only when `config.updateScript` is set: a git checkout with the script **and** (a systemd `INVOCATION_ID` or `UPDATE=1`); switched off with `UPDATE=0`; never offered by an embedded server (the desktop app updates itself through `updaters`).
- **Linux / Raspberry Pi** (`install-pi.sh`, `update.sh`, guides): one command installs Node, the service user, the systemd unit, the data folder and (optionally) yt-dlp. The service user needs a sudoers entry for `systemctl` for the full update path. Guides must not assume a Pi: it is one option next to a Windows PC.
- **Windows** (`serverEdition/`): a tray app with a setup wizard (`setup.html`): folders for database, music, downloads and cache (junctions), network (home or this computer, port, firewall note), downloaded tools (`tools.ts`: yt-dlp, ffmpeg, Deno), an optional Cloudflare tunnel (`tunnel.ts` runs `cloudflared` with a pasted tunnel token), start with Windows. Own app id, product name and update channel (`editions` module).

## Rename for your app
The scripts and server read the app's environment variables (`CURATOR_*` in TurboMusic: `CURATOR_DATA_DIR`, `CURATOR_PORT`, `CURATOR_TOKEN`, `CURATOR_UPDATE`...), the service user, `/var/lib/<app>` and the checkout folder. Rename them together; changing them in an installed app orphans its data, so apps that already ship keep theirs.

## Gotchas
- The update success path (restart, page reconnects) is covered by unit tests with fake scripts, not run against systemd or a real Pi when written.
- The in-app update only works when the server runs from a git checkout; a packaged server updates through its installer.
- Put Cloudflare Access (`cloudflare-access`) in front of the tunnel only with a Bypass policy for what the apps cannot send headers to.
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
