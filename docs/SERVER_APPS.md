# Server-side apps: the standard way to build and host one

Every TurboNZL app that runs its own server is built to one contract and can be hosted in **one of two supported ways**. The app picks its main way and documents it; it may offer both. Read [PORTS.md](PORTS.md) first: every server needs its **own port**, and port numbers must be unique on a machine.

## 1. The two ways

| | **A. Native service** (TurboMusic's way) | **B. Docker** (TurboKeep's way) |
|---|---|---|
| What it is | Node runs the app's checkout under a service user, started by systemd (Linux) or a tray app (Windows); or a packaged `.deb` / AppImage | One image from ghcr.io (amd64 + arm64), one volume, one port, started by `docker compose` |
| Engine modules | `self-hosted-server` = `server-install-update` + `cloudflare-access` + `updaters` + `release-pipeline` | `docker-self-host` + `release-pipeline` (+ `cloudflare-access` if there are native clients) |
| Install | `curl ... install-pi.sh \| sudo bash -s -- --data-dir /mnt/drive/app --port N` (safe to re-run) | `docker compose up -d` |
| Update | The app's **Update server** button (owner only), or `scripts/update.sh`, or the newer installer file | `docker compose pull && docker compose up -d` |
| Roll back | `git checkout` an older tag and restart | pin an older image tag |
| Data | `<APP>_DATA` (a folder you choose, e.g. on the external drive) | the `/data` volume; copy it with SQLite's `VACUUM INTO` while it runs |
| Host tools (ffmpeg, yt-dlp, Chromium) | Straightforward: they are on the machine | Must go into the image: heavy and awkward |
| Needs on the machine | Node 22.13+, git, apt (the installer does it) | Docker |
| Choose it when | the server needs host tools, big media on its own drive, the in-app update button, the Android/desktop apps connect to it (TurboMusic, TurboPantry's Chromium for recipe links) | the app is a plain web server: no host tools, you want isolation, one-command rollback, or you already run Docker |

A person who dislikes Docker must never be forced into it: **way A stays available and is the default for apps that need host tools** (TurboPantry removed its Docker image for this reason). Way B is the default for web-only apps with no host tools (TurboKeep). An app that offers both says which is the default and keeps the other in its own guide section.

## 2. The contract every server app meets (both ways)
Written from what TurboMusic, TurboPantry and TurboKeep actually do.

- **Runtime:** Node 22.13+ and the built-in `node:sqlite` (no native module to compile). Node prints an "experimental" warning for it, silenced with `--disable-warning=ExperimentalWarning` in the unit or Dockerfile. TurboPantry also runs its TypeScript directly with `--experimental-strip-types`, so it has no build step.
- **Settings come from the environment, one prefix per app:** `<APP>_PORT` (default from [PORTS.md](PORTS.md)), `<APP>_HOST` (`0.0.0.0`), `<APP>_DATA` (the data folder), `<APP>_WEB` (the built web client, found by default). TurboMusic's prefix is `CURATOR_` for historical reasons; new apps use their own name.
- **One process serves everything:** the API under `/api/*` and the built web client at `/` with a fallback to `index.html`. Same origin means no CORS, relative URLs, and it works behind any tunnel or proxy with no settings.
- **`GET /api/health` is public** and answers `{ "ok": true, "version": ... }`. Process managers, Docker's `HEALTHCHECK` and the installers use it.
- **Accounts:** the first account is the owner. It must not be claimable by whoever opens the address first once a tunnel exists: print a one-time setup code in the log (TurboKeep) or hand out a token at install (TurboMusic, TurboPantry). Passwords/tokens are stored hashed. Sign-up is closed unless the owner opens it.
- **Behind a tunnel or proxy:** trust `CF-Connecting-IP` (else the last `X-Forwarded-For`), `X-Forwarded-Proto` for Secure cookies, check same-site writes with `Sec-Fetch-Site` first. The code is `modules/docker-self-host/files/apps/server/src/auth.ts`.
- **A versioned database:** `pragma user_version` migrations that refuse a database from a newer version (TurboKeep `db.ts`); never open one you do not understand.
- **Logs to stdout/stderr** (journald or `docker logs` collects them); the one-line start-up message names the version, port and data folder.
- **Versions** `vYYYY.M.N`, the same everywhere ([release-pipeline](../modules/release-pipeline/MODULE.md)).

## 3. Way A in detail: native service (TurboMusic)
Files, from the `server-install-update` module: `scripts/install-pi.sh`, `scripts/update.sh`, `packages/server/src/update.ts` (the button), `docs/guides/DEPLOY_PI.md` and `UPDATING.md`, plus a Windows tray installer where the app has one.
- `install-pi.sh [--data-dir PATH] [--port N] [--user NAME] [--branch B] [--dry-run] [--yes]` creates the service user, installs Node, clones the app into the user's home, builds the web client, writes the systemd unit (`Restart=on-failure`, the data folder, `<APP>_PORT`) and prints the address and token. **`--port` is how a user avoids a clash.** Put the data on the external drive, not the SD card.
- `update.sh --live` (no sudo) pulls, installs and builds; the server then exits so systemd restarts it on the new code. The Update button is offered only to the owner, on a git checkout under systemd (or with `<APP>_UPDATE=1`).
- Packaged option: `.deb` (creates the service user and unit) or an AppImage; updated by installing the newer file.
- Tunnel: `cloudflared` on the host, public hostname to `http://localhost:<app port>`.

## 4. Way B in detail: Docker (TurboKeep)
Files, from the `docker-self-host` module: `Dockerfile`, `docker-compose.yml`, `.dockerignore`, `.env.example`, the `docker` / `node-bundle` jobs for `release.yml`.
- The build stage runs on the builder's architecture; the final image only copies `server.mjs` and the built client, runs as `node`, one `/data` volume, `HEALTHCHECK` on `/api/health`.
- `docker-compose.yml` publishes `${<APP>_BIND:-0.0.0.0}:${<APP>_PORT:-<registry port>}:<inside port>` (reachable from the network by default; `<APP>_BIND=127.0.0.1` once a tunnel is in use) and has a `cloudflared` service in the `tunnel` profile reading `TUNNEL_TOKEN` from `.env`. The tunnel's public hostname is `http://<service>:<inside port>`.
- Update `docker compose pull && docker compose up -d`; back up with `VACUUM INTO`.
- Releases also attach a Node tarball (`<app>-<version>-node.tar.gz`) for running without Docker.

## 5. A new server app, in order
1. Pick the next free port in [PORTS.md](PORTS.md) and add the row **in the first commit**.
2. Choose the way (table above). Take the matching modules and put them in `.turboengine.json`, saying in `notes` what you did not take and why.
3. Build to the contract in section 2.
4. Write the guides: getting started, self-hosting (with the sentence that the port must be unique on the machine and how to change it), the Cloudflare Tunnel steps, backup and update.
5. Follow `templates/NEW_APP_CHECKLIST.md`.

## 6. Gotchas that cost time
- **Compose reads every `${VAR}` for every service, even one in a profile that is not running.** `${TUNNEL_TOKEN:?message}` made a plain `docker compose up` fail with "required variable TUNNEL_TOKEN is missing" on a machine without a tunnel. Use `${VAR:-}`.
- **A port is taken, not shared.** If the app will not start with "address already in use", something else has the number ([PORTS.md](PORTS.md#checking-before-you-start)). With Docker the *published* port is the one that matters.
- **ghcr packages start private.** Make the package public after the first release or `docker compose pull` is denied for everyone else.
- **Cloudflare refuses request bodies over the plan's limit** (100 MB Free and Pro): big imports go over the LAN.
- **`pnpm/action-setup@v4` fails if given both `version:` and `packageManager`.**
- **A port published on `127.0.0.1` cannot be opened from another computer.** The first TurboKeep compose file did that, and the Pi could not be reached from the owner's PC. Default to `0.0.0.0` and make it a setting.
- **Next to a tunnel, close the direct door:** with the tunnel working, set `<APP>_BIND=127.0.0.1`, because anyone who can reach the port directly can forge `CF-Connecting-IP`.
