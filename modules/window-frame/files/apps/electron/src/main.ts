import { app, BrowserWindow, dialog, ipcMain, Menu, session, shell } from 'electron';
import { makeRule, withAccess, type AccessRule } from './accessHeaders.ts';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../../../packages/server/src/config.ts';
import { startServer } from '../../../packages/server/src/start.ts';
import { startStaticServer } from '../../../packages/server/src/staticServer.ts';
import { readFileSync, rmSync } from 'node:fs';
import { BUILT_IN_DISCORD_CLIENT_ID, findWebDir, loadDesktopConfig, loadDiscordConfig, loadUpdateToken, saveUpdateToken, saveDesktopConfig, saveDiscordConfig } from './desktopConfig.ts';
import { DiscordPresence, findSockets, type Presence } from './discord.ts';
import { Updates } from './updater.ts';
import { describeGraphics, type Graphics } from './graphics.ts';
import { activeMode, GPU_MODES, nextAutoStep } from './gpuModes.ts';

/**
 * The desktop app runs the same server as the Raspberry Pi, inside the app, on 127.0.0.1, with the library in a folder of the
 * user's choice, and shows the web client from it. Everything the web client does works unchanged: it keeps its working copy in
 * the window's storage and syncs with this server, or (Settings > Server) with another one, such as the Pi.
 */
const here = dirname(fileURLToPath(import.meta.url));
/** What the window talks to: the full edition's own library server, or (app edition) just the web client's files. */
type Local = { port: number; close(): Promise<void>; config: { dataDir: string; token: string } };
let server: Local | null = null;
/** "full" (window + library server) or "app" (window only; the library is on a server). electron-builder writes it into package.json for the app edition. */
const edition: 'full' | 'app' = (() => {
  if (process.env.CURATOR_EDITION === 'app') return 'app';
  try { return (JSON.parse(readFileSync(join(app.getAppPath(), 'package.json'), 'utf8')) as { curatorEdition?: string }).curatorEdition === 'app' ? 'app' : 'full'; } catch { return 'full'; }
})();
let win: BrowserWindow | null = null;
const discord = new DiscordPresence();
const updates = new Updates(app.isPackaged, (state) => win?.webContents.send('curator:update', state));

// the desktop file's name is the window's identity on Wayland (its app id): without this the launcher's icon and the window do not match
if (process.platform === 'linux') app.setDesktopName(edition === 'app' ? 'music-curator-app.desktop' : 'music-curator.desktop');

if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

// let the sound keep going when the window is hidden, and let the keyboard's media keys reach the page (MPRIS on Linux)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
const gpuChoice = loadDesktopConfig(app.getPath('userData'));
const gpuStart = activeMode(gpuChoice.gpuMode === 'auto' && gpuChoice.gpuAuto.done ? { mode: 'auto', auto: { step: gpuChoice.gpuAuto.step, done: true } } : { mode: gpuChoice.gpuMode, auto: gpuChoice.gpuAuto }, process.env.XDG_SESSION_TYPE);
if (process.platform === 'linux') {
  // Chromium's block list leaves GPU painting off on many Linux drivers, which shows as "not using the GPU renderer": ask for it (a driver
  // that really cannot do it still falls back by itself, graphics() below reports what happened, and "Automatic" then tries the next way
  // to start the graphics: X11 instead of Wayland, no GPU sandbox, ANGLE's OpenGL; see gpuModes.ts)
  app.commandLine.appendSwitch('enable-features', ['MediaSessionService', 'HardwareMediaKeyHandling', ...(gpuStart.features ?? [])].join(','));
  // Chromium on Wayland cannot use Vulkan ("--ozone-platform=wayland is not compatible with Vulkan"); with --ignore-gpu-blocklist it still tried on NVIDIA,
  // the GPU process failed and painting fell back to software. The modes name their ANGLE back end (OpenGL ES over EGL on Wayland); Vulkan stays
  // off except in the one mode that asks for it (which runs through X11).
  if (!gpuStart.features?.includes('Vulkan')) app.commandLine.appendSwitch('disable-features', 'Vulkan');
  if (gpuStart.software) app.disableHardwareAcceleration();
  else for (const [name, value] of gpuStart.switches) app.commandLine.appendSwitch(name, value);
}
// escape hatch for a driver that crashes the GPU process: CURATOR_SOFTWARE_RENDERING=1 pnpm --filter @curator/electron start
if (process.env.CURATOR_SOFTWARE_RENDERING) app.disableHardwareAcceleration();
let gpuCrashes = 0;
app.on('child-process-gone', (_e, d) => { if (d.type === 'GPU') { gpuCrashes++; console.warn(`[curator] the GPU process stopped (${d.reason}, code ${d.exitCode}); crash ${gpuCrashes}`); } });

