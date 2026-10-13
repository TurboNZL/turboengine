import { type Catalog, type Choice, type Palette, type StyleDef, type ThemeId } from './types.ts';
/** Basic shape checks, so a broken download is refused instead of half-applied. Returns the problems found. */
export declare function validateCatalog(c: unknown): string[];
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
}[];
/** Every choice for the style picker, "Match this device" first. */
export declare function listStyles(): (StyleDef | (Choice & {
    matching?: undefined;
}))[];
export declare const getStyle: (id: string) => StyleDef | undefined;
export declare const isTheme: (id: unknown) => id is ThemeId;
export declare const isUiStyle: (id: unknown) => id is string;
export declare const API = 2;
