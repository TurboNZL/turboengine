import { contextBridge, ipcRenderer } from 'electron';

/**
 * What the web client may know about the desktop app. `token` lets a fresh install connect to its own server without typing
 * anything; the other calls open the folder dialogs, which only the main process can do.
 */
const info = ipcRenderer.sendSync('curator:info') as { token: string; version: string; dataDir: string; platform: string; desktopEnv: string; port: number; customFrame: boolean; edition: 'full' | 'app'; serverModule: boolean };

contextBridge.exposeInMainWorld('curatorDesktop', {
  ...info,
  setServerModule: (on: boolean) => ipcRenderer.invoke('curator:server-module', on) as Promise<boolean>,
  chooseLibraryFolder: () => ipcRenderer.invoke('curator:choose-folder') as Promise<string | null>,
  setAccess: (serverUrl: string, id: string, secret: string) => ipcRenderer.send('curator:access', serverUrl, id, secret),
  setPresence: (p: unknown) => ipcRenderer.send('curator:presence', p),
  getDiscord: () => ipcRenderer.invoke('curator:discord-get') as Promise<unknown>,
  setDiscord: (patch: unknown) => ipcRenderer.invoke('curator:discord-set', patch) as Promise<unknown>,
  updates: {
    state: () => ipcRenderer.invoke('curator:update-state') as Promise<unknown>,
    hasToken: () => ipcRenderer.invoke('curator:update-has-token') as Promise<boolean>,
    setToken: (t: string) => ipcRenderer.invoke('curator:update-set-token', t) as Promise<void>,
    check: () => ipcRenderer.invoke('curator:update-check') as Promise<unknown>,
    install: () => ipcRenderer.send('curator:update-install'),
    onState: (cb: (s: unknown) => void) => { const h = (_e: unknown, s: unknown) => cb(s); ipcRenderer.on('curator:update', h); return () => { ipcRenderer.removeListener('curator:update', h); }; },
  },
  getGpu: () => ipcRenderer.invoke('curator:gpu-get') as Promise<unknown>,
  gpuReport: () => ipcRenderer.invoke('curator:gpu-report') as Promise<string>,
  openGpuPage: () => ipcRenderer.send('curator:gpu-page'),
  setGpu: (mode: string) => ipcRenderer.invoke('curator:gpu-set', mode) as Promise<void>,
  getGraphics: () => ipcRenderer.invoke('curator:graphics') as Promise<unknown>,
  windowControl: (action: 'minimize' | 'maximize' | 'close') => ipcRenderer.send('curator:window', action),
  setCustomFrame: (on: boolean) => ipcRenderer.invoke('curator:set-frame', on) as Promise<void>,
  onWindowState: (cb: (maximized: boolean) => void) => { const h = (_e: unknown, m: boolean) => cb(m); ipcRenderer.on('curator:window-state', h); return () => { ipcRenderer.removeListener('curator:window-state', h); }; },
  showLibraryFolder: () => ipcRenderer.invoke('curator:show-folder') as Promise<void>,
});