async function graphics(): Promise<Graphics> {
  const info = (await app.getGPUInfo('complete').catch(() => app.getGPUInfo('basic').catch(() => null))) as { auxAttributes?: { glRenderer?: string; glImplementationParts?: string }; gpuDevice?: { vendorId?: number }[] } | null;
  return describeGraphics({
    features: app.getGPUFeatureStatus() as unknown as Record<string, string>,
    renderer: info?.auxAttributes?.glRenderer ?? '',
    glParts: info?.auxAttributes?.glImplementationParts ?? '',
    vendorIds: (info?.gpuDevice ?? []).map((d) => d.vendorId ?? 0),
  }, gpuCrashes);
}

const userData = () => app.getPath('userData');
/** the server module is on when the user installed it, or by default in the full edition */
const serverModuleOn = (saved: boolean | undefined) => saved ?? edition === 'full';

async function boot(): Promise<void> {
  const desk = loadDesktopConfig(userData());
  const webDir = findWebDir(process.resourcesPath, join(here, '../../web/dist'));
  if (!webDir) throw new Error('The web client has not been built. Run `pnpm --filter @curator/web build` first.');
  // the app edition's port is one above the full edition's, so both can be installed (and the window's storage stays put when the module is added or removed)
  const port = process.env.CURATOR_DESKTOP_PORT || edition === 'full' ? desk.port : desk.port + 1;
  if (!serverModuleOn(desk.serverModule)) { const s = await startStaticServer(webDir, port); server = { port: s.port, close: s.close, config: { dataDir: '', token: '' } }; return; }
  const config = loadConfig({ ...process.env, CURATOR_DATA_DIR: desk.dataDir, CURATOR_HOST: '127.0.0.1', CURATOR_PORT: String(port), CURATOR_WEB_DIR: webDir });
  try { server = await startServer(config); }
  catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    throw new Error(code === 'EADDRINUSE'
      ? `Port ${desk.port} is already in use. Close whatever uses it, or set CURATOR_DESKTOP_PORT to another port (the app remembers its data per port).`
      : `The library could not be opened in ${desk.dataDir}: ${(e as Error).message}`);
  }
}

function openWindow() {
  const custom = loadDesktopConfig(userData()).customFrame;
  win = new BrowserWindow({
    frame: !custom, autoHideMenuBar: true,
    width: 1360, height: 860, minWidth: 420, minHeight: 560, backgroundColor: '#0b0b10', show: false, title: 'Music Curator',
    icon: join(here, '../build/icon.png'),
    webPreferences: { preload: join(here, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false, spellcheck: false },
  });
  win.removeMenu();
  win.once('ready-to-show', () => win?.show());
  win.on('maximize', () => win?.webContents.send('curator:window-state', true));
  win.on('unmaximize', () => win?.webContents.send('curator:window-state', false));
  shortcuts(win);
  const origin = `http://127.0.0.1:${server!.port}`;
  // anything that is not this app opens in the user's browser instead of inside the app
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) void shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(origin)) { e.preventDefault(); if (/^https?:/.test(url)) void shell.openExternal(url); } });
  win.on('closed', () => { win = null; });
  // the GPU process starts lazily: look a moment after the page is up, and say it in the terminal if the app is painting in software
  win.webContents.once('did-finish-load', () => setTimeout(() => void graphics().then((g) => console.log(`[curator] graphics: ${g.summary}${g.hardware ? '' : '. If your computer has a GPU, see docs/development/ELECTRON.md (Graphics).'}`)), 2500));
  void win.loadURL(origin);
}

function chooseFolder(): Promise<string | null> {
  return dialog.showOpenDialog(win ?? undefined!, { title: 'Choose the library folder', properties: ['openDirectory', 'createDirectory'], defaultPath: server?.config.dataDir })
    .then(async (r) => {
      const dir = r.filePaths[0];
      if (r.canceled || !dir || dir === server?.config.dataDir) return null;
      saveDesktopConfig(userData(), { dataDir: dir });
      const ok = await dialog.showMessageBox({ type: 'info', buttons: ['Restart now', 'Later'], defaultId: 0, message: 'Library folder changed',
        detail: `The app will use ${dir} after it restarts. The library that is in the old folder is not moved: copy its contents over to keep it, or sync it from your server.` });
      if (ok.response === 0) { app.relaunch(); app.quit(); }
      return dir;
    });
}

