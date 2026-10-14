#!/bin/sh
# yt-dlp breaks whenever YouTube changes; its standalone build updates itself, so every start asks for the newest one (quietly, and a failure does not stop the server).
yt-dlp -U >/dev/null 2>&1 || true
exec "$@"
