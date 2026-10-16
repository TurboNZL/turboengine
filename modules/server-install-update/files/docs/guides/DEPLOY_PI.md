# Running the server on a Raspberry Pi (or any Linux machine)

A Raspberry Pi is one way to host the server, not a requirement: the desktop app brings its own server, and a Windows PC can host one ([WINDOWS_SERVER.md](WINDOWS_SERVER.md)). Use this guide if you want a small always-on Linux box.

Written from the server's actual behaviour (`packages/server`). The parts that depend on your Pi (model, OS, drive) are marked **check**. Report anything that does not match and this file gets fixed.

> **The short way:** one command does sections 2, 3 and 4 below (Node, the app, the service, yt-dlp, ffmpeg, a weekly yt-dlp update) and prints the address and token:
> ```
> curl -fsSL https://raw.githubusercontent.com/TurboNZL/turbomusic/main/scripts/install-pi.sh | sudo bash -s -- --data-dir /mnt/music/turbomusic
> ```
> Mount the drive first (section 1; or use the folder your desktop already mounts). `--dry-run` shows what it would do; running it again updates. [GETTING_STARTED.md](GETTING_STARTED.md) has the plain-language version. Everything below is the same thing by hand, plus what the script does not cover. The script itself has only been checked with `bash -n` and a dry run, not on a real Pi: if a step fails it says which, and the manual sections below are the fallback.

> **The simplest way now:** `scripts/install-server.sh --root /mnt/data/turbomusic` puts the whole server in one folder (own Node, ffmpeg, yt-dlp, library), needs no root and updates from the app. See [MIGRATE_SERVER.md](MIGRATE_SERVER.md). The rest of this page is the older way with a dedicated service account.

## Packaged install (no Node, no git): the server .deb or AppImage
Each release has a headless server for Linux that brings its own runtime:
- **Debian, Ubuntu, Raspberry Pi OS 64-bit:** `sudo apt install ./turbomusic-server-<version>-linux-<arch>.deb`. It creates a `turbomusic` service user, a systemd service that starts at boot, and keeps the library in `/var/lib/turbomusic`. The address and token: `sudo journalctl -u turbomusic-server -n 20` (token file: `/var/lib/turbomusic/token`). Settings (data folder, port): `/etc/turbomusic/server.env`, then `sudo systemctl restart turbomusic-server`. Removing the package keeps the library.
- **Any distribution:** the server `.AppImage`: `chmod +x` it and run it (`--data-dir /path`, `--port`, `--help`).
Updates for these are by installing the newer file for now (an apt repository is planned). The git-based sections below are the alternative for people who want to track the source.

## 0. What you need
- A Pi 64-bit OS (Raspberry Pi OS 64-bit / Debian 12+). The server is plain Node, so any model that runs it works; downloads and ffmpeg are the slow part on older Pis.
- **Node 22.13 or newer.** The server uses the built-in `node:sqlite`, which needs no native compile but is still labelled experimental by Node (it prints a warning, silenced by the flag in the unit below). Debian's own `nodejs` package is too old. Install Node 22 with [nvm](https://github.com/nvm-sh/nvm) for the service user (see the nvm instructions at https://github.com/nvm-sh/nvm step 0) or from NodeSource. **check:** `node -v`.
- `ffmpeg` (`sudo apt install ffmpeg`) and **yt-dlp** (section 4) for audio downloads.
- An external drive, ideally formatted **ext4**. exFAT/NTFS have no unix permissions or symlinks, so the token file cannot be locked down (the server tolerates this) and `pnpm install` must not run on that drive.

