// Self-update for the desktop shell: electron-updater with a .deb path that works without a polkit agent.
// Vanilla (CommonJS) counterpart of the engine's `updaters` module (apps/electron/src/updater.ts); the install rules are in debInstall.cjs.
const { app, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const deb = require('./debInstall.cjs');

/** The package name electron-builder gives the .deb (the npm package name); dpkg-query uses it to confirm an install. */
const DEB_PACKAGE = 'turbocut';

/**
 * Self-update from GitHub Releases (electron-updater): the Windows installer, the Linux AppImage and the Linux .deb.
 * The portable .exe cannot replace itself; for that the app falls back to the download page.
 * A .deb install needs root, so it is not left to electron-updater (its blocking pkexec call freezes the app and fails
 * without a polkit agent): `installDeb` below asks for the password asynchronously, falls back to a terminal window
 * running sudo, and only restarts once dpkg reports the new version. Rules and reasons: the engine's `updaters` module.
 */
function setupUpdater(getWindow) {
  let updater = null;
  let debFile = null;
  let wantedVersion = '';
  let installing = false;
  const isDeb = () => {
    if (process.platform !== 'linux' || process.env.APPIMAGE || !app.isPackaged) return false;
    try {
      return fs.readFileSync(path.join(process.resourcesPath, 'package-type'), 'utf8').trim() === 'deb';
    } catch {
      return false;
    }
  };
  const unsupported = () => {
    if (!app.isPackaged) return 'This is a development run, not an installed app.';
    if (process.env.PORTABLE_EXECUTABLE_DIR) return 'The portable version cannot update itself. Download the new file instead.';
    if (process.platform === 'linux' && !process.env.APPIMAGE && !isDeb()) return 'Only the AppImage and the .deb update themselves. Download the new package.';
    return null;
  };
  const get = () => {
    if (updater) return updater;
    ({ autoUpdater: updater } = require('electron-updater'));
    updater.autoDownload = false;
    updater.allowPrerelease = true; // test builds are published as pre-releases
    updater.autoInstallOnAppQuit = false; // a .deb would ask for a password while quitting
    updater.on('download-progress', (p) => getWindow()?.webContents.send('updater:progress', Math.round(p.percent)));
    updater.on('update-downloaded', (info) => {
      debFile = info.downloadedFile ?? null;
      wantedVersion = info.version;
    });
    return updater;
  };

  /** The version dpkg reports for this app, or '' when it cannot be read. */
  const installedVersion = () => {
    try {
      return execFileSync('dpkg-query', ['-W', '-f=${Version}', DEB_PACKAGE], { encoding: 'utf8' }).trim();
    } catch {
      return '';
    }
  };

  /** Runs the install in the first terminal emulator that exists; resolves true when one opened and has closed again. */
  const installInTerminal = async (file, outside) => {
    const script = deb.terminalInstallScript(file);
    for (const t of deb.TERMINALS) {
      const opened = await new Promise((resolve) => {
        let started = false;
        const run = outside ? deb.outsideTree(t.bin, t.args(script)) : { bin: t.bin, args: t.args(script) };
        const child = spawn(run.bin, run.args, { stdio: 'ignore' });
        child.on('spawn', () => (started = true));
        child.on('error', () => resolve(false));
        child.on('close', () => resolve(started));
      });
      if (opened) return true;
    }
    return false;
  };

  const restart = () => {
    app.relaunch();
    app.exit(0);
  };

  /** Resolves { ok: true } (the app restarts) or { ok: false, message, command } for the Settings card to show. */
  const installDeb = async (file) => {
    const command = deb.manualInstallCommand(file);
    let status = '';
    try {
      status = fs.readFileSync('/proc/self/status', 'utf8');
    } catch {
      /* unreadable: try the normal way */
    }
    // sudo and pkexec both fail in a process started with no_new_privs, and so does anything it launches (a terminal window):
    // the terminal has to be started by the user's systemd manager, outside this process tree.
    if (deb.hasNoNewPrivs(status)) {
      const ran = await installInTerminal(file, true);
      if (ran && deb.installedMatches(installedVersion(), wantedVersion)) return restart(), { ok: true };
      return { ok: false, message: deb.NO_NEW_PRIVS_MESSAGE, command };
    }
    const result = await new Promise((resolve) => {
      let err = '';
      const child = spawn('pkexec', ['/bin/sh', '-c', deb.debInstallScript(file)], { stdio: ['ignore', 'ignore', 'pipe'] });
      child.stderr.on('data', (d) => (err += String(d)));
      child.on('error', (e) => resolve({ ok: false, cancelled: false, message: `pkexec could not be started (${e.message}). Install it from a terminal instead:` }));
      child.on('close', (code) => resolve(deb.describePkexec(code, err)));
    });
    if (result.ok) return restart(), { ok: true };
    if (result.cancelled) return { ok: false, message: result.message };
    // No password prompt on this desktop (no polkit agent): the same install in a terminal window with sudo instead of giving up.
    const ran = await installInTerminal(file, false);
    if (ran && deb.installedMatches(installedVersion(), wantedVersion)) return restart(), { ok: true };
    return { ok: false, message: ran ? 'The terminal closed before the update was installed. Install it from a terminal instead:' : `${result.message} (The AppImage build updates itself without ever asking for a password.)`, command };
  };

  ipcMain.handle('updater:check', async () => {
    const reason = unsupported();
    if (reason) return { supported: false, reason };
    try {
      const r = await get().checkForUpdates();
      return { supported: true, version: r?.updateInfo?.version };
    } catch (e) {
      const message = String(e && e.message ? e.message : e);
      return { supported: false, reason: deb.isStillBuilding(message) ? 'A new release was just published and its installers are still being built. Try again in a few minutes.' : message };
    }
  });
  ipcMain.handle('updater:download', async () => {
    await get().downloadUpdate();
  });
  ipcMain.handle('updater:install', async () => {
    if (isDeb() && debFile && fs.existsSync(debFile)) {
      if (installing) return { ok: false, message: 'An install is already running.' };
      installing = true;
      try {
        return await installDeb(debFile);
      } finally {
        installing = false;
      }
    }
    get().quitAndInstall(false, true);
    return { ok: true };
  });
}

module.exports = { setupUpdater };
