import { API_VERSION, type Catalog, type Choice, type Palette, type PaletteSpec, type StyleDef, type ThemeId } from './types.ts';
import { buildPalette } from './palette.ts';

/** The catalog the engine is working with: the built-in snapshot at first, a downloaded one after an update. */
interface State { catalog: Catalog; palettes: Palette[]; byId: Map<string, Palette>; styles: Map<string, StyleDef>; pairs: Map<ThemeId, ThemeId> }

let state: State | null = null;
let revision = 0;
const listeners = new Set<() => void>();

const sorted = <T extends { order?: number; id: string }>(a: T[]) => [...a].sort((x, y) => (x.order ?? 1e9) - (y.order ?? 1e9) || x.id.localeCompare(y.id));

/** Basic shape checks, so a broken download is refused instead of half-applied. Returns the problems found. */
export function validateCatalog(c: unknown): string[] {
  const bad: string[] = [];
  const x = c as Partial<Catalog> | null;
  if (!x || typeof x !== 'object') return ['not an object'];
  if (typeof x.apiVersion !== 'number') bad.push('apiVersion missing');
  for (const k of ['palettes', 'styles'] as const) if (!Array.isArray(x[k])) bad.push(`${k} is not a list`);
  if (!x.config || typeof x.config !== 'object' || !x.config.defaults) bad.push('config.defaults missing');
  if (bad.length) return bad;
  const seen = new Set<string>();
  for (const p of x.palettes!) {
    if (!p.id || !p.label || (p.mode !== 'dark' && p.mode !== 'light')) bad.push(`palette ${p.id ?? '?'} is incomplete`);
    if (seen.has(p.id)) bad.push(`duplicate palette ${p.id}`);
    seen.add(p.id);
  }
  for (const s of x.styles!) if (!s.id || !s.label) bad.push(`style ${s.id ?? '?'} is incomplete`);
  const badRegex = (c: unknown): boolean => {
    if (!c || typeof c !== 'object') return false;
    const d = c as { ua?: string; platform?: string; env?: string; all?: unknown[]; any?: unknown[] };
    for (const k of ['ua', 'platform', 'env'] as const) if (d[k] !== undefined) { try { new RegExp(d[k]!, 'i'); } catch { return true; } }
    return [...(d.all ?? []), ...(d.any ?? [])].some(badRegex);
  };
  if (!Array.isArray(x.config!.devices) || x.config!.devices.some((r) => !r || badRegex(r.when))) bad.push('a device rule is broken');
  if (!seen.has(x.config!.defaults.theme)) bad.push('the default palette does not exist');
  if (!x.styles!.some((s) => s.id === x.config!.defaults.ui)) bad.push('the default style does not exist');
  return bad;
}

/**
 * Which palette is the light/dark twin of which. A palette's own `pair` wins; otherwise the two palettes a style lists as "matching"
 * (one light, one dark, different) are twins. Always symmetric, always one light and one dark, and a palette has at most one twin.
 */
export function buildPairs(palettes: PaletteSpec[], styles: StyleDef[]): Map<ThemeId, ThemeId> {
  const mode = new Map(palettes.map((p) => [p.id, p.mode]));
  const out = new Map<ThemeId, ThemeId>();
  const join = (a: ThemeId, b: ThemeId) => {
    if (a === b || out.has(a) || out.has(b) || !mode.has(a) || !mode.has(b) || mode.get(a) === mode.get(b)) return;
    out.set(a, b); out.set(b, a);
  };
  for (const p of palettes) if (p.pair) join(p.id, p.pair);
  for (const s of sorted(styles)) if (s.matching?.dark) join(s.matching.light, s.matching.dark);
  return out;
}

export function setCatalog(catalog: Catalog) {
  const palettes = sorted(catalog.palettes).map((p: PaletteSpec) => buildPalette(p));
  state = { catalog, palettes, byId: new Map(palettes.map((p) => [p.id, p])), styles: new Map(catalog.styles.map((s) => [s.id, s])), pairs: buildPairs(catalog.palettes, catalog.styles) };
  revision++;
  listeners.forEach((fn) => fn());
}

const need = (): State => { if (!state) throw new Error('turbothemes: no catalog yet. Call start() first.'); return state; };

export const getCatalog = (): Catalog => need().catalog;
export const hasCatalog = () => state !== null;
export const config = () => need().catalog.config;

/** Changes whenever the catalog is replaced; for useSyncExternalStore. */
export const getRevision = () => revision;
export function subscribe(fn: () => void): () => void { listeners.add(fn); return () => { listeners.delete(fn); }; }

export const listPalettes = (): Palette[] => need().palettes;
export const getPalette = (id: ThemeId): Palette | undefined => need().byId.get(id);

/** Every choice for the colour picker, special entries first: [{id:"auto"}, {id:"system"}, ...palettes]. */
export function listThemes(): { id: string; label: string; dark: boolean | null; note?: string; group?: string; pair?: ThemeId }[] {
  const s = need();
  return [
    ...s.catalog.config.choices.theme.map((c: Choice) => ({ id: c.id, label: c.label, dark: null, note: c.note })),
    ...s.palettes.map((p) => ({ id: p.id, label: p.label, dark: p.dark, note: p.note, group: p.group, pair: s.pairs.get(p.id) })),
  ];
}

/** Every choice for the style picker, "Match this device" first. */
export function listStyles(): (StyleDef | (Choice & { matching?: undefined }))[] {
  const s = need();
  return [...s.catalog.config.choices.ui.map((c) => ({ id: c.id, label: c.label, description: c.description ?? '', font: c.font ?? 'system-ui' })), ...sorted(s.catalog.styles)];
}

/** The light twin of a dark palette, the dark twin of a light one; undefined when it has none (some looks exist in one mode only). */
export const counterpartOf = (id: ThemeId): ThemeId | undefined => need().pairs.get(id);

export const getStyle = (id: string): StyleDef | undefined => need().styles.get(id);

export const isTheme = (id: unknown): id is ThemeId => typeof id === 'string' && (need().catalog.config.choices.theme.some((c) => c.id === id) || need().byId.has(id));
export const isUiStyle = (id: unknown): id is string => typeof id === 'string' && (need().catalog.config.choices.ui.some((c) => c.id === id) || need().styles.has(id));

export const API = API_VERSION;
