import { type Catalog, type Choice, type Palette, type PaletteSpec, type StyleDef, type ThemeId } from './types.ts';
/** Basic shape checks, so a broken download is refused instead of half-applied. Returns the problems found. */
export declare function validateCatalog(c: unknown): string[];
/**
 * Which palette is the light/dark twin of which. A palette's own `pair` wins; otherwise the two palettes a style lists as "matching"
 * (one light, one dark, different) are twins. Always symmetric, always one light and one dark, and a palette has at most one twin.
 */
export declare function buildPairs(palettes: PaletteSpec[], styles: StyleDef[]): Map<ThemeId, ThemeId>;
export declare function setCatalog(catalog: Catalog): void;
export declare const getCatalog: () => Catalog;
export declare const hasCatalog: () => boolean;
export declare const config: () => import("./types.ts").Config;
/** Changes whenever the catalog is replaced; for useSyncExternalStore. */
export declare const getRevision: () => number;
export declare function subscribe(fn: () => void): () => void;
export declare const listPalettes: () => Palette[];
export declare const getPalette: (id: ThemeId) => Palette | undefined;
/** Every choice for the colour picker, special entries first: [{id:"auto"}, {id:"system"}, ...palettes]. */
export declare function listThemes(): {
    id: string;
    label: string;
    dark: boolean | null;
    note?: string;
    group?: string;
    pair?: ThemeId;
}[];
/** Every choice for the style picker, "Match this device" first. */
export declare function listStyles(): (StyleDef | (Choice & {
    matching?: undefined;
}))[];
/** The light twin of a dark palette, the dark twin of a light one; undefined when it has none (some looks exist in one mode only). */
export declare const counterpartOf: (id: ThemeId) => ThemeId | undefined;
export declare const getStyle: (id: string) => StyleDef | undefined;
export declare const isTheme: (id: unknown) => id is ThemeId;
export declare const isUiStyle: (id: unknown) => id is string;
export declare const API = 2;