ipcMain.on('curator:info', (e) => {
  e.returnValue = { customFrame: loadDesktopConfig(userData()).customFrame, token: server?.config.token ?? '', version: app.getVersion(), dataDir: server?.config.dataDir ?? '', edition, serverModule: serverModuleOn(loadDesktopConfig(userData()).serverModule), platform: process.platform, desktopEnv: process.env.XDG_CURRENT_DESKTOP ?? '', port: server?.port ?? 0 };
});
// the Cloudflare Access service token rides on every request to the library server (see accessHeaders.ts), so audio and covers stream directly
let accessRule: AccessRule | null = null;
ipcMain.on('curator:access', (_e, serverUrl: unknown, id: unknown, secret: unknown) => {
  accessRule = makeRule(serverUrl, id, secret);
  const ses = session.defaultSession;
  if (!accessRule) { ses.webRequest.onBeforeSendHeaders(null); return; }
  ses.webRequest.onBeforeSendHeaders({ urls: [`${accessRule.origin}/*`] }, (details, cb) => cb({ requestHeaders: withAccess(accessRule, details.url, details.requestHeaders) as Record<string, string> }));
});
ipcMain.handle('curator:graphics', () => graphics());
ipcMain.handle('curator:gpu-get', () => { const c = loadDesktopConfig(userData()); return { mode: c.gpuMode, auto: c.gpuAuto, running: gpuStart.id, modes: GPU_MODES.map(({ id, label, hint }) => ({ id, label, hint })) }; });
ipcMain.handle('curator:gpu-report', async () => {
  const g = await graphics();
  const info = await app.getGPUInfo('complete').catch(() => null);
  return JSON.stringify({ summary: g.summary, detail: g.detail, features: g.features, gpuCrashes: g.gpuCrashes, mode: gpuStart.id, electron: process.versions.electron, chrome: process.versions.chrome, session: { type: process.env.XDG_SESSION_TYPE, desktop: process.env.XDG_CURRENT_DESKTOP, display: process.env.DISPLAY, wayland: process.env.WAYLAND_DISPLAY }, gpuInfo: info }, null, 2);
});
ipcMain.on('curator:gpu-page', () => { const w = new BrowserWindow({ width: 1000, height: 800, title: 'Chromium GPU report' }); void w.loadURL('chrome://gpu'); });
ipcMain.handle('curator:gpu-set', (_e, mode: unknown) => {
  const id = typeof mode === 'string' && (mode === 'auto' || GPU_MODES.some((m) => m.id === mode)) ? mode : 'auto';
  saveDesktopConfig(userData(), { gpuMode: id, gpuAuto: { step: 0, done: false } });
  app.relaunch(); app.exit(0);
});
ipcMain.handle('curator:choose-folder', () => chooseFolder());
/** Install or remove the server module (this app's own library server). Removing keeps the library files unless the user says to delete them; both restart the app. */
ipcMain.handle('curator:server-module', async (_e, on: unknown) => {
  const desk = loadDesktopConfig(userData());
  if (on === true) {
    const r = await dialog.showMessageBox(win ?? undefined!, { type: 'question', buttons: ['Install', 'Cancel'], defaultId: 0, cancelId: 1, message: 'Install the server module?',
      detail: `This app will run its own library server and keep your library in ${desk.dataDir} (change the folder later in Settings > This app). The app restarts.` });
    if (r.response !== 0) return false;
    saveDesktopConfig(userData(), { serverModule: true });
  } else {
    const r = await dialog.showMessageBox(win ?? undefined!, { type: 'warning', buttons: ['Remove, keep my library files', 'Remove and delete my library files', 'Cancel'], defaultId: 0, cancelId: 2,
      message: 'Remove the server module?', detail: `The app stops running its own server and goes back to connecting to one you choose (Settings > Server). The library in ${desk.dataDir} is kept unless you choose to delete it. The app restarts.` });
    if (r.response === 2) return false;
    if (r.response === 1) {
      const sure = await dialog.showMessageBox(win ?? undefined!, { type: 'warning', buttons: ['Delete the library', 'Cancel'], defaultId: 1, cancelId: 1, message: 'Delete the library files?', detail: `Everything in ${desk.dataDir} is removed for good: the database, the audio and the pictures. This cannot be undone.` });
      if (sure.response !== 0) return false;
      await server?.close(); closing = true; server = null;
      rmSync(desk.dataDir, { recursive: true, force: true });
    }
    saveDesktopConfig(userData(), { serverModule: false });
  }
  app.relaunch(); app.exit(0);
  return true;
});
const discordInfo = () => ({ ...loadDiscordConfig(userData()), builtIn: !!BUILT_IN_DISCORD_CLIENT_ID, status: discord.status, detail: discord.detail, sockets: findSockets() });
ipcMain.on('curator:presence', (_e, p: Presence | null) => {
  if (p && (typeof p.title !== 'string' || typeof p.artist !== 'string')) return;
  discord.update(p ? { title: p.title, artist: p.artist, album: String(p.album ?? ''), duration: Number(p.duration) || 0, position: Number(p.position) || 0, playing: !!p.playing } : null);
});
ipcMain.handle('curator:discord-get', () => discordInfo());
ipcMain.handle('curator:discord-set', (_e, patch: { discordEnabled?: boolean; discordClientId?: string }) => {
  saveDiscordConfig(userData(), { ...(typeof patch.discordEnabled === 'boolean' ? { discordEnabled: patch.discordEnabled } : {}), ...(typeof patch.discordClientId === 'string' ? { discordClientId: patch.discordClientId.trim() } : {}) });
  const c = loadDiscordConfig(userData());
  discord.configure(c.discordClientId, c.discordEnabled);
  return discordInfo();
});
ipcMain.handle('curator:update-has-token', () => !!loadUpdateToken(userData()));
ipcMain.handle('curator:update-set-token', (_e, t: unknown) => { const v = typeof t === 'string' ? t.trim() : ''; saveUpdateToken(userData(), v); updates.setToken(v); });
ipcMain.handle('curator:update-state', () => updates.state);
ipcMain.handle('curator:update-check', () => updates.check());
ipcMain.on('curator:update-install', () => updates.install());
ipcMain.on('curator:window', (e, action: string) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (!w) return;
  if (action === 'minimize') w.minimize();
  else if (action === 'maximize') { if (w.isMaximized()) w.unmaximize(); else w.maximize(); }
  else if (action === 'close') w.close();
});
ipcMain.handle('curator:set-frame', async (_e, on: unknown) => {
  saveDesktopConfig(userData(), { customFrame: on === true });
  const r = await dialog.showMessageBox({ type: 'info', buttons: ['Restart now', 'Later'], defaultId: 0, message: 'Window style changed', detail: 'The new window style applies after the app restarts.' });
  if (r.response === 0) { app.relaunch(); app.quit(); }
});
ipcMain.handle('curator:show-folder', () => { if (server) void shell.openPath(server.config.dataDir); });

