import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * What the Windows server edition remembers: where each kind of data lives, the network choices, and the optional Cloudflare tunnel.
 * Empty folder strings mean "inside the data folder". The wizard (setup.html) edits this and the tray app applies it.
 */
export interface ServerEditionConfig {
  /** the wizard has been completed once: from then on the app starts straight into the tray */
  setupDone: boolean;
  /** the database, the access token and everything not listed below */
  dataDir: string;
  /** audio files and pictures: the big one, put it on the big drive */
  filesDir: string;
  /** half-finished downloads and uploads */
  tmpDir: string;
  /** yt-dlp's cache */
  cacheDir: string;
  port: number;
  /** listen on the home network (true) or only on this computer (false) */
  lan: boolean;
  startWithWindows: boolean;
  /** Cloudflare tunnel: the token from the Zero Trust dashboard, and whether to run it */
  tunnelToken: string;
  tunnelOn: boolean;
}

export const DEFAULT_SERVER_PORT = 47813;
const FILE = 'server-edition.json';

export const defaultServerConfig = (userData: string): ServerEditionConfig => ({
  setupDone: false, dataDir: join(userData, 'library'), filesDir: '', tmpDir: '', cacheDir: '', port: DEFAULT_SERVER_PORT, lan: true, startWithWindows: true, tunnelToken: '', tunnelOn: false,
});

const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);

/** The saved choices with a default for anything missing or malformed. */
export function loadServerConfig(userData: string): ServerEditionConfig {
  const d = defaultServerConfig(userData);
  let saved: Record<string, unknown> = {};
  try { saved = JSON.parse(readFileSync(join(userData, FILE), 'utf8')) as Record<string, unknown>; } catch { /* first start */ }
  const port = Number(saved.port);
  return {
    setupDone: saved.setupDone === true,
    dataDir: str(saved.dataDir, d.dataDir).trim() || d.dataDir,
    filesDir: str(saved.filesDir, '').trim(), tmpDir: str(saved.tmpDir, '').trim(), cacheDir: str(saved.cacheDir, '').trim(),
    port: Number.isInteger(port) && port >= 1 && port <= 65535 ? port : d.port,
    lan: saved.lan !== false, startWithWindows: saved.startWithWindows !== false,
    tunnelToken: str(saved.tunnelToken, '').trim(), tunnelOn: saved.tunnelOn === true && str(saved.tunnelToken, '').trim().length > 0,
  };
}

export function saveServerConfig(userData: string, patch: Partial<ServerEditionConfig>): ServerEditionConfig {
  const next = { ...loadServerConfig(userData), ...patch };
  mkdirSync(dirname(join(userData, FILE)), { recursive: true });
  writeFileSync(join(userData, FILE), JSON.stringify(next, null, 2));
  return loadServerConfig(userData);
}

export interface Iface { family: string | number; internal: boolean; address: string }

/** The addresses other devices on the home network can use to reach the server (private IPv4 addresses first). */
export function lanUrls(port: number, interfaces: Record<string, Iface[] | undefined>): string[] {
  const out: string[] = [];
  for (const list of Object.values(interfaces)) for (const i of list ?? []) {
    if ((i.family === 'IPv4' || i.family === 4) && !i.internal && !i.address.startsWith('169.254.')) out.push(`http://${i.address}:${port}`);
  }
  const priv = (u: string) => /\/\/(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u);
  return [...out.filter(priv), ...out.filter((u) => !priv(u))];
}

/** Which of the three optional folders differ from "inside the data folder" and so need a link: the wizard applies exactly these. */
export function folderPlan(c: Pick<ServerEditionConfig, 'filesDir' | 'tmpDir' | 'cacheDir'>): { kind: 'files' | 'tmp' | 'cache'; target: string }[] {
  const plan: { kind: 'files' | 'tmp' | 'cache'; target: string }[] = [];
  if (c.filesDir) plan.push({ kind: 'files', target: c.filesDir });
  if (c.tmpDir) plan.push({ kind: 'tmp', target: c.tmpDir });
  if (c.cacheDir) plan.push({ kind: 'cache', target: c.cacheDir });
  return plan;
}

/** The pairing code the web client understands (apps/web/src/lib/pairCode.ts): a new device opens `<address>/?pair=<code>` and connects with one click. */
export const pairCode = (url: string, token: string) => 'CUR1-' + Buffer.from(JSON.stringify({ u: url, t: token })).toString('base64url');
