#!/bin/sh
# stop the service before its files are removed (the library in /var/lib/turbomusic is kept)
if [ -d /run/systemd/system ]; then
  systemctl stop turbomusic-server >/dev/null 2>&1 || true
  systemctl disable turbomusic-server >/dev/null 2>&1 || true
fi
exit 0
