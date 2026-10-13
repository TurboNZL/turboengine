#!/usr/bin/env bash
# Install the TurboMusic home server on a Raspberry Pi (or any Debian/Ubuntu Linux machine), start it, and print how to connect.
#
#   curl -fsSL https://raw.githubusercontent.com/TurboNZL/turbomusic/main/scripts/install-pi.sh | sudo bash -s -- --data-dir /mnt/music/curator
#   sudo ./scripts/install-pi.sh --help
#
# Safe to run again: it updates what is there. Nothing is installed outside the folders and files named in the summary it prints first.
set -euo pipefail

USER_NAME="curator"; DATA_DIR=""; PORT="47813"; REPO="https://github.com/TurboNZL/turbomusic.git"; BRANCH="main"
DRY=0; YES=0; YTDLP=1

usage() { cat <<USAGE
Usage: install-pi.sh [options]
  --data-dir PATH   where your library lives (database, music, pictures). Put it on the external drive, not the SD card.
                    Default: /var/lib/curator (that IS the SD card on a Pi, and you will be asked to confirm)
  --port N          port of the server (default $PORT)
  --user NAME       the system user that runs the server (default $USER_NAME)
  --repo URL        where to download TurboMusic from (default $REPO)
  --branch NAME     branch to install (default $BRANCH)
  --no-ytdlp        do not install yt-dlp (no YouTube import or audio download)
  --dry-run         print what would be done, change nothing
  --yes             do not ask questions
USAGE
}
while [ $# -gt 0 ]; do
  case "$1" in
    --data-dir) DATA_DIR="${2:?--data-dir needs a path}"; shift 2 ;;
    --port) PORT="${2:?--port needs a number}"; shift 2 ;;
    --user) USER_NAME="${2:?--user needs a name}"; shift 2 ;;
    --repo) REPO="${2:?--repo needs a URL}"; shift 2 ;;
    --branch) BRANCH="${2:?--branch needs a name}"; shift 2 ;;
    --no-ytdlp) YTDLP=0; shift ;;
    --dry-run) DRY=1; shift ;;
    --yes|-y) YES=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

say()  { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
note() { printf '    %s\n' "$*"; }
die()  { printf '\n\033[31mStopped: %s\033[0m\n' "$*" >&2; exit 1; }
run()  { if [ "$DRY" = 1 ]; then printf '    [dry run] %s\n' "$*"; else "$@"; fi; }
as_user() { if [ "$DRY" = 1 ]; then printf '    [dry run] as %s: %s\n' "$USER_NAME" "$*"; else sudo -u "$USER_NAME" -H bash -c "$*"; fi; }

if [ "$DRY" = 0 ] && [ "$(id -u)" -ne 0 ]; then die "run this as root: sudo ./scripts/install-pi.sh (or put sudo before bash in the one-line command)"; fi
[ "$(uname -s)" = "Linux" ] || die "this installer is for Linux (a Raspberry Pi, or a Debian/Ubuntu machine)."
command -v apt-get >/dev/null 2>&1 || [ "$DRY" = 1 ] || die "this installer uses apt (Raspberry Pi OS, Debian, Ubuntu). On another system follow docs/guides/DEPLOY_PI.md by hand."

case "$(uname -m)" in
  aarch64|arm64) NODE_ARCH="arm64";  YTDLP_FILE="yt-dlp_linux_aarch64" ;;
  armv7l)        NODE_ARCH="armv7l"; YTDLP_FILE="yt-dlp_linux_armv7l" ;;
  x86_64|amd64)  NODE_ARCH="x64";    YTDLP_FILE="yt-dlp_linux" ;;
  *) die "no build of Node for this processor: $(uname -m)" ;;
esac

