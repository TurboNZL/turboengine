# TurboMusic server module: start the server and keep it running as this command (Termux keeps the command, and its notification, alive).
D="$HOME/turbomusic-server"
if [ ! -f "$D/headless.mjs" ]; then echo "[turbomusic] the server is not installed"; exit 2; fi
pkill -f "$D/headless.mjs" 2>/dev/null || true
[ "@WAKE@" = "1" ] && termux-wake-lock
export TURBOMUSIC_DATA_DIR="$HOME/turbomusic-data"
export TURBOMUSIC_PORT=@PORT@
export TURBOMUSIC_HOST=0.0.0.0
export TURBOMUSIC_TOKEN='@TOKEN@'
export TURBOMUSIC_WEB_DIR="$D/web"
export TURBOMUSIC_YTDLP_ARGS="--js-runtimes node"
export TMPDIR="$HOME/turbomusic-data/tmp"
mkdir -p "$TMPDIR"
cd "$D"
exec node "$D/headless.mjs"
