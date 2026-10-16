#!/usr/bin/env bash
# TurboMusic server, self-contained: ONE folder holds the program, its own Node, ffmpeg, yt-dlp and (by default) the library.
# Nothing is installed system-wide and nothing needs root, so with --root on your big drive the root drive stays untouched
# (apart from one small link that starts the server at boot, see the end of this script).
#
#   curl -fsSL https://raw.githubusercontent.com/TurboNZL/turbomusic/main/scripts/install-server.sh | bash -s -- --root /mnt/data/turbomusic
#
# Run it as the account that should own the library (not as root). Running it again repairs missing parts and never changes the
# server version: updating is the "Update server" button in the app's Settings (or the same command with --update).
#
#   --root DIR        the install folder (required), e.g. /mnt/data/turbomusic
#   --data-dir DIR    where the library lives (default: DIR/data). Point it at an existing library folder to keep it.
#   --port N          default 47813
#   --no-service      do not set up the start-at-boot service
#   --update          also fetch the newest server bundle now (a re-run otherwise keeps the installed version)
#   --allow-root-drive  allow --root on the same drive as /
#   --token T         a read-only GitHub token (only while the repository is private)
#   --bundle-file F --version V   use a server bundle you already have (offline installs, tests)
#   --dry-run         say what would be done
set -euo pipefail

ROOT=""; DATA=""; PORT="47813"; SERVICE=1; DRY=0; UPDATE=0; ALLOW_ROOT=0; TOKEN_ARG=""; BUNDLE_FILE=""; VERSION_ARG=""
REPO="TurboNZL/turbomusic"
say() { printf '\n== %s\n' "$*"; }
note() { printf '   %s\n' "$*"; }
die() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }
run() { if [ "$DRY" = 1 ]; then printf '   [dry-run] %s\n' "$*"; else "$@"; fi; }

while [ $# -gt 0 ]; do
  case "$1" in
    --root) ROOT="${2:?--root needs a folder}"; shift 2 ;;
    --data-dir) DATA="${2:?--data-dir needs a folder}"; shift 2 ;;
    --port) PORT="${2:?--port needs a number}"; shift 2 ;;
    --no-service) SERVICE=0; shift ;;
    --update) UPDATE=1; shift ;;
    --allow-root-drive) ALLOW_ROOT=1; shift ;;
    --token) TOKEN_ARG="${2:?--token needs a value}"; shift 2 ;;
    --bundle-file) BUNDLE_FILE="${2:?--bundle-file needs a file}"; shift 2 ;;
    --version) VERSION_ARG="${2:?--version needs a value}"; shift 2 ;;
    --dry-run) DRY=1; shift ;;
    -h|--help) sed -n '2,22p' "$0"; exit 0 ;;
    *) die "unknown option: $1 (try --help)" ;;
  esac
done

