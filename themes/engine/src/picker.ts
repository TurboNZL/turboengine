import type { Appearance, DeviceLook, StyleDef } from './types.ts';
import type { TurboThemes } from './index.ts';
import type { UpdateResult } from './updater.ts';
import { getPalette, getRevision, listStyles, listThemes, subscribe as onCatalog } from './catalog.ts';
import { deviceLook } from './device.ts';
import { resolveTheme } from './theme.ts';
import { tokens } from './palette.ts';
import { clearCustomWallpaper, getCustomImage, saveCustomWallpaper } from './wallpaper.ts';

/** One palette as a picker shows it. `colors` are ready-to-use CSS colours for a swatch. */
export interface ThemeOption {
  id: string; label: string; note?: string;
  /** true dark, false light, null for "auto" and "system" (they depend on the device) */
  dark: boolean | null;
  colors: { bg: string; surface: string; accent: string; text: string } | null;
}
export interface ThemeGroup { id: 'device' | 'own' | 'colour' | 'inspired' | 'platform'; label: string; items: ThemeOption[] }

export interface PickerState {
  /** the saved look */
  appearance: Appearance;
  /** what the page shows right now: the saved look, or the one being previewed */
  shown: Appearance;
  previewing: boolean;
  /** bumps whenever the lists of themes changed (an update arrived) */
  revision: number;
}

export interface PickerOptions {
  /** Labels of the theme groups; the defaults are English. */
  groupLabels?: Partial<Record<ThemeGroup['id'], string>>;
}

export interface Picker {
  /** What a settings screen reads. A new object after every change. */
  getState(): PickerState;
  /** `fn` runs after every change of the look, of a preview or of the available themes. Returns an unsubscribe function. */
  subscribe(fn: () => void): () => void;
  /** The palettes, grouped, the way the original app showed them. "auto" and "system" come first in the group "device". */
  themes(filter?: 'all' | 'dark' | 'light'): ThemeGroup[];
  styles(): { id: string; label: string; description: string; font: string; effects?: string[]; isAuto: boolean }[];
  /** Changes part of the look and keeps it. */
  set(patch: Partial<Appearance>): void;
  /** Shows a look without keeping it (hover, focus); `null` ends the preview. */
  preview(patch: Partial<Appearance> | null): void;
  /** The palette made for a style, in the variant that fits the current light or dark; null if the style has none. */
  matchingTheme(styleId?: string): string | null;
  /** Applies matchingTheme() for the current style. */
  useMatchingTheme(): void;
  /** What "match this device" means here. */
  device(): DeviceLook;
  /** The wallpaper picture the user loaded, if any (the generated one needs no storage). */
  wallpaper: { hasCustom(): boolean; setCustom(file: File): Promise<void>; clearCustom(): void; getCustom(): string | null };
  /** Looks for newer themes and tells how it went. */
  checkForUpdates(): Promise<UpdateResult>;
  version: TurboThemes['version'];
  /** Goes back to the themes built into the engine. */
  resetThemes(): void;
  /** Sets the palette and style back to "auto" (match the device) and turns the wallpaper off. */
  resetLook(): void;
}

const GROUPS: [ThemeGroup['id'], string][] = [['device', 'Device'], ['own', 'Standard'], ['colour', 'Colours'], ['inspired', 'Games, apps & devices'], ['platform', 'Platforms']];

const merge = (a: Appearance, p: Partial<Appearance> | null): Appearance => (p ? { ...a, ...p } : a);

const css = (h: number, s: number, l: number) => `hsl(${h} ${s}% ${l}%)`;
const triplet = (t: string) => `hsl(${t})`;

