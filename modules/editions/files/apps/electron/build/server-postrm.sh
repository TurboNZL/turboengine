#!/bin/sh
rm -f /lib/systemd/system/turbomusic-server.service
[ -d /run/systemd/system ] && systemctl daemon-reload >/dev/null 2>&1 || true
exit 0
