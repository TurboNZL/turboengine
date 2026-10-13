import type { Appearance } from './types.ts';
import { config, isUiStyle } from './catalog.ts';
import { effectiveUi } from './device.ts';
import { applyTheme } from './theme.ts';
import { applyWallpaper } from './wallpaper.ts';
import { syncEffects } from './effects/index.ts';
import { ensureFonts } from './fonts.ts';

/** Applies the whole look (colour palette, UI style, glass, wallpaper) to the page. Cheap enough to call on every change. */
export function applyAppearance(a: Appearance) {
  applyTheme(a.theme);
  const root = document.documentElement;
  const d = config().defaults;
  const ui = effectiveUi(a.ui);
  root.dataset.ui = isUiStyle(ui) ? ui : d.ui;
  root.dataset.glass = a.glass === 'clear' ? 'clear' : 'regular';
  ensureFonts(root.dataset.ui);
  syncEffects(root.dataset.ui);
  applyWallpaper(a.theme, { enabled: !!a.wallpaper, darkness: a.wallpaperDarkness ?? 0.3, custom: !!a.wallpaperCustom });
}

let watching = false;

/** "System" and "Match this device" follow the OS, so re-apply when its light/dark preference changes. */
export function watchSystemTheme(get: () => Appearance) {
  if (watching || typeof window === 'undefined' || !window.matchMedia) return;
  watching = true;
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const a = get();
    if (a.theme === 'system' || a.theme === 'auto') applyAppearance(a);
  });
}
