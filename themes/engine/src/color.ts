import type { ColorIn, Hsl } from './types.ts';

/** "#rrggbb" or "#rgb" -> [h, s, l] (rounded the way the original palettes were). */
export const hex = (value: string): Hsl => {
  let v = value.replace('#', '');
  if (v.length === 3) v = v.split('').map((c) => c + c).join('');
  const n = parseInt(v, 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [Math.round(((h * 60) + 360) % 360), Math.round(s * 100), Math.round(l * 1000) / 10];
};

export const triplet = (h: number, s: number, l: number) => `${h} ${s}% ${l}%`;

const parseTriplet = (v: string): Hsl => {
  const m = v.match(/^\s*(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*$/);
  if (!m) throw new Error(`not a colour: ${v}`);
  return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
};

export const toHsl = (c: ColorIn): Hsl => Array.isArray(c) ? c : c.startsWith('#') ? hex(c) : parseTriplet(c);
/** A colour as the "h s% l%" triplet the CSS variables hold (so `hsl(var(--x) / 0.5)` works). */
export const toTriplet = (c: ColorIn): string => Array.isArray(c) ? triplet(c[0], c[1], c[2]) : c.startsWith('#') ? triplet(...hex(c)) : c;

/** Black or white, whichever reads better on `hexColour`, as an HSL triplet. */
export function readableOn(hexColour: string): string {
  const n = parseInt(hexColour.replace('#', ''), 16);
  const lin = (c: number) => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  const lum = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return lum > 0.4 ? '240 10% 8%' : '0 0% 100%';
}
