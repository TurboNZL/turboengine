#!/bin/sh
# stop the service before its files are removed (the library in /var/lib/music-curator is kept)
if [ -d /run/systemd/system ]; then
  systemctl stop music-curator-server >/dev/null 2>&1 || true
  systemctl disable music-curator-server >/dev/null 2>&1 || true
fi
exit 0
