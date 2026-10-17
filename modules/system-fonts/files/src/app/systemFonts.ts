/**
 * The fonts installed on this computer, found without asking the person to pick a file.
 *
 * - Chromium (Electron, Chrome, Edge) has `window.queryLocalFonts()` (the Local Font Access API). In Electron it
 *   answers at once with no prompt (measured in Electron 44); in a browser it asks the person once and remembers.
 * - Where that does not exist (Firefox, Safari, the Android WebView) the best that can be done is to test a list of
 *   well-known font names one by one, by measuring text with each name against three fallback fonts. That finds the
 *   common ones, not every one, and the result says so (`source: 'probe'`).
 *
 * Framework-free and with no imports, so it can be copied as it is (turboengine `modules/system-fonts`).
 */

/** What `queryLocalFonts()` returns for one face (only the fields used here). */
export interface LocalFontFace {
  family: string;
  style?: string;
  fullName?: string;
}

/** One family and the styles it comes in ("Regular", "Bold Italic"...). */
export interface SystemFont {
  family: string;
  styles: string[];
}

export interface Detection {
  fonts: SystemFont[];
  /** `local-fonts`: the real list from the system. `probe`: only well-known names that were found. */
  source: 'local-fonts' | 'probe';
  /** Why the real list was not used, when it was not (permission refused, API missing). */
  note?: string;
}

/** Group faces into families: one row per family (compared ignoring case), sorted by name, styles in the order given. */
export function groupFonts(faces: LocalFontFace[]): SystemFont[] {
  const byName = new Map<string, SystemFont>();
  for (const f of faces) {
    const name = f.family?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    const entry = byName.get(key) ?? { family: name, styles: [] };
    const style = f.style?.trim();
    if (style && !entry.styles.includes(style)) entry.styles.push(style);
    byName.set(key, entry);
  }
  return [...byName.values()].sort((a, b) => a.family.localeCompare(b.family, undefined, { sensitivity: 'base' }));
}

/** Fonts worth testing for by name when the system cannot be asked: Windows, macOS, Linux and Android defaults, and popular free ones. */
export const COMMON_FONTS = [
  'Arial', 'Arial Black', 'Arial Narrow', 'Bahnschrift', 'Calibri', 'Cambria', 'Candara', 'Century Gothic', 'Comic Sans MS', 'Consolas', 'Constantia', 'Corbel',
  'Courier New', 'Franklin Gothic Medium', 'Georgia', 'Impact', 'Lucida Console', 'Lucida Sans Unicode', 'Palatino Linotype', 'Segoe UI', 'Segoe UI Black', 'Tahoma',
  'Times New Roman', 'Trebuchet MS', 'Verdana',
  'American Typewriter', 'Avenir', 'Avenir Next', 'Baskerville', 'Didot', 'Futura', 'Gill Sans', 'Helvetica', 'Helvetica Neue', 'Hoefler Text', 'Marker Felt', 'Menlo',
  'Monaco', 'Optima', 'Papyrus', 'SF Pro Display', 'Courier',
  'Cantarell', 'DejaVu Sans', 'DejaVu Serif', 'Droid Sans', 'Liberation Sans', 'Liberation Serif', 'Noto Sans', 'Noto Serif', 'Roboto', 'Ubuntu',
  'Anton', 'Bebas Neue', 'Fira Sans', 'Inter', 'Lato', 'Montserrat', 'Open Sans', 'Oswald', 'Poppins', 'Raleway', 'Source Sans Pro', 'Barlow',
];

let probeCtx: CanvasRenderingContext2D | null = null;

/** Is a font with this name drawn by the page (installed or added)? Compares text widths against three fallback fonts. */
export function fontInstalled(name: string): boolean {
  probeCtx ??= typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
  if (!probeCtx) return true;
  const sample = 'mmmmmmmmmmlliWWW0123';
  for (const base of ['monospace', 'serif', 'sans-serif']) {
    probeCtx.font = `72px ${base}`;
    const plain = probeCtx.measureText(sample).width;
    probeCtx.font = `72px "${name.replace(/"/g, '')}", ${base}`;
    if (probeCtx.measureText(sample).width !== plain) return true;
  }
  return false;
}

/** The well-known names that are installed, as families. */
export function probeFonts(candidates: string[] = COMMON_FONTS, available: (name: string) => boolean = fontInstalled): SystemFont[] {
  return groupFonts(candidates.filter((n) => available(n)).map((family) => ({ family })));
}

export interface DetectOptions {
  /** Replace the browser's `queryLocalFonts` (tests). */
  query?: () => Promise<LocalFontFace[]>;
  /** Replace the name test used by the fallback (tests). */
  available?: (name: string) => boolean;
}

/** Does this runtime have the Local Font Access API? */
export const canQueryLocalFonts = (): boolean => typeof (globalThis as { queryLocalFonts?: unknown }).queryLocalFonts === 'function';

let last: Detection | null = null;
const listeners = new Set<(d: Detection) => void>();

/** The last detection, if one ran in this session. */
export const detectedFonts = (): Detection | null => last;

/** Call `fn` whenever a detection finishes. Returns a function that stops listening. */
export function onFontsDetected(fn: (d: Detection) => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

/**
 * Find the installed fonts. In a browser, the call needs a click (or similar) the first time, and the person may refuse:
 * then the well-known-names list is returned with a `note` saying why. Never throws.
 */
export async function detectSystemFonts(o: DetectOptions = {}): Promise<Detection> {
  let result: Detection;
  const query = o.query ?? (canQueryLocalFonts() ? () => (globalThis as unknown as { queryLocalFonts(): Promise<LocalFontFace[]> }).queryLocalFonts() : undefined);
  if (query) {
    try {
      const fonts = groupFonts(await query());
      result = fonts.length ? { fonts, source: 'local-fonts' } : { fonts: probeFonts(COMMON_FONTS, o.available), source: 'probe', note: 'The system returned no fonts.' };
    } catch (e) {
      const why = e instanceof Error && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'Access to the installed fonts was refused.' : `Could not read the installed fonts (${e instanceof Error ? e.message : e}).`;
      result = { fonts: probeFonts(COMMON_FONTS, o.available), source: 'probe', note: why };
    }
  } else result = { fonts: probeFonts(COMMON_FONTS, o.available), source: 'probe', note: 'This browser cannot list installed fonts, so only well-known ones are shown.' };
  last = result;
  listeners.forEach((fn) => fn(result));
  return result;
}

/** Has the person already allowed listing fonts (so detecting needs no prompt)? `unsupported` where the permission does not exist. */
export async function fontPermission(): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  if (!canQueryLocalFonts()) return 'unsupported';
  try {
    const st = await navigator.permissions.query({ name: 'local-fonts' as PermissionName });
    return st.state;
  } catch {
    return 'unsupported';
  }
}