/** There is no menu bar (everything it held is in Settings); the shortcuts people expect from it still work. */
function shortcuts(w: BrowserWindow) {
  w.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    const mod = input.control || input.meta;
    const wc = w.webContents;
    const key = input.key.toLowerCase();
    const stop = () => e.preventDefault();
    if (mod && key === 'r') { stop(); if (input.shift) wc.reloadIgnoringCache(); else wc.reload(); }
    else if (key === 'f5') { stop(); wc.reload(); }
    else if (mod && input.shift && key === 'i') { stop(); wc.toggleDevTools(); }
    else if (key === 'f12') { stop(); wc.toggleDevTools(); }
    else if (key === 'f11') { stop(); w.setFullScreen(!w.isFullScreen()); }
    else if (mod && (key === '=' || key === '+')) { stop(); wc.setZoomLevel(wc.getZoomLevel() + 0.5); }
    else if (mod && key === '-') { stop(); wc.setZoomLevel(wc.getZoomLevel() - 0.5); }
    else if (mod && key === '0') { stop(); wc.setZoomLevel(0); }
  });
}

let closing = false;
app.on('before-quit', (e) => {
  if (closing || !server) return;
  e.preventDefault(); closing = true;
  void Promise.allSettled([discord.stop(), server.close()]).finally(() => app.exit(0));
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!win && server) openWindow(); });

void app.whenReady().then(async () => {
  try { await boot(); } catch (e) { dialog.showErrorBox('Music Curator cannot start', (e as Error).message); app.exit(1); return; }
  Menu.setApplicationMenu(null);
  openWindow();
  const dc = loadDiscordConfig(userData());
  discord.configure(dc.discordClientId, dc.discordEnabled);
  updates.setToken(loadUpdateToken(userData()));
  updates.start();
  void settleGraphics();
});

/**
 * Automatic mode: a few seconds after the window opened, see whether Chromium really got the GPU. If not, remember the next way to start
 * the graphics and restart (at most once per start, and only until every mode has been tried); if yes, remember that one and stop looking.
 */
async function settleGraphics() {
  const c = loadDesktopConfig(userData());
  if (process.platform !== 'linux' || c.gpuMode !== 'auto' || c.gpuAuto.done || process.env.CURATOR_SOFTWARE_RENDERING) return;
  await new Promise((r) => setTimeout(r, 6000));
  const g = await graphics();
  const next = nextAutoStep({ mode: 'auto', auto: c.gpuAuto }, g.hardware && g.gpuCrashes === 0, process.env.XDG_SESSION_TYPE);
  console.log(`[curator] graphics (${gpuStart.id}): ${g.summary}${next.done ? ' - settled' : ' - trying the next mode'}`);
  saveDesktopConfig(userData(), { gpuAuto: { step: next.step, done: next.done } });
  if (next.relaunch) { app.relaunch(); app.exit(0); }
}
