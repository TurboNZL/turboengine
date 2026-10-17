/**
 * turbothemes: the engine. It rarely changes. Everything that looks like something (palettes and UI styles) lives in the
 * themes/ folder of the repository and arrives as a bundle: built into this file at publish time, and replaced
 * by the updater whenever the repository has newer themes.
 *
 *   import { start } from 'turbothemes';
 *   import 'turbothemes/base.css';
 *   const themes = start({ appearance: { theme: 'auto', ui: 'auto' } });
 */
import type { Appearance, DeviceInfo } from './types.ts';
import { setOptions, type Options } from './options.ts';
import { setHostInfo } from './device.ts';
import { BUILTIN, bundleSource, currentBundle, forgetStored, installBundle, loadStored } from './bundle.ts';
import { applyAppearance, watchSystemTheme } from './apply.ts';
import { checkDue, checkForUpdates, lastChecked, type UpdateResult } from './updater.ts';
import { githubSource, type Source } from './source.ts';
import { subscribe } from './catalog.ts';
import { safeGet, safeSet, storageKey } from './options.ts';
import { createPicker, type Picker } from './picker.ts';
import { definePicker } from './picker-element.ts';

export interface StartOptions {
  /** Applied straight away, before the first paint. */
  appearance?: Appearance;
  /** Prefix for what the engine keeps in localStorage. Default "turbothemes". */
  storagePrefix?: string;
  /** Where to look for newer themes. Default: the TurboNZL/turboengine repository (themes/dist). `false` = never go online. */
  source?: Source | false;
  /** Check for newer themes in the background (default true). */
  autoUpdate?: boolean;
  /** How long to wait between background checks (default 6 hours). */
  checkEveryMs?: number;
  fonts?: Options['fonts'];
  lens?: Options['lens'];
  /** What only the host app knows about the device, for "Match this device" (the Linux desktop environment). */
  host?: Partial<DeviceInfo>;
  /**
   * Remember the user's choice (in localStorage, under `<prefix>.appearance`) and apply it at the next start. `appearance` is then only the
   * default for a first visit. Leave it off when the app keeps the choice in its own settings and calls `apply()` itself.
   */
  persist?: boolean;
  /** Register the `<turbo-themes-picker>` element, a ready-made settings control: drop the tag anywhere. */
  picker?: boolean;
}

export interface Version { hash: string; built: string; origin: 'builtin' | 'downloaded'; checkedAt: number | null; source: string }

export interface TurboThemes {
  /** Applies a look. Call it again whenever the user changes a setting. */
  apply(a: Appearance): void;
  /** Looks for newer themes now (ignores the check interval). */
  update(): Promise<UpdateResult>;
  /** Throws away downloaded themes and goes back to the ones built into the engine. */
  resetToBuiltin(): void;
  /** Changes where updates come from (a new access token, say). `false` switches online updates off. */
  setSource(s: Source | false): void;
  version(): Version;
  /** The look that is applied now (the last `apply()`, or the remembered one). */
  appearance(): Appearance;
  /** Tries a look without keeping it (hover previews); `null` goes back to the current one. */
  preview(a: Appearance | null): void;
  /** Calls `fn` after every `apply()`, from any picker or part of the app. Returns an unsubscribe function. */
  onAppearance(fn: (a: Appearance) => void): () => void;
  /** The headless picker controller: everything a settings screen needs, with no opinion on how it looks. */
  picker(): Picker;
}

let source: Source | false = githubSource();
let last: Appearance | null = null;
let subscribed = false;
let persisting = false;
const appearanceListeners = new Set<(a: Appearance) => void>();

const DEFAULT_EVERY = 6 * 60 * 60 * 1000;

