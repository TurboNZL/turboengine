import type { Palette, ThemeId } from './types.ts';
/** Resolves "system", "auto" and unknown ids (a palette that was removed in an update) to a real palette. */
export declare const resolveTheme: (id: ThemeId) => Palette;
/**
 * Inline style that applies a palette to one element, for previews. The app's own palettes come from the `data-theme` attribute
 * instead, so they return only the colour scheme.
 */
export declare const themeStyle: (id: ThemeId) => Record<string, string>;
/** Applies the colour palette to the page. The accent colour is part of the palette (there is no separate accent setting). */
export declare function applyTheme(theme: ThemeId): void;
