import { autoUpdater } from 'electron-updater';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import { debInstallScript, describePkexec, hasNoNewPrivs, NO_NEW_PRIVS_MESSAGE, outsideTree, installedMatches, manualInstallCommand, TERMINALS, terminalInstallScript } from './debInstall.ts';
import { describeError } from './updateErrors.ts';

export type { UpdateState } from './updateErrors.ts';
import type { UpdateState } from './updateErrors.ts';

/**
 * Self-update from the project's GitHub releases (electron-updater): checks shortly after start and every 6 hours, downloads in the
 * background and installs when the app is closed or when the user presses "Restart to update". Does nothing in development runs.
 */
export const REPO = { owner: 'TurboNZL', repo: 'TurboMusic' };

export class Updates {
  state: UpdateState = { status: 'idle' };
  private started = false;
  private debFile: string | null = null;
  private installing = false;
  constructor(private readonly packaged: boolean, private readonly onState: (s: UpdateState) => void, private readonly channel?: string) {}

  /** A GitHub token with read access to the repository's contents: needed only while the repository is private. Empty clears it. */
  setToken(token: string) {
    const t = token.trim();
    if (t) autoUpdater.setFeedURL({ provider: 'github', ...REPO, private: true, token: t });
    else autoUpdater.setFeedURL({ provider: 'github', ...REPO });
  }

  private set(s: UpdateState) { this.state = s; this.onState(s); }

  start() {
    if (this.started) return; this.started = true;
    if (!this.packaged) { this.set({ status: 'disabled', message: 'Updates work in the installed app, not in a development run.' }); return; }
    // the project's releases are often marked pre-release, which the default "latest stable" lookup ignores
    autoUpdater.allowPrerelease = true;
    if (this.channel) autoUpdater.channel = this.channel; // the server edition has its own update feed (server.yml), apart from the desktop app's latest.yml
    autoUpdater.autoDownload = true;
    // a .deb install needs root, which electron-updater asks for with a blocking pkexec call (it freezes the app and fails
    // without a polkit agent), also when quitting. Those installs are done by install() below instead; AppImage, Windows and macOS are unchanged.
    autoUpdater.autoInstallOnAppQuit = !this.isDeb();
    autoUpdater.on('checking-for-update', () => this.set({ status: 'checking' }));
    autoUpdater.on('update-not-available', () => this.set({ status: 'none' }));
    autoUpdater.on('update-available', (i) => this.set({ status: 'downloading', version: i.version, percent: 0 }));
    autoUpdater.on('download-progress', (p) => this.set({ status: 'downloading', version: this.state.version, percent: Math.round(p.percent) }));
    autoUpdater.on('update-downloaded', (i) => { this.debFile = i.downloadedFile ?? null; this.set({ status: 'ready', version: i.version }); });
    autoUpdater.on('error', (e) => this.set(describeError(e?.message ?? String(e))));
    setTimeout(() => void this.check(), 15_000);
    setInterval(() => void this.check(), 6 * 3600_000).unref();
  }

  async check(): Promise<UpdateState> {
    if (!this.packaged) return this.state;
    if (this.state.status === 'downloading' || this.state.status === 'ready') return this.state;
    try { await autoUpdater.checkForUpdates(); } catch (e) { this.set(describeError((e as Error).message)); }
    return this.state;
  }

  /** electron-builder writes the package type (deb, rpm, ...) next to the app; an AppImage has none and needs no root. */
  private isDeb(): boolean {
    if (process.platform !== 'linux' || process.env.APPIMAGE) return false;
    try { return readFileSync(join(process.resourcesPath, 'package-type'), 'utf8').trim() === 'deb'; } catch { return false; }
  }

  install() {
    if (this.state.status !== 'ready' || this.installing) return;
    if (this.isDeb() && this.debFile && existsSync(this.debFile)) void this.installDeb(this.debFile);
    else autoUpdater.quitAndInstall(false, true);
  }

  /** pkexec runs in the background, so the window stays alive while the password prompt is open; the app restarts only once dpkg succeeded. */
  private async installDeb(file: string) {
    const version = this.state.version;
    // sudo and pkexec both fail in a process started with no_new_privs, and so does anything it launches (a terminal window): do not even try
    let status = '';
    try { status = readFileSync('/proc/self/status', 'utf8'); } catch { /* not Linux or unreadable: try the normal way */ }
    const sealed = hasNoNewPrivs(status);
    if (sealed) {
      // the terminal has to be started by the user's systemd manager, outside this process tree, or its sudo is refused too
      this.installing = true;
      this.set({ status: 'ready', version, installing: true, message: 'A terminal window will ask for your password…' });
      const ran = await this.installInTerminal(file, true);
      if (ran && this.installedVersion() === version) { this.installing = false; app.relaunch(); app.exit(0); return; }
      this.installing = false;
      this.set({ status: 'ready', version, message: NO_NEW_PRIVS_MESSAGE, command: manualInstallCommand(file) });
      return;
    }
    this.installing = true;
    this.set({ status: 'ready', version, installing: true, message: 'Waiting for your password…' });
    const result = await new Promise<ReturnType<typeof describePkexec>>((resolve) => {
      let err = '';
      const child = spawn('pkexec', ['/bin/sh', '-c', debInstallScript(file)], { stdio: ['ignore', 'ignore', 'pipe'] });
      child.stderr.on('data', (d) => { err += String(d); });
      child.on('error', (e) => resolve({ ok: false, cancelled: false, message: `pkexec could not be started (${e.message}). Install it from a terminal instead:` }));
      child.on('close', (code) => resolve(describePkexec(code, err)));
    });
    // No password prompt on this desktop (no polkit agent): do the same install in a terminal window with sudo instead of giving up.
    if (!result.ok && !result.cancelled) {
      this.set({ status: 'ready', version, installing: true, message: 'No password prompt is available, so a terminal window will ask for your password…' });
      const ran = await this.installInTerminal(file);
      if (ran && this.installedVersion() === version) { this.installing = false; app.relaunch(); app.exit(0); return; }
      this.installing = false;
      this.set({ status: 'ready', version, message: ran ? 'The terminal closed before the update was installed. Install it from a terminal instead:' : `${result.message}${' (The AppImage build updates itself without ever asking for a password.)'}`, command: manualInstallCommand(file) });
      return;
    }
    this.installing = false;
    if (result.ok) { app.relaunch(); app.exit(0); return; }
    this.set({ status: 'ready', version, message: result.message });
  }

  /** The version dpkg reports for this app, or '' when it cannot be read. */
  private installedVersion(): string {
    try { return execFileSync('dpkg-query', ['-W', '-f=${Version}', 'music-curator'], { encoding: 'utf8' }).trim(); } catch { return ''; }
  }

  /** Runs the install in the first terminal emulator that exists; resolves true when one opened and has closed again. */
  private async installInTerminal(file: string, outside = false): Promise<boolean> {
    const script = terminalInstallScript(file);
    for (const t of TERMINALS) {
      const opened = await new Promise<boolean>((resolve) => {
        let started = false;
        const run = outside ? outsideTree(t.bin, t.args(script)) : { bin: t.bin, args: t.args(script) };
        const child = spawn(run.bin, run.args, { stdio: 'ignore' });
        child.on('spawn', () => { started = true; });
        child.on('error', () => resolve(false));
        child.on('close', () => resolve(started));
      });
      if (opened) return true;
    }
    return false;
  }
}
