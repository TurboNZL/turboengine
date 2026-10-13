import type { Appearance } from './types.ts';
/** Applies the whole look (colour palette, UI style, glass, wallpaper) to the page. Cheap enough to call on every change. */
export declare function applyAppearance(a: Appearance): void;
/** "System" and "Match this device" follow the OS, so re-apply when its light/dark preference changes. */
export declare function watchSystemTheme(get: () => Appearance): void;