[ -n "$DATA_DIR" ] || DATA_DIR="/var/lib/curator"
case "$DATA_DIR" in /*) ;; *) die "--data-dir must be a full path starting with /" ;; esac
HOME_DIR="/home/$USER_NAME"; APP_DIR="$HOME_DIR/music-curator"

# is the data folder on the same disk as the operating system? (the SD card, on a Pi)
on_system_disk() {
  local probe="$DATA_DIR"; while [ ! -e "$probe" ] && [ "$probe" != "/" ]; do probe="$(dirname "$probe")"; done
  [ "$(stat -c %d "$probe")" = "$(stat -c %d /)" ]
}

say "TurboMusic home server"
note "user: $USER_NAME     app: $APP_DIR     library: $DATA_DIR     port: $PORT"
if on_system_disk; then
  note "WARNING: $DATA_DIR is on the same disk as the operating system. On a Raspberry Pi that is the SD card:"
  note "music will fill it, and constant writes wear it out. Plug in a drive, mount it, and run this again with --data-dir /mnt/yourdrive/curator."
  if [ "$YES" = 0 ] && [ "$DRY" = 0 ]; then
    if [ -r /dev/tty ]; then read -r -p "    Continue anyway? [y/N] " ans < /dev/tty; [[ "$ans" =~ ^[Yy] ]] || die "cancelled. Nothing was changed."; else die "re-run with --yes to accept, or choose --data-dir on another drive."; fi
  fi
fi

say "1/8 System packages (git, curl, ffmpeg)"
run apt-get update -y
run env DEBIAN_FRONTEND=noninteractive apt-get install -y git curl ca-certificates xz-utils ffmpeg

say "2/8 Node.js 22 (the server needs 22.13 or newer)"
node_ok() { command -v node >/dev/null 2>&1 && node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>22||(a===22&&b>=13)?0:1)'; }
if node_ok; then note "found $(node -v), keeping it"; else
  if [ "$DRY" = 1 ]; then note "[dry run] download the newest Node 22 for $NODE_ARCH from nodejs.org, check its sha256, unpack to /opt, link node/npm/npx into /usr/local/bin"; else
    base="https://nodejs.org/dist/latest-v22.x"; sums="$(curl -fsSL "$base/SHASUMS256.txt")"
    line="$(printf '%s\n' "$sums" | grep -E "node-v22\.[0-9.]+-linux-$NODE_ARCH\.tar\.xz$" | head -1)"; [ -n "$line" ] || die "could not find a Node 22 download for $NODE_ARCH"
    file="${line##* }"; want="${line%% *}"; tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
    note "downloading $file"; curl -fsSL "$base/$file" -o "$tmp/$file"
    got="$(sha256sum "$tmp/$file" | cut -d' ' -f1)"; [ "$got" = "$want" ] || die "the Node download is damaged (checksum mismatch). Try again."
    dest="/opt/${file%.tar.xz}"; mkdir -p /opt; rm -rf "$dest"; tar -xJf "$tmp/$file" -C /opt
    for b in node npm npx corepack; do [ -e "$dest/bin/$b" ] && ln -sf "$dest/bin/$b" "/usr/local/bin/$b"; done
    note "installed $(node -v)"
  fi
fi
if command -v pnpm >/dev/null 2>&1; then note "pnpm $(pnpm -v) found"; else
  run npm install -g pnpm@10
  if [ "$DRY" = 0 ]; then pnpm_bin="$(dirname "$(readlink -f "$(command -v node)")")/pnpm"; [ -e "$pnpm_bin" ] && ln -sf "$pnpm_bin" /usr/local/bin/pnpm; fi
fi

say "3/8 The service user and the library folder"
if id "$USER_NAME" >/dev/null 2>&1; then note "user $USER_NAME exists"; else run useradd --system --create-home --shell /usr/sbin/nologin "$USER_NAME"; fi
run mkdir -p "$DATA_DIR"
run chown -R "$USER_NAME:$USER_NAME" "$DATA_DIR"

say "4/8 Downloading TurboMusic"
if [ -d "$APP_DIR/.git" ]; then as_user "cd '$APP_DIR' && git fetch --depth 1 origin '$BRANCH' && git checkout -q '$BRANCH' && git reset -q --hard FETCH_HEAD"
else as_user "git clone --depth 1 --branch '$BRANCH' '$REPO' '$APP_DIR'"; fi

say "5/8 Building (this takes a few minutes on a Pi)"
as_user "cd '$APP_DIR' && pnpm install --ignore-scripts --filter @curator/core --filter @curator/server --filter @curator/web && pnpm --filter @curator/web build"

say "6/8 yt-dlp (YouTube import and audio download)"
if [ "$YTDLP" = 0 ]; then note "skipped (--no-ytdlp)"; else
  run curl -fsSL "https://github.com/yt-dlp/yt-dlp/releases/latest/download/$YTDLP_FILE" -o /usr/local/bin/yt-dlp
  run chmod a+rx /usr/local/bin/yt-dlp
  if [ ! -e /etc/yt-dlp.conf ]; then
    if [ "$DRY" = 1 ]; then note "[dry run] write /etc/yt-dlp.conf with: --js-runtimes node"; else printf -- '--js-runtimes node\n' > /etc/yt-dlp.conf; fi
  fi
  # YouTube breaks old yt-dlp versions every few weeks: keep it current by itself
  if [ "$DRY" = 1 ]; then note "[dry run] write curator-ytdlp-update.service and .timer (weekly: yt-dlp -U)"; else
    cat > /etc/systemd/system/curator-ytdlp-update.service <<UNIT
[Unit]
Description=Update yt-dlp for TurboMusic
[Service]
Type=oneshot
ExecStart=/usr/local/bin/yt-dlp -U
UNIT
    cat > /etc/systemd/system/curator-ytdlp-update.timer <<UNIT
[Unit]
Description=Weekly yt-dlp update for TurboMusic
[Timer]
OnCalendar=weekly
RandomizedDelaySec=6h
Persistent=true
[Install]
WantedBy=timers.target
UNIT
  fi
fi

say "7/8 The service"
NODE_PATH_BIN="$(command -v node 2>/dev/null || echo /usr/local/bin/node)"
MOUNT_LINE=""; case "$DATA_DIR" in /var/lib/*|/home/*) ;; *) MOUNT_LINE="RequiresMountsFor=$DATA_DIR" ;; esac
if [ "$DRY" = 1 ]; then note "[dry run] write /etc/systemd/system/curator.service (user $USER_NAME, node $NODE_PATH_BIN, data $DATA_DIR, port $PORT)"; else
  cat > /etc/systemd/system/curator.service <<UNIT
[Unit]
Description=TurboMusic server
After=network-online.target
Wants=network-online.target
$MOUNT_LINE

[Service]
User=$USER_NAME
WorkingDirectory=$APP_DIR/packages/server
Environment=CURATOR_DATA_DIR=$DATA_DIR
Environment=CURATOR_PORT=$PORT
Environment=PATH=/usr/local/bin:/usr/bin:/bin
ExecStart=$NODE_PATH_BIN --experimental-strip-types --disable-warning=ExperimentalWarning src/index.ts
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT
  # the "Update server" button and scripts/update.sh may stop and start the service, and nothing else
  SC="$(command -v systemctl)"
  printf '%s ALL=(root) NOPASSWD: %s stop curator, %s start curator, %s is-active --quiet curator\n' "$USER_NAME" "$SC" "$SC" "$SC" > /etc/sudoers.d/curator
  chmod 440 /etc/sudoers.d/curator
  if ! visudo -cf /etc/sudoers.d/curator >/dev/null; then rm -f /etc/sudoers.d/curator; note "could not set up passwordless restart for updates (skipped)"; fi
fi
run systemctl daemon-reload
run systemctl enable --now curator
[ "$YTDLP" = 0 ] || run systemctl enable --now curator-ytdlp-update.timer

say "8/8 Checking it answers"
if [ "$DRY" = 1 ]; then note "[dry run] wait for http://127.0.0.1:$PORT/api/health"; else
  ok=0; for _ in $(seq 1 40); do if curl -fsS "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then ok=1; break; fi; sleep 1; done
  [ "$ok" = 1 ] || die "the server did not start. Look at: journalctl -u curator -n 50"
  TOKEN="$(cat "$DATA_DIR/token" 2>/dev/null || echo '(see journalctl -u curator)')"
  printf '\n\033[1m\033[32mDone. TurboMusic is running.\033[0m\n\n'
  note "Open it in a browser on any device on your network:"
  for ip in $(hostname -I 2>/dev/null); do case "$ip" in *:*) ;; *) note "    http://$ip:$PORT" ;; esac; done
  note "    http://$(hostname).local:$PORT"
  note ""
  note "Token (paste it in Settings > Library & server, or on the first screen of the app):"
  note "    $TOKEN"
  note ""
  note "Update later with:  sudo -u $USER_NAME -H $APP_DIR/scripts/update.sh      (or the Update server button in Settings)"
  note "Logs:               journalctl -u curator -f"
  note "Spotify Soloist:    needs a sound server first:  sudo $APP_DIR/scripts/setup-pi-audio.sh --user $USER_NAME"
  note "Next steps:         docs/guides/GETTING_STARTED.md"
fi
