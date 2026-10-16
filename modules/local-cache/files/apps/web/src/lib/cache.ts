import type { CacheLevel } from './settings.ts';

/**
 * What the page remembers so it opens faster (Settings > Items > Speed). Everything is shown from the copy first and then checked with the server, so a copy
 * is never the last word.
 *   off     nothing is kept
 *   low     lists, tags and opened items are kept while the page is open (going back to a page is instant)
 *   medium  as low, and the lists and tags are also kept on this device: after a reload (or opening the app) the list is there at once, then it updates
 *   high    as medium, and the page asks ahead: the Archive, and the first items of the list, so those open without a wait
 */
const PREFIX = 'turbokeep.cache.';
const mem = new Map<string, unknown>();
let level: CacheLevel = 'medium';

export const setCacheLevel = (l: CacheLevel) => { level = l; if (l === 'off') mem.clear(); if (l === 'off' || l === 'low') clearSaved(); };
export const cacheLevel = () => level;
const persists = () => level === 'medium' || level === 'high';

/** A copy kept for this page visit (and on the device at medium and high, for what is worth keeping across visits: lists and tags, not opened items). */
export function remember(key: string, value: unknown, keep = true) {
  if (level === 'off') return;
  mem.set(key, value);
  if (keep && persists()) { try { const s = JSON.stringify(value); if (s.length < 2_000_000) localStorage.setItem(PREFIX + key, s); } catch { /* full or private window: the copy in memory still works */ } }
}

export function recall<T>(key: string): T | undefined {
  if (level === 'off') return undefined;
  if (mem.has(key)) return mem.get(key) as T;
  if (!persists()) return undefined;
  try { const s = localStorage.getItem(PREFIX + key); if (s) { const v = JSON.parse(s) as T; mem.set(key, v); return v; } } catch { /* damaged copy: ignore it */ }
  return undefined;
}

/**
 * An opened item's copy. In memory at every level but Off; on the device only at High (at most NOTE_KEEP of them, the oldest dropped first), so opening an item you
 * have opened before, or that was fetched ahead, shows at once even after a reload.
 */
const NOTE_KEEP = 400, INDEX = PREFIX + 'noteindex';
export function rememberNote(note: { id: string }) {
  if (level === 'off') return;
  mem.set(`note:${note.id}`, note);
  if (level !== 'high') return;
  try {
    const s = JSON.stringify(note);
    if (s.length > 150_000) return;
    const index: string[] = JSON.parse(localStorage.getItem(INDEX) ?? '[]').filter((k: string) => k !== note.id);
    index.push(note.id);
    while (index.length > NOTE_KEEP) localStorage.removeItem(`${PREFIX}note:${index.shift()}`);
    localStorage.setItem(PREFIX + `note:${note.id}`, s); localStorage.setItem(INDEX, JSON.stringify(index));
  } catch { /* full: the copy in memory still works */ }
}
export function recallNote<T>(id: string): T | undefined {
  if (level === 'off') return undefined;
  if (mem.has(`note:${id}`)) return mem.get(`note:${id}`) as T;
  if (level !== 'high') return undefined;
  try { const s = localStorage.getItem(`${PREFIX}note:${id}`); if (s) { const v = JSON.parse(s) as T; mem.set(`note:${id}`, v); return v; } } catch { /* damaged copy */ }
  return undefined;
}

export function clearSaved() {
  try { for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k); } catch { /* nothing to clear */ }
}
/** Forgets everything (signing out, or another account, or the button in Settings). */
export function clearCache() { mem.clear(); clearSaved(); }

/** The copies are for one account: a different one starts clean. */
export function ownCache(userId: number | null) {
  try {
    const mine = localStorage.getItem(PREFIX + 'owner');
    if (userId === null) { clearCache(); return; }
    if (mine !== String(userId)) { clearCache(); localStorage.setItem(PREFIX + 'owner', String(userId)); }
  } catch { /* private window */ }
}

export const LEVELS: { id: CacheLevel; label: string; text: string }[] = [
  { id: 'off', label: 'Off', text: 'Nothing is remembered. Every page asks the server each time.' },
  { id: 'low', label: 'Low', text: 'Lists, tags and opened items are remembered while the page is open: going back to a page is instant.' },
  { id: 'medium', label: 'Medium', text: 'As Low, and the lists and tags are also kept on this device: after a reload or opening the app, the list is there at once and then updates.' },
  { id: 'high', label: 'High', text: 'As Medium, and the page asks ahead: the Archive and the first items of your list are fetched in the background, so they open without a wait. Uses a little more data.' },
];
