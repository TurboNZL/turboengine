# TurboMusic server module: stop and remove the program; the library (~/curator-data) goes too only when asked.
pkill -f "$HOME/curator-server/headless.mjs" 2>/dev/null || true
termux-wake-unlock 2>/dev/null || true
rm -rf "$HOME/curator-server"
[ "@DELETE_LIBRARY@" = "1" ] && rm -rf "$HOME/curator-data"
echo "[curator] removed"