[ -n "$ROOT" ] || die "--root is required, for example: --root /mnt/data/turbomusic"
case "$ROOT" in /*) ;; *) die "--root must be a full path starting with /" ;; esac
[ "$(id -u)" != 0 ] || die "run this as the account that should own the library, not as root (nothing here needs root)"
for c in curl tar xz sha256sum; do command -v "$c" >/dev/null 2>&1 || die "'$c' is missing. On Debian/Ubuntu/Raspberry Pi OS: sudo apt install curl xz-utils (tar and sha256sum come with the system)."; done

case "$(uname -m)" in
  x86_64|amd64) NODE_ARCH="x64"; FF_ARCH="linux64"; YT="yt-dlp_linux" ;;
  aarch64|arm64) NODE_ARCH="arm64"; FF_ARCH="linuxarm64"; YT="yt-dlp_linux_aarch64" ;;
  *) die "unsupported processor: $(uname -m) (64-bit Intel/AMD and 64-bit ARM, such as a Raspberry Pi 4/5 with a 64-bit OS, are supported)" ;;
esac

[ -n "$DATA" ] || DATA="$ROOT/data"
case "$DATA" in /*) ;; *) die "--data-dir must be a full path starting with /" ;; esac

# --- the root drive guard: the whole point is to keep everything on the big drive
mkdir -p "$ROOT" 2>/dev/null || { [ "$DRY" = 1 ] || die "cannot create $ROOT. Create it once with: sudo mkdir -p $ROOT && sudo chown $USER $ROOT"; }
if [ -d "$ROOT" ] && [ "$ALLOW_ROOT" != 1 ] && [ "$(stat -c %d "$ROOT")" = "$(stat -c %d /)" ]; then
  die "$ROOT is on the same drive as the system (/). You asked for the big drive: is it mounted? Check with: findmnt /mnt/data. (Use --allow-root-drive if you really want this.)"
fi
[ "$DRY" = 1 ] || [ -w "$ROOT" ] || die "$ROOT is not writable for $USER: sudo chown -R $USER $ROOT"
say "TurboMusic server -> $ROOT   (library: $DATA, port $PORT)"
run mkdir -p "$ROOT/tools" "$ROOT/releases" "$ROOT/.dl" "$DATA"
[ "$DRY" = 1 ] || [ -w "$DATA" ] || die "the library folder $DATA is not writable for $USER. If an older install owns it: sudo chown -R $USER $DATA"

TMP="$ROOT/.dl"   # downloads are kept on the same drive too
dl() { run curl -fsSL --retry 3 --connect-timeout 20 -o "$1" "$2"; }

# --- Node (its own copy, so the server never depends on the system's)
if [ -x "$ROOT/node/bin/node" ]; then note "Node: already here ($("$ROOT/node/bin/node" --version))"; else
  say "Node 22"
  if [ "$DRY" = 1 ]; then note "[dry-run] would download the newest Node 22 for $NODE_ARCH from nodejs.org and check its checksum"; else
    SUMS="$TMP/node-sums.txt"; dl "$SUMS" "https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt"
    LINE="$(grep -E "node-v22\.[0-9.]+-linux-$NODE_ARCH\.tar\.gz\$" "$SUMS" | head -1)"; [ -n "$LINE" ] || die "could not find a Node 22 download for $NODE_ARCH"
    FILE="${LINE##* }"; SUM="${LINE%% *}"
    dl "$TMP/$FILE" "https://nodejs.org/dist/latest-v22.x/$FILE"
    [ "$(sha256sum "$TMP/$FILE" | cut -d' ' -f1)" = "$SUM" ] || die "the Node download is damaged (checksum differs); run again"
    mkdir -p "$ROOT/node" && tar -xzf "$TMP/$FILE" -C "$ROOT/node" --strip-components=1 && rm -f -- "${TMP:?}/$FILE"
    note "Node $("$ROOT/node/bin/node" --version) installed"
  fi
fi

# --- ffmpeg + ffprobe (static builds)
if [ -x "$ROOT/tools/ffmpeg" ] && [ -x "$ROOT/tools/ffprobe" ]; then note "ffmpeg: already here"; else
  say "ffmpeg"
  if [ "$DRY" = 1 ]; then note "[dry-run] would download a static ffmpeg for $FF_ARCH from github.com/yt-dlp/FFmpeg-Builds and check its checksum"; else
    FF="ffmpeg-master-latest-$FF_ARCH-gpl.tar.xz"; BASE="https://github.com/yt-dlp/FFmpeg-Builds/releases/latest/download"
    dl "$TMP/ff-sums.txt" "$BASE/checksums.sha256"; dl "$TMP/$FF" "$BASE/$FF"
    WANT="$(grep " $FF\$" "$TMP/ff-sums.txt" | cut -d' ' -f1)"; [ -n "$WANT" ] || die "no checksum listed for $FF"
    [ "$(sha256sum "$TMP/$FF" | cut -d' ' -f1)" = "$WANT" ] || die "the ffmpeg download is damaged (checksum differs); run again"
    tar -xJf "$TMP/$FF" -C "$ROOT/tools" --wildcards '*/bin/ffmpeg' '*/bin/ffprobe' --strip-components=2
    rm -f -- "${TMP:?}/$FF"; chmod 755 "$ROOT/tools/ffmpeg" "$ROOT/tools/ffprobe"
    note "ffmpeg installed"
  fi
fi

# --- yt-dlp (updates itself every time the server starts)
if [ -x "$ROOT/tools/yt-dlp" ]; then note "yt-dlp: already here"; else
  say "yt-dlp"
  dl "$ROOT/tools/yt-dlp" "https://github.com/yt-dlp/yt-dlp/releases/latest/download/$YT"
  run chmod 755 "$ROOT/tools/yt-dlp"
