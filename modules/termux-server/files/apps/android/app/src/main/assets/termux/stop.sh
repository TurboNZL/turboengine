# TurboMusic server module: stop the server.
pkill -f "$HOME/curator-server/headless.mjs" 2>/dev/null || true
termux-wake-unlock 2>/dev/null || true
echo "[curator] stopped"
