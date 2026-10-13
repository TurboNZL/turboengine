import { app, BrowserWindow, clipboard, dialog, ipcMain, Menu, nativeImage, shell, Tray } from 'electron';
import { statfsSync, realpathSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../../../../packages/server/src/config.ts';
import { startServer, type Running } from '../../../../packages/server/src/start.ts';
import { moveStorage } from '../../../../packages/server/src/storage.ts';
import { findWebDir } from '../desktopConfig.ts';
import { Updates } from '../updater.ts';
import { folderPlan, lanUrls, loadServerConfig, pairCode, saveServerConfig, type ServerEditionConfig } from './serverConfig.ts';
import { installTool, isInstalled, pathWith, TOOLS, toolsDir, type InstallProgress } from './tools.ts';
import { Tunnel, type TunnelState } from './tunnel.ts';
import { userDataPath } from '../appName.ts';

/**
 * TurboMusic Server for Windows: the same server as the Pi runs, living in the system tray. No window while it works. The first start (and
 * "Setup and settings" in the tray menu) opens the wizard (setup.html): folders for each kind of data, network, YouTube tools, Spotify
 * options and the optional Cloudflare tunnel. It is Electron only for the tray icon and the wizard: the GPU is off and nothing is drawn
 * while the wizard is closed, so it idles at a small amount of memory and no CPU.
 */
const here = dirname(fileURLToPath(import.meta.url));
// the product name changed to TurboMusic; installed apps keep their settings folder (see appName.ts)
if (app.isPackaged) app.setPath('userData', userDataPath(app.getPath('appData'), 'server'));
const userData = () => app.getPath('userData');
app.disableHardwareAcceleration();
if (!app.requestSingleInstanceLock()) app.quit();
app.on('window-all-closed', () => { /* the tray keeps the server running */ });

let tray: Tray | null = null;
let wizard: BrowserWindow | null = null;
let running: Running | null = null;
let tunnelObj: Tunnel | null = null;
const updates = new Updates(app.isPackaged, () => rebuildTray(), 'server');

const cfg = (): ServerEditionConfig => loadServerConfig(userData());
const tools = (c = cfg()) => toolsDir(c.dataDir);
const addresses = (c = cfg()) => lanUrls(c.port, networkInterfaces() as never);
const baseUrl = (c = cfg()) => `http://127.0.0.1:${c.port}`;

function webDir() { return findWebDir(process.resourcesPath, join(here, '../../web/dist')); }

/** Link each folder the wizard chose in place of the one inside the data folder (a junction on Windows: no admin rights needed). */
function applyFolders(c: ServerEditionConfig) {
  const base = loadConfig({ CURATOR_DATA_DIR: c.dataDir }); // creates the data folder and its three subfolders
  for (const { kind, target } of folderPlan(c)) {
    let same = false;
    try { same = realpathSync(join(base.dataDir, kind)).toLowerCase() === resolve(target).toLowerCase(); } catch { /* not there yet */ }
    if (!same) moveStorage(base.dataDir, kind, target);
  }
}

async function startRuntime(): Promise<void> {
  const c = cfg();
  await stopRuntime();
  applyFolders(c);
  const t = tools(c);
  process.env.PATH = pathWith(t, process.env.PATH); // yt-dlp finds Deno and ffmpeg here
  const env: NodeJS.ProcessEnv = { ...process.env, CURATOR_DATA_DIR: c.dataDir, CURATOR_HOST: c.lan ? '0.0.0.0' : '127.0.0.1', CURATOR_PORT: String(c.port), CURATOR_WEB_DIR: webDir() ?? '', CURATOR_UPDATE: '0' };
  if (isInstalled(t, TOOLS[0])) env.CURATOR_YTDLP = join(t, 'yt-dlp.exe');
  if (isInstalled(t, TOOLS[1])) env.CURATOR_FFMPEG_DIR = t;
  try { running = await startServer(loadConfig(env)); }
  catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    throw new Error(code === 'EADDRINUSE' ? `Port ${c.port} is already in use by another program. Choose another port in the setup.` : `The server could not start: ${(e as Error).message}`);
  }
  app.setLoginItemSettings({ openAtLogin: c.startWithWindows, args: ['--hidden'] });
  if (c.tunnelOn && c.tunnelToken) startTunnel(c);
  rebuildTray();
}

async function stopRuntime() {
  tunnelObj?.stop();
  if (running) { await running.close().catch(() => undefined); running = null; }
}

function startTunnel(c: ServerEditionConfig) {
  tunnelObj?.stop();
  tunnelObj = new Tunnel(tools(c), (s: TunnelState) => { wizard?.webContents.send('setup:tunnel', s); rebuildTray(); });
  tunnelObj.start(c.tunnelToken, () => isInstalled(tools(c), TOOLS[3]));
}

// ---- tray ----
function statusLine(): string {
  if (!running) return 'Not running';
  const t = tunnelObj?.state;
  return `Running on port ${running.port}${t && t.status !== 'off' ? ` · tunnel ${t.status === 'connected' ? 'connected' : t.status === 'error' ? 'problem' : 'starting'}` : ''}`;
}