fi

# --- the server bundle (headless.mjs + web/)
CURRENT=""; if [ -L "$ROOT/app" ]; then CURRENT="$(basename "$(readlink "$ROOT/app")")"; fi
if [ -n "$CURRENT" ] && [ "$UPDATE" != 1 ] && [ -z "$BUNDLE_FILE" ]; then note "TurboMusic: version $CURRENT is installed (use the app's Update server button, or --update)"; else
  say "TurboMusic server bundle"
  if [ "$DRY" = 1 ]; then note "[dry-run] would download the newest release's server bundle from github.com/$REPO and unpack it into $ROOT/releases/"; else
    CLEAN=0
    if [ -n "$BUNDLE_FILE" ]; then VER="${VERSION_ARG:?--bundle-file needs --version}"; FILE="$BUNDLE_FILE"; else
      HDR=(-H "Accept: application/vnd.github+json"); if [ -n "$TOKEN_ARG" ]; then HDR+=(-H "Authorization: Bearer $TOKEN_ARG"); fi
      curl -fsSL "${HDR[@]}" "https://api.github.com/repos/$REPO/releases?per_page=20" -o "$TMP/releases.json" || die "GitHub does not show $REPO (a private repository needs --token)"
      PICK="$("$ROOT/node/bin/node" -e '
        const r=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).filter(x=>!x.draft);
        const num=t=>t.replace(/^v/,"").split(".").map(Number);
        const cmp=(a,b)=>{const x=num(a),y=num(b);for(let i=0;i<4;i++){const d=(y[i]||0)-(x[i]||0);if(d)return d}return 0};
        for(const x of r.sort((a,b)=>cmp(a.tag_name,b.tag_name))){const a=(x.assets||[]).find(a=>/^turbomusic-server-.*-(node|termux)\.tar\.gz$/.test(a.name));
          if(a){console.log([x.tag_name.replace(/^v/,""),a.name,process.argv[2]?a.url:a.browser_download_url,(a.digest||"").replace(/^sha256:/,"")].join(" "));break}}' "$TMP/releases.json" "$TOKEN_ARG")"
      [ -n "$PICK" ] || die "no release has a server bundle yet. Wait for the next release, or use --bundle-file."
      read -r VER NAME URL DIGEST <<<"$PICK"; FILE="$TMP/$NAME"; CLEAN=1
      note "version $VER"
      if [ -n "$TOKEN_ARG" ]; then curl -fsSL --retry 3 -H "Accept: application/octet-stream" -H "Authorization: Bearer $TOKEN_ARG" -o "$FILE" "$URL"; else curl -fsSL --retry 3 -o "$FILE" "$URL"; fi
      if [ -n "$DIGEST" ]; then [ "$(sha256sum "$FILE" | cut -d' ' -f1)" = "$DIGEST" ] || die "the server bundle is damaged (checksum differs); run again"; fi
    fi
    rm -rf -- "${ROOT:?}/releases/.new" "${ROOT:?}/releases/${VER:?}"; mkdir -p "$ROOT/releases/.new"
    tar -xzf "$FILE" -C "$ROOT/releases/.new"
    [ -f "$ROOT/releases/.new/headless.mjs" ] && [ -f "$ROOT/releases/.new/web/index.html" ] || die "that is not a TurboMusic server bundle"
    mv "$ROOT/releases/.new" "$ROOT/releases/$VER"
    ln -sfn "releases/$VER" "$ROOT/app.tmp" && mv -T "$ROOT/app.tmp" "$ROOT/app"
    if [ "$CLEAN" = 1 ]; then rm -f -- "$FILE"; fi
    note "installed $VER"
  fi
fi

# --- settings, start script, service file (settings.env is written once; your edits to it are kept)
if [ "$DRY" != 1 ]; then
  if [ ! -f "$ROOT/settings.env" ]; then
    cat > "$ROOT/settings.env" <<ENV
# TurboMusic server settings. Plain KEY=VALUE lines; restart the server after changing them.
TURBOMUSIC_DATA_DIR=$DATA
TURBOMUSIC_PORT=$PORT
# Reachable from your network (0.0.0.0) or only from this machine (127.0.0.1, e.g. when only a tunnel should reach it):
TURBOMUSIC_HOST=0.0.0.0
# YouTube asks some servers to prove they are not a bot: a cookies file from a signed-in browser answers it.
#TURBOMUSIC_YTDLP_COOKIES=$DATA/cookies.txt
# Only while the GitHub repository is private (the in-app update then needs to read its releases):
#TURBOMUSIC_GITHUB_TOKEN=
ENV
  fi
  cat > "$ROOT/run.sh" <<'RUN'
