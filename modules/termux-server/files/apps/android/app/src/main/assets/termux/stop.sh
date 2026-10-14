# TurboMusic server module: stop the server.
pkill -f "$HOME/turbomusic-server/headless.mjs" 2>/dev/null || true
termux-wake-unlock 2>/dev/null || true
echo "[turbomusic] stopped"