function swatch(id: string): ThemeOption['colors'] {
  const p = getPalette(id);
  if (!p) return null;
  const t = tokens(p);
  const [bh, bs, bl] = p.bg, [ah, as, al] = p.primary;
  return t.bg
    ? { bg: triplet(t.bg), surface: triplet(t.surface), accent: triplet(t.accent), text: triplet(t.fg) }
    : { bg: css(bh, bs, bl), surface: css(bh, bs, Math.min(100, bl + (p.dark ? 4 : 3))), accent: css(ah, as, al), text: p.dark ? css(bh, Math.min(bs, 20), 95) : css(bh, Math.min(bs, 30), 12) };
}

/**
 * The logic of a theme/look settings screen, with no markup: what to list, how to preview, how to keep a choice. Build any UI on it
 * (the `<turbo-themes-picker>` element is one), or use it from React with useSyncExternalStore(picker.subscribe, picker.getState).
 */
export function createPicker(engine: TurboThemes, o: PickerOptions = {}): Picker {
  const listeners = new Set<() => void>();
  let previewPatch: Partial<Appearance> | null = null;
  let state: PickerState | null = null;

  const build = (): PickerState => {
    const appearance = engine.appearance();
    const shown = merge(appearance, previewPatch);
    return { appearance, shown, previewing: previewPatch !== null, revision: getRevision() };
  };
  const emit = () => { state = null; listeners.forEach((fn) => fn()); };
  engine.onAppearance(() => { previewPatch = null; emit(); });
  onCatalog(emit);

  const labels = Object.fromEntries(GROUPS.map(([id, l]) => [id, o.groupLabels?.[id] ?? l])) as Record<ThemeGroup['id'], string>;

  const self: Picker = {
    getState: () => (state ??= build()),
    subscribe(fn) { listeners.add(fn); return () => { listeners.delete(fn); }; },
    themes(filter = 'all') {
      const ok = (t: { dark: boolean | null }) => filter === 'all' || t.dark === null || (filter === 'dark') === t.dark;
      const groups = new Map<ThemeGroup['id'], ThemeOption[]>(GROUPS.map(([id]) => [id, []]));
      for (const t of listThemes()) {
        if (!ok(t)) continue;
        const g = (t.dark === null ? 'device' : (t.group ?? 'colour')) as ThemeGroup['id'];
        groups.get(g)?.push({ id: t.id, label: t.label, note: t.note, dark: t.dark, colors: t.dark === null ? null : swatch(t.id) });
      }
      return GROUPS.map(([id]) => ({ id, label: labels[id], items: groups.get(id)! })).filter((g) => g.items.length);
    },
    styles: () => listStyles().map((s) => ({ id: s.id, label: s.label, description: s.description ?? '', font: s.font ?? 'system-ui', effects: (s as StyleDef).effects, isAuto: s.id === 'auto' })),
    set(patch) { engine.apply(merge(engine.appearance(), patch)); },
    preview(patch) { previewPatch = patch; engine.preview(patch ? merge(engine.appearance(), patch) : null); emit(); },
    matchingTheme(styleId) {
      const a = engine.appearance();
      const id = styleId ?? a.ui;
      const m = listStyles().find((s) => s.id === (id === 'auto' ? deviceLook().ui : id)) as StyleDef | undefined;
      const mt = m?.matching;
      if (!mt) return null;
      return resolveTheme(a.theme).dark ? mt.dark ?? mt.light : mt.light;
    },
    useMatchingTheme() { const t = self.matchingTheme(); if (t) self.set({ theme: t }); },
    device: () => deviceLook(),
    wallpaper: {
      hasCustom: () => getCustomImage() !== null,
      getCustom: () => getCustomImage(),
      async setCustom(file) { await saveCustomWallpaper(file); self.set({ wallpaper: true, wallpaperCustom: true }); },
      clearCustom() { clearCustomWallpaper(); self.set({ wallpaperCustom: false }); },
    },
    checkForUpdates: () => engine.update(),
    version: () => engine.version(),
    resetThemes() { engine.resetToBuiltin(); emit(); },
    resetLook() { self.set({ theme: 'auto', ui: 'auto', glass: 'regular', wallpaper: false }); },
  };
  return self;
}
