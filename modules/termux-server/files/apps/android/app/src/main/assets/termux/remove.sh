# TurboMusic server module: stop and remove the program; the library (~/turbomusic-data) goes too only when asked.
pkill -f "$HOME/turbomusic-server/headless.mjs" 2>/dev/null || true
termux-wake-unlock 2>/dev/null || true
rm -rf "$HOME/turbomusic-server"
[ "@DELETE_LIBRARY@" = "1" ] && rm -rf "$HOME/turbomusic-data"
echo "[turbomusic] removed"
