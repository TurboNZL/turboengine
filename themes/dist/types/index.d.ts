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
import { type Options } from './options.ts';
import { type UpdateResult } from './updater.ts';
import { type Source } from './source.ts';
import { type Picker } from './picker.ts';
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
export interface Version {
    hash: string;
    built: string;
    origin: 'builtin' | 'downloaded';
    checkedAt: number | null;
    source: string;
}
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
export declare function start(o?: StartOptions): TurboThemes;
/**
 * The engine `start()` returned last, for code that did not keep it (the picker element). It lives on globalThis so that a hot reload,
 * or two copies of the package on one page, still talk to the engine that is running.
 */
export declare const getEngine: () => TurboThemes;
export { applyAppearance, watchSystemTheme } from './apply.ts';
export { githubSource, urlSource, type Source, type GithubSourceOptions } from './source.ts';
export { checkForUpdates, type UpdateResult, type UpdateStatus } from './updater.ts';
export { getRevision, subscribe, getCatalog, getPalette, getStyle, listPalettes, listStyles, listThemes, isTheme, isUiStyle } from './catalog.ts';
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
