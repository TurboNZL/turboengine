import type { Palette, ThemeId } from './types.ts';
import { config, getPalette, listPalettes } from './catalog.ts';
import { effectiveTheme, prefersDark } from './device.ts';
import { TOKEN_NAMES, tokens } from './palette.ts';

/** Resolves "system", "auto" and unknown ids (a palette that was removed in an update) to a real palette. */
export const resolveTheme = (id: ThemeId): Palette => {
  const c = config();
  const real = id === 'system' ? (prefersDark() ? c.system.dark : c.system.light) : effectiveTheme(id);
  return getPalette(real) ?? getPalette(c.defaults.theme) ?? listPalettes()[0];
};

/**
 * Inline style that applies a palette to one element, for previews. The app's own palettes come from the `data-theme` attribute
 * instead, so they return only the colour scheme.
 */
export const themeStyle = (id: ThemeId): Record<string, string> => {
  const p = resolveTheme(id);
  const style: Record<string, string> = { colorScheme: p.dark ? 'dark' : 'light' };
  for (const [k, v] of Object.entries(tokens(p))) style[`--${k}`] = v;
  return style;
};

/** Applies the colour palette to the page. The accent colour is part of the palette (there is no separate accent setting). */
export function applyTheme(theme: ThemeId) {
  const root = document.documentElement;
  const p = resolveTheme(theme);
  root.dataset.theme = p.id;
  root.dataset.mode = p.dark ? 'dark' : 'light';
  root.style.colorScheme = p.dark ? 'dark' : 'light';
  const t = tokens(p);
  for (const name of TOKEN_NAMES) {
    if (t[name]) root.style.setProperty(`--${name}`, t[name]);
    else root.style.removeProperty(`--${name}`);
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', `hsl(${p.bg[0]} ${p.bg[1]}% ${p.bg[2]}%)`);
}
