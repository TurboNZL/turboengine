import { projectDuration } from '../core/timeline.ts';
import type { Project } from '../core/types.ts';
import { refWhere, type ProjectRef } from './projectFiles.ts';

/**
 * Recent projects for the home screen: the project FILES the person saved or opened, as references (a path, or a browser file handle),
 * with a little detail to show. The edit itself is never copied into TurboCut's own storage: a project exists where the person put it,
 * and opening one reads that file. A file that has moved or been deleted says so when opened.
 */
export interface RecentEntry {
  /** The key: the file path, or an id for a browser handle. */
  key: string;
  name: string;
  /** Where it lives, for the list: a path or a file name. */
  where: string;
  /** When it was last saved or opened (milliseconds). */
  at: number;
  width: number;
  height: number;
  fps: number;
  /** Length in seconds. */
  seconds: number;
  clips: number;
  media: number;
}

const DB = 'turbocut';
const STORE = 'recent';
export const MAX_RECENT = 12;

interface Row {
  key: string;
  meta: RecentEntry;
  ref: ProjectRef;
}

/** True when a project holds anything worth saving (an empty project is not listed). */
export const hasContent = (p: Project): boolean => Object.keys(p.assets).length > 0 || p.tracks.some((t) => t.clips.length > 0) || p.captions.length > 0;

export function describeProject(p: Project, key: string, where: string, at = Date.now()): RecentEntry {
  return {
    key,
    name: p.name,
    where,
    at,
    width: p.width,
    height: p.height,
    fps: p.fps,
    seconds: Math.round(projectDuration(p) / p.fps),
    clips: p.tracks.reduce((n, t) => n + t.clips.length, 0),
    media: Object.keys(p.assets).length,
  };
}

/** The newest first, at most `MAX_RECENT`. */
export const newestFirst = (rows: RecentEntry[]): RecentEntry[] => [...rows].sort((a, b) => b.at - a.at).slice(0, MAX_RECENT);

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no storage'));
    // Version 2: the list used to hold a COPY of every project's edit (a cache that reopened old work by name). Those copies are dropped.
    const req = indexedDB.open(DB, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (db.objectStoreNames.contains(STORE)) db.deleteObjectStore(STORE);
      db.createObjectStore(STORE, { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = run(t.objectStore(STORE));
      t.oncomplete = () => resolve(req.result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}

const rows = (): Promise<Row[]> => tx<Row[]>('readonly', (s) => s.getAll());

export async function listRecent(): Promise<RecentEntry[]> {
  try {
    return newestFirst((await rows()).map((r) => r.meta));
  } catch {
    return []; // storage blocked: the list is just empty
  }
}

/** The key an existing entry for the same file has, if any (a path compares as text, a handle with `isSameEntry`). */
async function existingKey(all: Row[], ref: ProjectRef): Promise<string | undefined> {
  for (const r of all) {
    if (r.ref.kind !== ref.kind) continue;
    if (ref.kind === 'path' && r.ref.kind === 'path' && r.ref.path === ref.path) return r.key;
    if (ref.kind === 'handle' && r.ref.kind === 'handle' && (await r.ref.handle.isSameEntry(ref.handle).catch(() => false))) return r.key;
  }
  return undefined;
}

/** Note that this project lives in this file. Never throws: a blocked or full database only means the list stays as it was. */
export async function rememberFile(p: Project, ref: ProjectRef | null): Promise<void> {
  if (!ref) return;
  try {
    const all = await rows();
    const key = (await existingKey(all, ref)) ?? (ref.kind === 'path' ? ref.path : `h-${crypto.randomUUID()}`);
    const meta = describeProject(p, key, refWhere(ref));
    await tx('readwrite', (s) => s.put({ key, meta, ref } satisfies Row));
    const kept = newestFirst([...all.filter((r) => r.key !== key).map((r) => r.meta), meta]);
    for (const old of all.filter((r) => r.key !== key && !kept.some((k) => k.key === r.key))) await tx('readwrite', (s) => s.delete(old.key));
  } catch {
    /* ignore */
  }
}

export async function recentRef(key: string): Promise<ProjectRef | null> {
  try {
    return (await tx<Row | undefined>('readonly', (s) => s.get(key)))?.ref ?? null;
  } catch {
    return null;
  }
}

export async function forgetRecent(key: string): Promise<void> {
  try {
    await tx('readwrite', (s) => s.delete(key));
  } catch {
    /* ignore */
  }
}

/** "3 min ago", "yesterday" ... for the list. */
export function ago(at: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const hrs = Math.round(m / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const d = Math.round(hrs / 24);
  if (d === 1) return 'yesterday';
  if (d < 30) return `${d} days ago`;
  return new Date(at).toLocaleDateString();
}
