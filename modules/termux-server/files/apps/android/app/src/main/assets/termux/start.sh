# TurboMusic server module: start the server and keep it running as this command (Termux keeps the command, and its notification, alive).
D="$HOME/curator-server"
if [ ! -f "$D/headless.mjs" ]; then echo "[curator] the server is not installed"; exit 2; fi
pkill -f "$D/headless.mjs" 2>/dev/null || true
[ "@WAKE@" = "1" ] && termux-wake-lock
export CURATOR_DATA_DIR="$HOME/curator-data"
export CURATOR_PORT=@PORT@
export CURATOR_HOST=0.0.0.0
export CURATOR_TOKEN='@TOKEN@'
export CURATOR_WEB_DIR="$D/web"
export CURATOR_YTDLP_ARGS="--js-runtimes node"
export TMPDIR="$HOME/curator-data/tmp"
mkdir -p "$TMPDIR"
cd "$D"
exec node "$D/headless.mjs"
