/**
 * Appearance WITHOUT themes (the opt-out of the `appearance` module). The app still uses the turbothemes stylesheet for its hook classes
 * (`import 'turbothemes/base.css'` first in index.css, plus the tailwind preset), so .btn/.card/.input/.bt-* look right in the default
 * palette; it just never starts the theme engine, the picker, the update check or the layout CSS. Delete this file's callers (and
 * AppearanceCard/ThemeUpdates from Settings) when you want themes back, and replace it with the full `appearance.ts` of the module.
 */
import type { DeviceSettings } from './settings.ts';

export function applyAppearance(_s: DeviceSettings): void {
  document.documentElement.dataset.mode = 'dark'; // the default palette is dark; base.css reads data-mode for color-scheme
}
