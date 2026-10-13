import type { ColorIn, Hsl } from './types.ts';
/** "#rrggbb" or "#rgb" -> [h, s, l] (rounded the way the original palettes were). */
export declare const hex: (value: string) => Hsl;
export declare const triplet: (h: number, s: number, l: number) => string;
export declare const toHsl: (c: ColorIn) => Hsl;
/** A colour as the "h s% l%" triplet the CSS variables hold (so `hsl(var(--x) / 0.5)` works). */
export declare const toTriplet: (c: ColorIn) => string;
/** Black or white, whichever reads better on `hexColour`, as an HSL triplet. */
export declare function readableOn(hexColour: string): string;
