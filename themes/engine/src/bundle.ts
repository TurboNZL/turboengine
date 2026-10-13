import builtin from 'virtual:builtin';
import { API_VERSION, type Catalog, type Manifest } from './types.ts';
import { setCatalog, validateCatalog } from './catalog.ts';
import { storageKey, safeGet, safeRemove, safeSet } from './options.ts';

/** A complete set of themes: what themes.json, themes.css and manifest.json say together. */
export interface Bundle { manifest: Manifest; catalog: Catalog; css: string }
interface Stored extends Bundle { builtinHash: string }

export const BUILTIN: Bundle = builtin;

let current: Bundle = BUILTIN;
let source: 'builtin' | 'downloaded' = 'builtin';

const STYLE_ID = 'turbothemes-css';

/** Puts a bundle to work: the catalog for the engine, the CSS into the page (replacing the previous bundle's). */
export function installBundle(b: Bundle, from: 'builtin' | 'downloaded') {
  current = b;
  source = from;
  setCatalog(b.catalog);
  if (typeof document === 'undefined') return;
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) { el = document.createElement('style'); el.id = STYLE_ID; document.head.appendChild(el); }
  el.dataset.hash = b.manifest.hash;
  el.textContent = b.css;
}

export const currentBundle = () => current;
export const bundleSource = () => source;

/** A downloaded bundle is only trusted for the engine build it was downloaded against: a newer engine brings newer built-in themes. */
export function loadStored(): Bundle | null {
  const raw = safeGet(storageKey('themes'));
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Stored;
    if (s.builtinHash !== BUILTIN.manifest.hash || s.manifest?.apiVersion > API_VERSION) { safeRemove(storageKey('themes')); return null; }
    if (validateCatalog(s.catalog).length || typeof s.css !== 'string') return null;
    return { manifest: s.manifest, catalog: s.catalog, css: s.css };
  } catch { return null; }
}

export function store(b: Bundle): boolean {
  const s: Stored = { ...b, builtinHash: BUILTIN.manifest.hash };
  return safeSet(storageKey('themes'), JSON.stringify(s));
}

export const forgetStored = () => safeRemove(storageKey('themes'));