#!/bin/sh
# Starts TurboMusic from this folder only (nothing outside it is used). Settings are in settings.env next to this file.
ROOT="$(cd "$(dirname "$0")" && pwd)"
[ -f "$ROOT/settings.env" ] && { set -a; . "$ROOT/settings.env"; set +a; }
export PATH="$ROOT/node/bin:$ROOT/tools:$PATH"
export TURBOMUSIC_INSTALL_ROOT="$ROOT"
export TURBOMUSIC_DATA_DIR="${TURBOMUSIC_DATA_DIR:-$ROOT/data}"
export TURBOMUSIC_WEB_DIR="$ROOT/app/web"
export TURBOMUSIC_YTDLP="$ROOT/tools/yt-dlp"
export TURBOMUSIC_FFMPEG_DIR="$ROOT/tools"
export TURBOMUSIC_YTDLP_ARGS="--js-runtimes node ${TURBOMUSIC_YTDLP_ARGS:-}"
export TURBOMUSIC_VERSION="$(basename "$(readlink "$ROOT/app")")"
mkdir -p "$TURBOMUSIC_DATA_DIR/tmp" "$TURBOMUSIC_DATA_DIR/cache"
export TMPDIR="$TURBOMUSIC_DATA_DIR/tmp" XDG_CACHE_HOME="$TURBOMUSIC_DATA_DIR/cache"
# yt-dlp breaks whenever YouTube changes; it updates itself (quietly, in the background, a failure changes nothing)
( "$ROOT/tools/yt-dlp" -U >/dev/null 2>&1 || true ) &
exec "$ROOT/node/bin/node" --disable-warning=ExperimentalWarning "$ROOT/app/headless.mjs"
RUN
  chmod 755 "$ROOT/run.sh"
  cat > "$ROOT/turbomusic.service" <<UNIT
[Unit]
Description=TurboMusic server
After=network-online.target

[Service]
# if the drive is not mounted yet, this fails and the service tries again in 10 seconds
ExecStartPre=/bin/sh -c 'test -x "$ROOT/run.sh"'
ExecStart=$ROOT/run.sh
Restart=always
RestartSec=10

[Install]
WantedBy=default.target
UNIT
fi

# --- start at boot: a user service whose file lives in the install folder (one small link is all that touches the root drive)
STARTED=0
if [ "$SERVICE" = 1 ]; then
  say "Service"
  if [ "$DRY" = 1 ]; then note "[dry-run] would link $ROOT/turbomusic.service as a user service, enable it and turn on lingering"
  elif command -v systemctl >/dev/null 2>&1 && systemctl --user show-environment >/dev/null 2>&1; then
    systemctl --user link "$ROOT/turbomusic.service" >/dev/null 2>&1 || true
    systemctl --user daemon-reload
    systemctl --user enable turbomusic.service >/dev/null 2>&1 || true
    systemctl --user restart turbomusic.service && STARTED=1
    if loginctl enable-linger "$USER" >/dev/null 2>&1; then note "starts at boot, even when nobody is logged in"; else note "To start at boot without anyone logged in, run once:  sudo loginctl enable-linger $USER"; fi
  else
    note "No user service manager here (no login session with systemd). Start it with: $ROOT/run.sh"
    note "To keep it running without a terminal:  nohup $ROOT/run.sh >/dev/null 2>&1 &"
  fi
fi

say "Done"
if [ "$DRY" != 1 ]; then
  if [ "$STARTED" = 1 ]; then for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do [ -s "$DATA/token" ] && break; sleep 1; done; fi
  IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
  note "Open:   http://${IP:-<this machine>}:$PORT"
  if [ -s "$DATA/token" ]; then note "Token:  $(cat "$DATA/token")   (also in $DATA/token)"; else note "The token appears in $DATA/token when the server first starts."; fi
  note "Update: Settings -> Update server in the app (nothing to do here)"
  note "Logs:   journalctl --user -u turbomusic -n 50"
fi