export function start(o: StartOptions = {}): TurboThemes {
  setOptions({ ...(o.storagePrefix ? { storagePrefix: o.storagePrefix } : {}), ...(o.fonts ? { fonts: o.fonts } : {}), ...(o.lens !== undefined ? { lens: o.lens } : {}) });
  if (o.host) setHostInfo(o.host);
  if (o.source !== undefined) source = o.source;

  const stored = loadStored();
  if (stored) installBundle(stored, 'downloaded'); else installBundle(BUILTIN, 'builtin');
  persisting = !!o.persist;
  const saved = persisting ? readSaved() : null;
  const initial = saved ?? o.appearance ?? (persisting ? { theme: 'auto', ui: 'auto' } : undefined);
  if (initial) { last = initial; applyAppearance(initial); }
  if (typeof window !== 'undefined') watchSystemTheme(() => last ?? { theme: 'auto', ui: 'auto' });
  if (!subscribed) { subscribed = true; subscribe(() => { if (last) applyAppearance(last); }); }

  const update = async (): Promise<UpdateResult> => {
    if (!source) return { status: 'failed', message: 'Online updates are switched off in this app.' };
    return checkForUpdates(source);
  };
  if (o.autoUpdate !== false && source && typeof window !== 'undefined') {
    const every = o.checkEveryMs ?? DEFAULT_EVERY;
    const run = () => { if (checkDue(every)) void update(); };
    // after the first paint, so the check never competes with the app starting
    if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 5000 }); else setTimeout(run, 2000);
    window.addEventListener('online', run);
  }

  const engine: TurboThemes = {
    apply(a) {
      last = a;
      applyAppearance(a);
      if (persisting) safeSet(storageKey('appearance'), JSON.stringify(a));
      appearanceListeners.forEach((fn) => fn(a));
    },
    appearance: () => last ?? { theme: 'auto', ui: 'auto' },
    preview(a) { const t = a ?? last; if (t) applyAppearance(t); },
    onAppearance(fn) { appearanceListeners.add(fn); return () => { appearanceListeners.delete(fn); }; },
    picker: () => createPicker(engine),
    update,
    resetToBuiltin() { forgetStored(); installBundle(BUILTIN, 'builtin'); },
    setSource(s) { source = s; },
    version: () => ({ hash: currentBundle().manifest.hash, built: currentBundle().manifest.built, origin: bundleSource(), checkedAt: lastChecked(), source: source ? source.describe : 'off' }),
  };
  (globalThis as unknown as Record<string, unknown>).__turbothemesEngine = engine;
  // only now: tags already in the page are upgraded the moment the element is defined, and they need the engine
  if (o.picker) definePicker();
  return engine;
}

/**
 * The engine `start()` returned last, for code that did not keep it (the picker element). It lives on globalThis so that a hot reload,
 * or two copies of the package on one page, still talk to the engine that is running.
 */
export const getEngine = (): TurboThemes => {
  const e = (globalThis as unknown as Record<string, TurboThemes | undefined>).__turbothemesEngine;
  if (!e) throw new Error('turbothemes: call start() before using <turbo-themes-picker>.');
  return e;
};

function readSaved(): Appearance | null {
  try { const a = JSON.parse(safeGet(storageKey('appearance')) ?? 'null') as Appearance | null; return a && typeof a.theme === 'string' && typeof a.ui === 'string' ? a : null; } catch { return null; }
}

export { applyAppearance, watchSystemTheme } from './apply.ts';
export { githubSource, urlSource, type Source, type GithubSourceOptions } from './source.ts';
export { checkForUpdates, type UpdateResult, type UpdateStatus } from './updater.ts';
export { getRevision, subscribe, getCatalog, getPalette, getStyle, listPalettes, listStyles, listThemes, counterpartOf, isTheme, isUiStyle } from './catalog.ts';
export { resolveTheme, themeStyle, applyTheme } from './theme.ts';
export { detectLook, deviceLook, effectiveTheme, effectiveUi, setHostInfo } from './device.ts';
export { themeWallpaper, applyWallpaper, getCustomImage, saveCustomWallpaper, clearCustomWallpaper } from './wallpaper.ts';
export { ensureFonts } from './fonts.ts';
export { createPicker, type Picker, type PickerOptions, type PickerState, type ThemeOption, type ThemeGroup } from './picker.ts';
export { definePicker } from './picker-element.ts';
export { hex, readableOn, toHsl, toTriplet } from './color.ts';
export { buildPalette, tokens, TOKEN_NAMES } from './palette.ts';
export { API_VERSION } from './types.ts';
export type * from './types.ts';
