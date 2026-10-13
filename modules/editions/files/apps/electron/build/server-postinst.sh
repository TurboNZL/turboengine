#!/bin/sh
# TurboMusic Server (.deb): a system service that starts at boot. The library lives in /var/lib/music-curator (move it with CURATOR_DATA_DIR in
# /etc/music-curator/server.env). The access token is in /var/lib/music-curator/token.
set -e
if ! id music-curator >/dev/null 2>&1; then
  useradd --system --home-dir /var/lib/music-curator --shell /usr/sbin/nologin music-curator
fi
mkdir -p /etc/music-curator
[ -f /etc/music-curator/server.env ] || cat > /etc/music-curator/server.env <<'EOF'
# Settings for the TurboMusic server service. Uncomment and edit, then: sudo systemctl restart music-curator-server
#CURATOR_DATA_DIR=/var/lib/music-curator
#CURATOR_PORT=47813
#CURATOR_HOST=0.0.0.0
EOF
cat > /lib/systemd/system/music-curator-server.service <<'EOF'
[Unit]
Description=TurboMusic server
After=network-online.target
Wants=network-online.target

[Service]
User=music-curator
Group=music-curator
Environment=CURATOR_DATA_DIR=/var/lib/music-curator
EnvironmentFile=-/etc/music-curator/server.env
StateDirectory=music-curator
ExecStart=/usr/bin/music-curator-server
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
if [ -d /run/systemd/system ]; then
  systemctl daemon-reload
  systemctl enable music-curator-server >/dev/null 2>&1 || true
  systemctl restart music-curator-server || true
  echo "TurboMusic Server is running. Address and token: sudo journalctl -u music-curator-server -n 20  (token file: /var/lib/music-curator/token)"
fi
