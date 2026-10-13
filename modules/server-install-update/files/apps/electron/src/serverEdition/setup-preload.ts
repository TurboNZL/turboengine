import { contextBridge, ipcRenderer } from 'electron';

/** The wizard's only way to the main process. Every call is a named request; nothing else of Node or Electron is reachable from the page. */
contextBridge.exposeInMainWorld('curatorSetup', {
  state: () => ipcRenderer.invoke('setup:state') as Promise<unknown>,
  chooseFolder: (title: string) => ipcRenderer.invoke('setup:choose-folder', title) as Promise<string | null>,
  freeSpace: (path: string) => ipcRenderer.invoke('setup:free-space', path) as Promise<number | null>,
  save: (patch: unknown) => ipcRenderer.invoke('setup:save', patch) as Promise<unknown>,
  installTools: (ids: string[]) => ipcRenderer.invoke('setup:install-tools', ids) as Promise<{ ok: boolean; error?: string }>,
  finish: () => ipcRenderer.invoke('setup:finish') as Promise<{ ok: boolean; error?: string }>,
  open: (what: 'browser' | 'folder' | string) => ipcRenderer.send('setup:open', what),
  copy: (text: string) => ipcRenderer.send('setup:copy', text),
  onProgress: (cb: (p: unknown) => void) => { const h = (_e: unknown, p: unknown) => cb(p); ipcRenderer.on('setup:progress', h); return () => ipcRenderer.removeListener('setup:progress', h); },
  onTunnel: (cb: (s: unknown) => void) => { const h = (_e: unknown, s: unknown) => cb(s); ipcRenderer.on('setup:tunnel', h); return () => ipcRenderer.removeListener('setup:tunnel', h); },
});
