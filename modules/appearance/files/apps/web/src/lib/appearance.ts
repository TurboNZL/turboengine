import { githubSource, start, type Appearance, type TurboThemes } from 'turbothemes';
import type { DeviceSettings } from './settings.ts';
import { isLayout } from './layout.ts';
import layoutsCss from '../layouts.css?inline';

/**
 * Colours, UI styles, wallpaper and the scripted extras live in the turbothemes package (and its themes repository); layouts are this app's own
 * (lib/layout.ts, layouts.css). This file only starts the engine with what is specific to this app and hands the device settings to it.
 */
let engine: TurboThemes | null = null;

const sourceFor = (s: Pick<DeviceSettings, 'themesToken'>) => githubSource({ token: s.themesToken || undefined });

function ensure(s: DeviceSettings): TurboThemes {
  if (engine) return engine;
  const host = window as unknown as { turbomusicDesktop?: { desktopEnv?: string }; TurboMusicAndroid?: unknown };
  engine = start({
    storagePrefix: 'turbomusic', // keeps the keys it always had: turbomusic.wallpaperImage
    fonts: 'none', // the fonts are bundled (src/fonts.css), so styles work offline
    lens: () => !host.TurboMusicAndroid, // the Android app gets frosted glass without refraction
    host: { desktopEnv: host.turbomusicDesktop?.desktopEnv },
    autoUpdate: s.themeUpdates,
    source: sourceFor(s),
  });
  // the layouts' CSS goes after the themes' stylesheet (the engine appended it to <head>), as it always came after the styles
  const el = document.createElement('style');
  el.id = 'turbomusic-layouts';
  el.textContent = layoutsCss;
  document.head.appendChild(el);
  return engine;
}

/** Applies the whole look from the device settings. */
export function applyAppearance(s: DeviceSettings) {
  ensure(s).apply(s as Appearance);
  document.documentElement.dataset.layout = isLayout(s.layout) ? s.layout : 'side'; // layouts are this app's, not the themes'
}

/** The running engine (start-up, update checks). Only valid after applyAppearance ran once. */
export function themeEngine(s: DeviceSettings): TurboThemes {
  const e = ensure(s);
  e.setSource(s.themeUpdates ? sourceFor(s) : false);
  return e;
}

export { watchSystemTheme } from 'turbothemes';
