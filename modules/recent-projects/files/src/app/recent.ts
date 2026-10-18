import { projectDuration } from '../core/timeline.ts';
import { parseProject, serializeProject } from '../core/projectFile.ts';
import type { Project } from '../core/types.ts';

/**
 * Recent projects for the home screen. A project file holds the edit and never the media, so a copy of the edit is small:
 * it is kept in this device's own database (IndexedDB) under the project's name, and opening one asks for the media again
 * exactly like opening a file does. Filled when a project is saved, opened or edited (a few seconds after the last change), so
 * work that was never saved to a file is still one tap away.
 */
export interface RecentEntry {
  /** The key: the project name, compared without case. */
  key: string;
  name: string;
  /** When it was last kept (milliseconds). */
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
  json: string;
}

export const recentKey = (name: string): string => name.trim().toLowerCase() || 'untitled';

/** True when a project holds anything worth keeping (an empty project is not listed). */
export const hasContent = (p: Project): boolean => Object.keys(p.assets).length > 0 || p.tracks.some((t) => t.clips.length > 0) || p.captions.length > 0;

export function describeProject(p: Project, at = Date.now()): RecentEntry {
  return {
    key: recentKey(p.name),
    name: p.name,
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
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'key' });
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

export async function listRecent(): Promise<RecentEntry[]> {
  try {
    const rows = await tx<Row[]>('readonly', (s) => s.getAll());
    return newestFirst(rows.map((r) => r.meta));
  } catch {
    return []; // storage blocked: the list is just empty
  }
}

/** Keep (or replace) the copy for this project. Never throws: a blocked or full database only means the list stays as it was. */
export async function rememberProject(p: Project): Promise<void> {
  if (!hasContent(p)) return;
  try {
    const meta = describeProject(p);
    await tx('readwrite', (s) => s.put({ key: meta.key, meta, json: serializeProject(p) } satisfies Row));
    const all = await listRecentRaw();
    for (const old of all.slice(MAX_RECENT)) await tx('readwrite', (s) => s.delete(old.key));
  } catch {
    /* ignore */
  }
}

async function listRecentRaw(): Promise<RecentEntry[]> {
  const rows = await tx<Row[]>('readonly', (s) => s.getAll());
  return rows.map((r) => r.meta).sort((a, b) => b.at - a.at);
}

export async function loadRecent(key: string): Promise<Project | null> {
  try {
    const row = await tx<Row | undefined>('readonly', (s) => s.get(key));
    return row ? parseProject(row.json) : null;
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
