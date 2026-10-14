# Server install and self-update

How a library server gets onto a machine (one-command Linux/Pi installer, Windows tray app with a setup wizard) and how it updates itself from a button in Settings.

Optional. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbomusic` at `62934e8`.

**Requires:** `cloudflare-access`, `updaters`.

How a library server gets onto a machine and how it updates itself. **Mandatory for any app that runs its own server** (see `self-hosted-server`), so every server is installed and updated the same way.

## Pieces
- **Update button** (`update.ts`, `ServerUpdate.tsx`): the server runs `scripts/update.sh --live` (pull, install, build; no systemctl or sudo), streams the log, then `process.exit(1)` so systemd (`Restart=on-failure`) starts the new code; the page polls until the server is back. Routes: `GET|POST /api/admin/update`. Offered only when `config.updateScript` is set: a git checkout with the script **and** (a systemd `INVOCATION_ID` or `UPDATE=1`); switched off with `UPDATE=0`; never offered by an embedded server (the desktop app updates itself through `updaters`).
- **Linux / Raspberry Pi** (`install-pi.sh`, `update.sh`, guides): one command installs Node, the service user, the systemd unit, the data folder and (optionally) yt-dlp. The service user needs a sudoers entry for `systemctl` for the full update path. Guides must not assume a Pi: it is one option next to a Windows PC.
- **Windows** (`serverEdition/`): a tray app with a setup wizard (`setup.html`): folders for database, music, downloads and cache (junctions), network (home or this computer, port, firewall note), downloaded tools (`tools.ts`: yt-dlp, ffmpeg, Deno), an optional Cloudflare tunnel (`tunnel.ts` runs `cloudflared` with a pasted tunnel token), start with Windows. Own app id, product name and update channel (`editions` module).

- **One folder, any drive** (`install-server.sh`, `bundleUpdate.ts`, `remove-old-install.sh`, guide `MIGRATE_SERVER.md`): `--root /mnt/data/<app>` holds the program, its own Node, ffmpeg/ffprobe/yt-dlp, `releases/<ver>/` with an `app` symlink, the data folder, `run.sh`, `settings.env` and the unit file; the unit is linked as a **user** service (`systemctl --user link`, `loginctl enable-linger`), so there is no service account and no root. Only that link, the linger flag, journald logs and `curl`/`xz-utils` touch the root drive. The in-app button uses `BundleUpdater` (enabled by `<APP>_INSTALL_ROOT`): newest GitHub release with a `*-(node|termux).tar.gz` asset, sha256 digest check, atomic symlink swap, keep 3, exit so the unit restarts. Soloist/host audio works because it runs natively.

## Rename for your app
The scripts and server read the app's environment variables (`TURBOMUSIC_*` in TurboMusic: `TURBOMUSIC_DATA_DIR`, `TURBOMUSIC_PORT`, `TURBOMUSIC_TOKEN`, `TURBOMUSIC_UPDATE`...), the service user, `/var/lib/<app>` and the checkout folder. Rename them together. An app that already shipped under other names needs a small, tested shim that adopts the old data on the first start (TurboMusic: `adoptOldDatabaseName` in `packages/server/src/db.ts`, which renames the old database file instead of letting the server create an empty one).

## Gotchas
- The update success path (restart, page reconnects) is covered by unit tests with fake scripts, not run against systemd or a real Pi when written.
- The in-app update only works when the server runs from a git checkout; a packaged server updates through its installer.
- Put Cloudflare Access (`cloudflare-access`) in front of the tunnel only with a Bypass policy for what the apps cannot send headers to.
- **Docker was rejected for apps that need the in-app update button or host audio** (a container cannot update itself or reach the host's sound server; TurboMusic's owner called it a downgrade). `docker-self-host` stays for web-only apps. Do not put Docker files in this module.
- Streaming a fetch response with `Readable.fromWeb` crashed Node (undici `assert(!this.paused)`); `BundleUpdater` reads `arrayBuffer()`. In the sandbox, Node fetch needs `NODE_USE_ENV_PROXY=1`.
- Verified for real as non-root: installer downloads, run.sh and an in-app update from a real GitHub release. NOT verified: the systemd user unit and linger (no systemd in the sandbox), `remove-old-install.sh` beyond dry-run.
- The installer and wizard were run with `--dry-run` / in Chromium with a stub bridge; the tray, junctions, downloads and tunnel were never run on a real Windows machine.

## Files
- `packages/server/src/update.ts`
- `scripts/update.sh`
- `scripts/install-pi.sh`
- `apps/web/src/components/ServerUpdate.tsx`
- `docs/guides/UPDATING.md`
- `docs/guides/DEPLOY_PI.md`
- `docs/guides/WINDOWS_SERVER.md`
- `packages/server/src/bundleUpdate.ts`
- `packages/server/test/bundleUpdate.test.ts`
- `scripts/install-server.sh`
- `scripts/remove-old-install.sh`
- `docs/guides/MIGRATE_SERVER.md`
- `apps/electron/src/serverEdition/main.ts`
- `apps/electron/src/serverEdition/serverConfig.ts`
- `apps/electron/src/serverEdition/setup-preload.ts`
- `apps/electron/src/serverEdition/setup.html`
- `apps/electron/src/serverEdition/tools.ts`
- `apps/electron/src/serverEdition/tunnel.ts`
