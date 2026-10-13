import { useEffect, useState } from 'react';
import { isAndroidApp } from './native.ts';

/**
 * The server module of the Android app (beta): the TurboMusic server runs in Termux and the app drives it (see apps/android TermuxServer.kt).
 * The bridge returns JSON strings; this file turns them into plain values and polls the module's own address to tell whether it is up.
 */
interface Bridge {
  termuxStatus(): string; termuxOneTimeLine(): string; termuxCopyLine(): void; termuxOpenTermux(): boolean; termuxOpenInstallPage(): void; termuxRequestPermission(): void;
  termuxInstall(): boolean; termuxStart(): boolean; termuxStop(): boolean; termuxRemove(deleteLibrary: boolean): boolean; termuxSetOptions(autoStart: boolean, wake: boolean): void;
}
const bridge = (): Bridge | null => {
  const b = typeof window === 'undefined' ? undefined : (window as unknown as { CuratorAndroid?: Partial<Bridge> }).CuratorAndroid;
  return b && typeof b.termuxStatus === 'function' ? (b as Bridge) : null; // an older app has no such methods
};

export interface TermuxResult { label?: string; state?: 'running' | 'done' | 'failed'; exit?: number; out?: string; err?: string; at?: number }
export interface TermuxStatus {
  /** Termux is installed on the phone */ termuxInstalled: boolean;
  /** Android has been told to let this app run commands in Termux */ granted: boolean;
  /** the module was installed from this app */ module: boolean;
  port: number; token: string; autoStart: boolean; wake: boolean; result: TermuxResult;
}

export const termuxSupported = () => isAndroidApp() && !!bridge();
export const termuxStatus = (): TermuxStatus | null => { try { return JSON.parse(bridge()!.termuxStatus()) as TermuxStatus; } catch { return null; } };
export const termux = {
  oneTimeLine: () => bridge()?.termuxOneTimeLine() ?? '',
  copyLine: () => bridge()?.termuxCopyLine(),
  openTermux: () => bridge()?.termuxOpenTermux() ?? false,
  openInstallPage: () => bridge()?.termuxOpenInstallPage(),
  requestPermission: () => bridge()?.termuxRequestPermission(),
  install: () => bridge()?.termuxInstall() ?? false,
  start: () => bridge()?.termuxStart() ?? false,
  stop: () => bridge()?.termuxStop() ?? false,
  remove: (deleteLibrary: boolean) => bridge()?.termuxRemove(deleteLibrary) ?? false,
  setOptions: (autoStart: boolean, wake: boolean) => bridge()?.termuxSetOptions(autoStart, wake),
};

/** the module's server, from this phone */
export const termuxUrl = (port: number) => `http://127.0.0.1:${port}`;

/** true when the module's server answers on this phone */
export async function termuxServerUp(port: number, ms = 1500): Promise<boolean> {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { return (await fetch(`${termuxUrl(port)}/api/health`, { signal: c.signal })).ok; } catch { return false; } finally { clearTimeout(t); }
}

/** Turns Termux's answer into a sentence the user can act on. */
export function explainTermuxFailure(r: TermuxResult): string {
  const text = `${r.err ?? ''} ${r.out ?? ''}`.toLowerCase();
  if (/allow-external-apps|not allowed|external apps/.test(text)) return 'Termux has not been told to accept commands from other apps. Do the one-time step: copy the line, paste it in Termux, press Enter.';
  if (/permission/.test(text)) return 'Android has not allowed this app to run commands in Termux yet. Press “Allow”.';
  if (/no server bundle/.test(text)) return 'No release has a server bundle for Termux yet (the next release will).';
  if (/too old/.test(text)) return 'Termux installed a Node version that is too old. Open Termux and run: pkg upgrade';
  return r.err?.trim() ? r.err.trim().slice(-300) : 'Termux reported an error.';
}

/** polls the bridge and the server while a component is mounted */
export function useTermux(everyMs = 2500) {
  const [status, setStatus] = useState<TermuxStatus | null>(() => (termuxSupported() ? termuxStatus() : null));
  const [up, setUp] = useState(false);
  useEffect(() => {
    if (!termuxSupported()) return;
    let live = true;
    const tick = async () => {
      const s = termuxStatus();
      if (live) setStatus(s);
      if (s) { const u = await termuxServerUp(s.port); if (live) setUp(u); }
    };
    void tick();
    const t = setInterval(() => void tick(), everyMs);
    return () => { live = false; clearInterval(t); };
  }, [everyMs]);
  return { status, up, refresh: () => setStatus(termuxStatus()) };
}

/** App start: when the module is installed and should start with the app, start it unless it is already answering. */
export function startTermuxServerIfWanted(): void {
  if (!termuxSupported()) return;
  const s = termuxStatus();
  if (!s?.module || !s.autoStart || !s.termuxInstalled || !s.granted) return;
  // a command we sent a moment ago may still be starting up: leave it alone for two minutes
  void termuxServerUp(s.port).then((up) => { if (!up && (s.result.state !== 'running' || Date.now() - (s.result.at ?? 0) > 120_000)) termux.start(); });
}
