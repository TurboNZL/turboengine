#!/bin/sh
# TurboMusic Server (.deb): a system service that starts at boot. The library lives in /var/lib/turbomusic (move it with TURBOMUSIC_DATA_DIR in
# /etc/turbomusic/server.env). The access token is in /var/lib/turbomusic/token.
set -e
if ! id turbomusic >/dev/null 2>&1; then
  useradd --system --home-dir /var/lib/turbomusic --shell /usr/sbin/nologin turbomusic
fi
mkdir -p /etc/turbomusic
[ -f /etc/turbomusic/server.env ] || cat > /etc/turbomusic/server.env <<'EOF'
# Settings for the TurboMusic server service. Uncomment and edit, then: sudo systemctl restart turbomusic-server
#TURBOMUSIC_DATA_DIR=/var/lib/turbomusic
#TURBOMUSIC_PORT=47813
#TURBOMUSIC_HOST=0.0.0.0
EOF
cat > /lib/systemd/system/turbomusic-server.service <<'EOF'
[Unit]
Description=TurboMusic server
After=network-online.target
Wants=network-online.target

[Service]
User=turbomusic
Group=turbomusic
Environment=TURBOMUSIC_DATA_DIR=/var/lib/turbomusic
EnvironmentFile=-/etc/turbomusic/server.env
StateDirectory=turbomusic
ExecStart=/usr/bin/turbomusic-server
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
if [ -d /run/systemd/system ]; then
  systemctl daemon-reload
  systemctl enable turbomusic-server >/dev/null 2>&1 || true
  systemctl restart turbomusic-server || true
  echo "TurboMusic Server is running. Address and token: sudo journalctl -u turbomusic-server -n 20  (token file: /var/lib/turbomusic/token)"
fi
