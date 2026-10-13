#!/usr/bin/env bash
# Update the Pi deployment: stop service, pull, install, build web client, restart.
# Run as the user that owns the checkout (e.g. curator). Needs sudo for systemctl unless root.
#   --live  leave the service alone (no sudo): used by the app's "Update server" button, which restarts the server itself afterwards.
set -euo pipefail

LIVE=0; [ "${1:-}" = "--live" ] && LIVE=1
SERVICE="${CURATOR_SERVICE:-curator}"
# Node: the one on PATH (the installer puts it in /usr/local/bin), else an nvm install of the service user. CURATOR_NODE_BIN overrides.
NODE_BIN="${CURATOR_NODE_BIN:-}"
if [ -z "$NODE_BIN" ]; then
  if command -v node >/dev/null 2>&1; then NODE_BIN="$(dirname "$(command -v node)")"
  else NODE_BIN="$(ls -d /home/curator/.nvm/versions/node/*/bin 2>/dev/null | sort -V | tail -1)"; fi
fi
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# pnpm is installed globally under the same nvm node, so it must be on PATH too.
export PATH="$NODE_BIN:$PATH"

SUDO=""
if [ "$(id -u)" -ne 0 ]; then SUDO="sudo"; fi

# Report which step failed (set -e exits right after this runs).
CURRENT_STEP="starting"
trap 'echo "FAILED during: $CURRENT_STEP" >&2' ERR

step() { CURRENT_STEP="$1"; echo; echo "==> $1"; }

[ -x "$NODE_BIN/node" ] || { echo "Node not found at $NODE_BIN/node" >&2; exit 1; }
cd "$REPO_DIR"

step "Using node $("$NODE_BIN/node" -v) in $REPO_DIR"

if [ "$LIVE" -eq 0 ]; then
  step "Stopping $SERVICE service"
  $SUDO systemctl stop "$SERVICE"
fi

step "Pulling latest code (git pull --ff-only)"
git pull --ff-only

step "Installing dependencies (pnpm install)"
pnpm install --ignore-scripts --filter @curator/core --filter @curator/server --filter @curator/web

step "Building web client"
pnpm --filter @curator/web build

if [ "$LIVE" -eq 0 ]; then
  step "Starting $SERVICE service"
  $SUDO systemctl start "$SERVICE"

  step "Checking $SERVICE is running"
  sleep 2
  $SUDO systemctl is-active --quiet "$SERVICE"

  echo
  echo "Update complete. $SERVICE is running."
else
  echo
  echo "Update complete. The server restarts to load it."
fi
