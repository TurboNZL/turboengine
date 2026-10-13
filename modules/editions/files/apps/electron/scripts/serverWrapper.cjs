// electron-builder afterPack for the Linux server edition. The packaged program is the Electron binary, which needs a display; as a server it must
// start without one. A small launcher takes the program's name and starts the real binary as plain Node (ELECTRON_RUN_AS_NODE) on the bundled
// script, so the same files serve the .deb (a systemd service) and the AppImage, and nothing has to be installed first (Electron 44 brings Node 24
// with node:sqlite).
const { renameSync, writeFileSync, chmodSync } = require('node:fs');
const { join } = require('node:path');

const SCRIPT = `#!/bin/sh
# Music Curator Server: runs the bundled server as plain Node. See --help.
DIR="$(dirname "$(readlink -f "$0")")"
export ELECTRON_RUN_AS_NODE=1
export CURATOR_WEB_DIR="\${CURATOR_WEB_DIR:-$DIR/resources/web}"
exec "$DIR/music-curator-server.bin" "$DIR/resources/app/dist/headless.mjs" "$@"
`;

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'linux') return;
  const exe = join(context.appOutDir, context.packager.executableName || 'music-curator-server');
  renameSync(exe, `${exe}.bin`);
  writeFileSync(exe, SCRIPT);
  chmodSync(exe, 0o755);
};