## 1. Mount the drive
Find it with `lsblk -f`, note the UUID, create a mount point and add it to `/etc/fstab`:
```
sudo mkdir -p /mnt/turbomusic
# /etc/fstab (ext4). nofail so a missing drive does not stop the Pi booting
UUID=<your-uuid>  /mnt/turbomusic  ext4  defaults,nofail  0  2
sudo mount -a
sudo mkdir -p /mnt/turbomusic/data && sudo chown -R turbomusic:turbomusic /mnt/turbomusic/data   # after creating the user below
```
The server stores everything under `TURBOMUSIC_DATA_DIR`: `turbomusic.db` (+ `-wal`/`-shm`), `files/` (audio and images, named by sha256), `tmp/`, `token`.

## 2. Install the app
```
sudo useradd --system --create-home --shell /usr/sbin/nologin turbomusic
sudo -u turbomusic -H bash       # then, as that user:
git clone <your repo url> ~/turbomusic && cd ~/turbomusic
pnpm install --ignore-scripts --filter @turbomusic/core --filter @turbomusic/server --filter @turbomusic/web
pnpm --filter @turbomusic/web build      # the server serves apps/web/dist at /
```
Install pnpm with `npm install -g pnpm` (needs Node first). `--ignore-scripts` keeps the install from running dependency scripts, none of which the server or web client need (it used to be required because the removed legacy app's postinstall failed).

Import your old library once (optional, idempotent), exactly as in the nvm instructions at https://github.com/nvm-sh/nvm step 2, with `TURBOMUSIC_DATA_DIR=/mnt/turbomusic/data`.

## 3. systemd service
`/etc/systemd/system/turbomusic.service` (adjust the `node` path: `which node` as the turbomusic user; with nvm it is under `~/.nvm/versions/node/v22.x/bin/node`):
```
[Unit]
Description=TurboMusic server
After=network-online.target mnt-turbomusic.mount
Wants=network-online.target
RequiresMountsFor=/mnt/turbomusic

[Service]
User=turbomusic
WorkingDirectory=/home/turbomusic/turbomusic/packages/server
Environment=TURBOMUSIC_DATA_DIR=/mnt/turbomusic/data
# Environment=TURBOMUSIC_PORT=47813
# Environment=TURBOMUSIC_HOST=127.0.0.1      # only if everything goes through Tailscale/a reverse proxy (section 5)
# Environment=TURBOMUSIC_YTDLP=/usr/local/bin/yt-dlp
# Environment=TURBOMUSIC_YTDLP_COOKIES=/etc/turbomusic/youtube-cookies.txt   # only if YouTube asks for proof you are not a bot: docs/guides/YTDLP_COOKIES.md
# Environment="TURBOMUSIC_YTDLP_ARGS=--js-runtimes node"                   # extra yt-dlp arguments, split on spaces
ExecStart=/usr/bin/node --experimental-strip-types --disable-warning=ExperimentalWarning src/index.ts
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
```
```
sudo systemctl daemon-reload
sudo systemctl enable --now turbomusic
journalctl -u turbomusic -f          # first start prints the token; also in /mnt/turbomusic/data/token
```
`RequiresMountsFor` makes the service wait for the drive, so it never creates a fresh empty database on the SD card by accident. The unit name `mnt-turbomusic.mount` follows the mount path; with another path use `systemd-escape -p --suffix=mount /your/path`.

Open `http://<pi-address>:47813`, paste the token in Settings → Server, Save & sync.

## 4. yt-dlp and ffmpeg
- ffmpeg: `sudo apt install ffmpeg`.
- yt-dlp: apt's version is usually stale, and YouTube breaks old versions regularly. Use the standalone binary for 64-bit ARM, `yt-dlp_linux_aarch64` from the [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases) (a 32-bit OS needs the pip or zip route instead), and let it update itself:
  ```
  sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux_aarch64 -o /usr/local/bin/yt-dlp
  sudo chmod a+rx /usr/local/bin/yt-dlp
  sudo yt-dlp -U            # run this whenever downloads start failing
  ```
  Set `TURBOMUSIC_YTDLP=/usr/local/bin/yt-dlp` in the unit if it is not on the service's PATH.
- **JavaScript runtime (important).** Since yt-dlp 2025.11.12, YouTube needs an external JS runtime, otherwise many formats are missing. Deno is the default; Node 22+ also works but must be switched on. The server already needs Node, so put this in `/etc/yt-dlp.conf` (yt-dlp reads it on every run; the server needs no change):
  ```
  --js-runtimes node
  ```
  (If yt-dlp cannot find `node` because the service uses an nvm path, give the path: `--js-runtimes node:/home/turbomusic/.nvm/versions/node/v22.x/bin/node`.) The official executables already bundle the `yt-dlp-ejs` component this relies on. See the [yt-dlp EJS docs](https://github.com/yt-dlp/ejs). Test by hand as the service user: `yt-dlp -F "<a YouTube watch URL>"` should list audio formats.
- First real run: in the app use **Settings → Audio → Download missing audio** on a handful of tracks and watch **Progress** and `journalctl -u turbomusic`. Real yt-dlp has so far only been run against a fake script in testing.

## 5. HTTPS and reaching it away from home
The app talks plain HTTP on the LAN. That works for browsing, voting and editing, but browsers only allow installing the app and its offline shell (service workers) on **https or localhost**, and the Android app will want HTTPS for anything beyond the home network. The least-effort route is [Tailscale](https://tailscale.com/kb/1311/serve) (no port forwarding, no public exposure):
```
# on the Pi, once Tailscale is installed and logged in; enable HTTPS certificates for the tailnet in the admin console (DNS page)
sudo tailscale serve --bg 47813
tailscale serve status          # prints the https://<pi>.<tailnet>.ts.net URL
```
Open that URL on your phone (also on Tailscale). With this in place you can set `TURBOMUSIC_HOST=127.0.0.1` so the plain-HTTP port is not reachable on the LAN at all; the trade-off is that `http://<pi>:47813` stops working. Check `tailscale serve --help` on your version, the CLI changed in 1.52. Do not expose port 47813 to the public internet: the only protection is the token.

## 5b. Keeping the SD card healthy, and watching the Pi
An SD card dies from writes, not from age. What writes on this server and where it goes:
- **The library (`TURBOMUSIC_DATA_DIR`)**: database, audio, pictures, temporary downloads, the yt-dlp cache and Soloist's files all live under it. Put it on the external drive (section 1) and none of that touches the card. Settings → Server → **Server health** warns when it is on the system disk.
- **Already installed on the card?** Settings → **Server health → Storage locations** moves the library files, the temporary folder and the yt-dlp cache to another drive while the server runs (it copies and checks every file before switching, and leaves a link where the folder was). The database stays in the data folder: point `TURBOMUSIC_DATA_DIR` at the drive for that (stop the service, copy `turbomusic.db*`, change the unit).
- **yt-dlp's cache** used to go to `~/.cache` (the card). The server now passes `--cache-dir <data>/cache` itself, unless you set your own `--cache-dir` in `TURBOMUSIC_YTDLP_ARGS`.
- **Scratch space** (`TMPDIR`) of ffmpeg and yt-dlp is `<data>/tmp`, set by the server.
- **The system's own writing** (not TurboMusic's): keep logs in memory with `sudo mkdir -p /etc/systemd/journald.conf.d && printf '[Journal]\nStorage=volatile\nRuntimeMaxUse=50M\n' | sudo tee /etc/systemd/journald.conf.d/volatile.conf` (you lose logs at reboot), add `noatime` to the root line in `/etc/fstab`, and do not enable swap on the card (`sudo dphys-swapfile swapoff; sudo systemctl disable dphys-swapfile`).
- **Server health** (Settings): free space on every disk the server uses, CPU temperature and load, memory and swap, whether the power supply dipped (`vcgencmd get_throttled`), how fast the disk answers a 4 KB synced write, and the database size. It reads a few kernel files and writes 4 KB every 30 seconds at most, only while the page is open. Warnings are plain sentences; nothing is stored.
- **Copy the access token** from the Server card (Settings → Server), or use **Pair a device** to make a code or link that sets up another device (server address, access token and, if the server sits behind Cloudflare Access, the service token's client ID and secret).

## 6. Backups
- **Files** (`files/`) are immutable and content-addressed, so a plain `rsync -a /mnt/turbomusic/data/files/ <backup>/files/` is incremental and safe while running.
- **Database**: it is in WAL mode, so do not just copy `turbomusic.db` while the server runs. Either `sudo apt install sqlite3` and `sqlite3 /mnt/turbomusic/data/turbomusic.db ".backup '/backup/turbomusic.db'"` (consistent while running), or stop the service, copy `turbomusic.db*`, start it again.
- Also keep `token` if you want clients to keep working after a restore (or paste the new one).
- Every client holds a full copy of what it has synced, but a client that was never online after an edit cannot restore the server, so still back up.

## 7. Updating
**Short version:** see [UPDATING.md](UPDATING.md), one command from your login user. The step-by-step below is the same thing done by hand.

From your own computer, step by step:
```
# 1. log in to the Pi
ssh pi-admin@PI_ADDRESS

# 2. switch to the service user (same command as in section 2)
sudo -u turbomusic -H bash

# 3. FIRST TIME ONLY: get the code. Skip this if ~/turbomusic already exists.
git clone https://github.com/TurboNZL/turbomusic/ ~/turbomusic

# 4. update: stop the service, git pull, install, build the web client, start the service
cd ~/turbomusic
./scripts/update.sh
```
Notes:
- The folder is `~/turbomusic` (with a hyphen), the path the systemd unit in section 3 points at.
- The script prints every step and stops at the first failure; if that happens after the service was stopped, it stays stopped until you fix the problem and run the script again.
- It uses the nvm Node at `/home/turbomusic/.nvm/versions/node/v22.23.3/bin` (edit `NODE_BIN` in the script after a Node upgrade).
- The service (section 3) must already exist: the script only stops and starts it. On a brand-new Pi do sections 1 to 3 first.
- **The script calls `sudo systemctl`, and the `turbomusic` user has no sudo rights by default.** Either let it do exactly that and nothing else, once, from `pi-admin`:
  ```
  sudo visudo -f /etc/sudoers.d/turbomusic
  # contents (check the path with: command -v systemctl):
  turbomusic ALL=(root) NOPASSWD: /usr/bin/systemctl stop turbomusic, /usr/bin/systemctl start turbomusic, /usr/bin/systemctl is-active --quiet turbomusic
  ```
  or run the script as `pi-admin` with the repo owned by that user instead.
- Afterwards run `sudo yt-dlp -U` as `pi-admin` now and then; YouTube breaks old versions regularly.

Clients pick up the new web build on their next load (when online; the app shell is fetched fresh and cached for offline). **Settings → Server → Test connection** now shows whether the server can run yt-dlp and ffmpeg, so a missing install is visible before an import fails.

## Troubleshooting
- Service starts then exits: `journalctl -u turbomusic -n 50`. `Cannot find package '@hono/node-server'` means the install step was skipped or run as another user.
- `node:sqlite` not found: Node is older than 22.13 (`node -v` as the **service** user, not your login).
- Token rejected after moving the data dir: the token lives in `<data dir>/token`; set `TURBOMUSIC_TOKEN` to override.
- 404 at `/`: the web client was not built, or `TURBOMUSIC_WEB_DIR` points elsewhere.
- Downloads fail with "Sign in to confirm you're not a bot": see [YTDLP_COOKIES.md](YTDLP_COOKIES.md).
- Downloads fail with "yt-dlp not found": set `TURBOMUSIC_YTDLP`; with ffmpeg errors, set `TURBOMUSIC_FFMPEG_DIR` to the folder containing it.
