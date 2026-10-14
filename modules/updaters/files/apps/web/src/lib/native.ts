import { desktop } from './settings.ts';

/** How far the self-update of an installed app (the desktop app or the Android app) has got. */
export type UpdateState = {
  status: 'idle' | 'disabled' | 'checking' | 'none' | 'downloading' | 'ready' | 'error';
  version?: string; percent?: number; message?: string;
  /** desktop: an install is running (a password prompt is open) */
  installing?: boolean;
  /** desktop: what to run in a terminal when the app could not install the update itself */
  command?: string;
};

export interface NativeUpdates {
  state(): Promise<UpdateState>;
  check(): Promise<UpdateState>;
  /** restart the app on the new version (desktop) or open the installer (Android) */
  install(): void;
  /** a GitHub token for updates from a private repository */
  hasToken(): Promise<boolean>;
  setToken(token: string): Promise<void>;
  onState(cb: (s: UpdateState) => void): () => void;
}

/** What the Android app puts on `window` (a Java interface: strings only, so results come back as JSON and updates as events). */
interface AndroidBridge { setServer(url: string, token: string): void; version(): string; updateState(): string; checkForUpdate(): void; installUpdate(): void; hasUpdateToken(): boolean; setUpdateToken(t: string): void }
const android = (): AndroidBridge | undefined => (typeof window === 'undefined' ? undefined : (window as unknown as { TurboMusicAndroid?: AndroidBridge }).TurboMusicAndroid);

export const isAndroidApp = () => !!android();
export const appVersion = (): string | null => desktop()?.version ?? android()?.version() ?? null;

export function nativeUpdates(): NativeUpdates | null {
  const d = desktop();
  if (d?.updates) return d.updates;
  const a = android();
  if (!a) return null;
  const read = (): UpdateState => { try { return JSON.parse(a.updateState()) as UpdateState; } catch { return { status: 'idle' }; } };
  return {
    state: async () => read(),
    check: async () => { a.checkForUpdate(); return read(); },
    install: () => a.installUpdate(),
    hasToken: async () => a.hasUpdateToken(),
    setToken: async (t) => a.setUpdateToken(t),
    onState: (cb) => {
      const h = (e: Event) => cb((e as CustomEvent<UpdateState>).detail);
      window.addEventListener('turbomusic-update', h);
      return () => window.removeEventListener('turbomusic-update', h);
    },
  };
}

/** Tells the Android app which server this device uses, so Android Auto browses the same library. No effect elsewhere. */
export function syncNativeServer(serverUrl: string, token: string, access?: { id: string; secret: string }): void {
  try { android()?.setServer(serverUrl, token); } catch { /* not in the app */ }
  // the desktop app adds the service token to requests for this server itself, so audio streams instead of being downloaded whole first
  try { desktop()?.setAccess?.(new URL(serverUrl || location.origin, location.href).href, access?.id ?? '', access?.secret ?? ''); } catch { /* not the desktop app, or an old one */ }
  // an app built before the service token existed has no such method: that is fine
  try { (android() as { setAccess?: (id: string, secret: string) => void } | null)?.setAccess?.(access?.id.trim() ?? '', access?.secret.trim() ?? ''); } catch { /* old app */ }
}