function rebuildTray() {
  if (!tray) return;
  const c = cfg(), us = updates.state;
  tray.setToolTip(`TurboMusic Server\n${statusLine()}`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: statusLine(), enabled: false },
    { type: 'separator' },
    { label: 'Open TurboMusic in the browser', enabled: !!running, click: () => openBrowser() },
    { label: 'Copy the address for other devices', enabled: !!running, click: () => clipboard.writeText(addresses(c)[0] ?? baseUrl(c)) },
    { label: 'Copy the access token', enabled: !!running, click: () => clipboard.writeText(running!.config.token) },
    { label: 'Show the library folder', enabled: !!running, click: () => void shell.openPath(c.dataDir) },
    { type: 'separator' },
    { label: 'Setup and settings…', click: () => openWizard() },
    ...(us.status === 'ready' ? [{ label: `Restart to update to ${us.version ?? 'the new version'}`, click: () => updates.install() }] : [{ label: us.status === 'downloading' ? `Downloading an update… ${us.percent ?? 0}%` : 'Check for updates', enabled: us.status !== 'downloading', click: () => void updates.check() }]),
    { label: 'Start with Windows', type: 'checkbox', checked: c.startWithWindows, click: (i) => { saveServerConfig(userData(), { startWithWindows: i.checked }); app.setLoginItemSettings({ openAtLogin: i.checked, args: ['--hidden'] }); } },
    { type: 'separator' },
    { label: 'Quit (stops the server)', click: () => { void stopRuntime().finally(() => app.exit(0)); } },
  ]));
}

function openBrowser() {
  if (!running) return;
  const c = cfg();
  void shell.openExternal(`${baseUrl(c)}/?pair=${encodeURIComponent(pairCode(baseUrl(c), running.config.token))}`);
}

// ---- wizard ----
function openWizard() {
  if (wizard) { wizard.show(); wizard.focus(); return; }
  wizard = new BrowserWindow({
    width: 880, height: 700, minWidth: 640, minHeight: 520, title: 'TurboMusic Server', backgroundColor: '#14141b', autoHideMenuBar: true, show: false,
    icon: join(here, '../build/icon-256.png'),
    webPreferences: { preload: join(here, 'setup-preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false },
  });
  wizard.removeMenu();
  wizard.once('ready-to-show', () => wizard?.show());
  wizard.webContents.setWindowOpenHandler(({ url }) => { if (/^https:/.test(url)) void shell.openExternal(url); return { action: 'deny' }; });
  wizard.webContents.on('will-navigate', (e) => e.preventDefault());
  wizard.on('closed', () => { wizard = null; });
  void wizard.loadFile(join(here, 'setup.html'));
}

const toolList = () => { const t = tools(); return TOOLS.map((x) => ({ id: x.id, label: x.label, why: x.why, installed: isInstalled(t, x) })); };

ipcMain.handle('setup:state', () => {
  const c = cfg();
  return { config: c, addresses: addresses(c), token: running?.config.token ?? '', running: !!running, tools: toolList(), tunnel: tunnelObj?.state ?? { status: 'off', message: 'Not running.' }, version: app.getVersion(), firstRun: !c.setupDone };
});
ipcMain.handle('setup:choose-folder', async (_e, title: unknown) => {
  const r = await dialog.showOpenDialog(wizard ?? undefined!, { title: typeof title === 'string' ? title : 'Choose a folder', properties: ['openDirectory', 'createDirectory'] });
  return r.canceled ? null : r.filePaths[0] ?? null;
});
ipcMain.handle('setup:free-space', (_e, p: unknown) => {
  try { const s = statfsSync(resolve(String(p))); return Number(s.bavail) * s.bsize; } catch { return null; }
});
ipcMain.handle('setup:save', (_e, patch: unknown) => {
  const p = (patch && typeof patch === 'object' ? patch : {}) as Partial<ServerEditionConfig>;
  const allowed: (keyof ServerEditionConfig)[] = ['dataDir', 'filesDir', 'tmpDir', 'cacheDir', 'port', 'lan', 'startWithWindows', 'tunnelToken', 'tunnelOn'];
  const clean: Partial<ServerEditionConfig> = {};
  for (const k of allowed) if (k in p) (clean as Record<string, unknown>)[k] = p[k];
  return saveServerConfig(userData(), clean);
});
ipcMain.handle('setup:install-tools', async (_e, ids: unknown) => {
  const want = TOOLS.filter((t) => Array.isArray(ids) && ids.includes(t.id));
  try {
    for (const t of want) await installTool(tools(), t, (p: InstallProgress) => wizard?.webContents.send('setup:progress', p));
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
});
ipcMain.handle('setup:finish', async () => {
  try {
    const c = cfg();
    if (c.tunnelOn && c.tunnelToken && !isInstalled(tools(c), TOOLS[3])) await installTool(tools(c), TOOLS[3], (p) => wizard?.webContents.send('setup:progress', p));
    saveServerConfig(userData(), { setupDone: true });
    await startRuntime();
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
});
ipcMain.on('setup:open', (_e, what: unknown) => {
  if (what === 'browser') openBrowser();
  else if (what === 'folder') void shell.openPath(cfg().dataDir);
  else if (typeof what === 'string' && /^https:\/\//.test(what)) void shell.openExternal(what);
});
ipcMain.on('setup:copy', (_e, text: unknown) => { if (typeof text === 'string' && text.length < 2000) clipboard.writeText(text); });

app.on('second-instance', () => openWizard());
void app.whenReady().then(async () => {
  const icon = nativeImage.createFromPath(join(here, '../build/icon-256.png')).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.on('double-click', () => (running ? openBrowser() : openWizard()));
  rebuildTray();
  updates.start();
  const c = cfg();
  if (!c.setupDone) { openWizard(); return; }
  try { await startRuntime(); } catch (e) { dialog.showErrorBox('TurboMusic Server cannot start', (e as Error).message); openWizard(); }
});
