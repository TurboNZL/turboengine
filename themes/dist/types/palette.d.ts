import type { Palette, PaletteSpec } from './types.ts';
/** Works out a palette's colours from its spec. */
export declare function buildPalette(spec: PaletteSpec): Palette;
/** The tokens the stylesheets read (`hsl(var(--surface))` ...), translated from a palette's shadcn-style values. Empty for an own palette. */
export declare const tokens: (p: Palette) => Record<string, string>;
/** The names of the tokens an inline theme can set. */
export declare const TOKEN_NAMES: readonly ["bg", "surface", "raised", "line", "hover", "fg", "muted", "accent", "accent-fg", "good", "warn", "bad", "top"];
