import { contextBridge, ipcRenderer } from 'electron';

/**
 * What the web client may know about the desktop app. `token` lets a fresh install connect to its own server without typing
 * anything; the other calls open the folder dialogs, which only the main process can do.
 */
const info = ipcRenderer.sendSync('turbomusic:info') as { token: string; version: string; dataDir: string; platform: string; desktopEnv: string; port: number; customFrame: boolean; edition: 'full' | 'app'; serverModule: boolean };

contextBridge.exposeInMainWorld('turbomusicDesktop', {
  ...info,
  setServerModule: (on: boolean) => ipcRenderer.invoke('turbomusic:server-module', on) as Promise<boolean>,
  chooseLibraryFolder: () => ipcRenderer.invoke('turbomusic:choose-folder') as Promise<string | null>,
  setAccess: (serverUrl: string, id: string, secret: string) => ipcRenderer.send('turbomusic:access', serverUrl, id, secret),
  setPresence: (p: unknown) => ipcRenderer.send('turbomusic:presence', p),
  getDiscord: () => ipcRenderer.invoke('turbomusic:discord-get') as Promise<unknown>,
  setDiscord: (patch: unknown) => ipcRenderer.invoke('turbomusic:discord-set', patch) as Promise<unknown>,
  updates: {
    state: () => ipcRenderer.invoke('turbomusic:update-state') as Promise<unknown>,
    hasToken: () => ipcRenderer.invoke('turbomusic:update-has-token') as Promise<boolean>,
    setToken: (t: string) => ipcRenderer.invoke('turbomusic:update-set-token', t) as Promise<void>,
    check: () => ipcRenderer.invoke('turbomusic:update-check') as Promise<unknown>,
    install: () => ipcRenderer.send('turbomusic:update-install'),
    onState: (cb: (s: unknown) => void) => { const h = (_e: unknown, s: unknown) => cb(s); ipcRenderer.on('turbomusic:update', h); return () => { ipcRenderer.removeListener('turbomusic:update', h); }; },
  },
  getGpu: () => ipcRenderer.invoke('turbomusic:gpu-get') as Promise<unknown>,
  gpuReport: () => ipcRenderer.invoke('turbomusic:gpu-report') as Promise<string>,
  openGpuPage: () => ipcRenderer.send('turbomusic:gpu-page'),
  setGpu: (mode: string) => ipcRenderer.invoke('turbomusic:gpu-set', mode) as Promise<void>,
  getGraphics: () => ipcRenderer.invoke('turbomusic:graphics') as Promise<unknown>,
  windowControl: (action: 'minimize' | 'maximize' | 'close') => ipcRenderer.send('turbomusic:window', action),
  setCustomFrame: (on: boolean) => ipcRenderer.invoke('turbomusic:set-frame', on) as Promise<void>,
  onWindowState: (cb: (maximized: boolean) => void) => { const h = (_e: unknown, m: boolean) => cb(m); ipcRenderer.on('turbomusic:window-state', h); return () => { ipcRenderer.removeListener('turbomusic:window-state', h); }; },
  migration: {
    info: () => ipcRenderer.invoke('turbomusic:migrate-info') as Promise<unknown>,
    run: () => ipcRenderer.invoke('turbomusic:migrate-run') as Promise<boolean>,
    dismiss: () => ipcRenderer.invoke('turbomusic:migrate-dismiss') as Promise<void>,
  },
  showLibraryFolder: () => ipcRenderer.invoke('turbomusic:show-folder') as Promise<void>,
});
