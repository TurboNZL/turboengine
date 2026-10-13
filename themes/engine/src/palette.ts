import type { Hsl, Palette, PaletteSpec } from './types.ts';
import { toHsl, toTriplet, triplet as t } from './color.ts';

const NAMES: Record<string, string> = {
  card: 'card', popover: 'popover', secondary: 'secondary', muted: 'muted', accent: 'accent', border: 'border', input: 'input', mutedFg: 'muted-foreground', fg: 'foreground',
};

/** Applies a spec's exact colour overrides on top of the derived ones. */
const applyOverrides = (vars: Record<string, string>, spec: PaletteSpec) => {
  const ov = spec.overrides;
  if (ov) {
    for (const [k, v] of Object.entries(ov)) {
      if (!v) continue;
      vars[NAMES[k]] = toTriplet(v);
      if (k === 'fg') for (const x of ['card-foreground', 'popover-foreground', 'secondary-foreground', 'accent-foreground']) vars[x] = toTriplet(v);
      if (k === 'card' && !ov.popover) vars.popover = toTriplet(v);
    }
  }
  for (const [k, v] of Object.entries(spec.vars ?? {})) vars[k] = toTriplet(v);
  return vars;
};

const darkVars = (s: PaletteSpec, bg: Hsl, primary: Hsl): Record<string, string> => {
  const [h, sat, l] = bg;
  const k = s.step ?? 1;
  const lightAccent = primary[2] > 62;
  const fg = s.fg !== undefined ? toTriplet(s.fg) : t(h, Math.min(sat, 30), 95);
  return applyOverrides({
    background: t(h, sat, l),
    foreground: fg,
    card: t(h, sat, l + 4.5 * k),
    'card-foreground': fg,
    popover: t(h, sat, l + 4.5 * k),
    'popover-foreground': fg,
    primary: t(...primary),
    'primary-foreground': s.onPrimary !== undefined ? toTriplet(s.onPrimary) : (lightAccent ? t(h, 40, 10) : '0 0% 100%'),
    secondary: t(h, Math.min(sat, 30), l + 10 * k),
    'secondary-foreground': fg,
    muted: t(h, Math.min(sat, 30), l + 10 * k),
    'muted-foreground': s.mutedFg !== undefined ? toTriplet(s.mutedFg) : t(h, Math.min(sat, 16), 68),
    accent: t(h, Math.min(sat, 30), l + 15 * k),
    'accent-foreground': fg,
    destructive: '0 62.8% 40%',
    'destructive-foreground': '0 0% 98%',
    border: t(h, Math.min(sat, 30), l + 11 * k),
    input: t(h, Math.min(sat, 30), l + 15 * k),
    ring: t(primary[0], primary[1], Math.min(primary[2] + 4, 80)),
    positive: '142 69% 58%',
    negative: '0 91% 71%',
  }, s);
};

const lightVars = (s: PaletteSpec, bg: Hsl, primary: Hsl): Record<string, string> => {
  const [h, sat, l] = bg;
  const fg = s.fg !== undefined ? toTriplet(s.fg) : t(222, 47, 11);
  return applyOverrides({
    background: t(h, sat, l),
    foreground: fg,
    card: t(h, sat, Math.min(l + 3.5, 100)),
    'card-foreground': fg,
    popover: t(h, sat, Math.min(l + 3.5, 100)),
    'popover-foreground': fg,
    primary: t(...primary),
    'primary-foreground': s.onPrimary !== undefined ? toTriplet(s.onPrimary) : '0 0% 100%',
    secondary: t(h, sat, l - 4.5),
    'secondary-foreground': fg,
    muted: t(h, sat, l - 4),
    'muted-foreground': s.mutedFg !== undefined ? toTriplet(s.mutedFg) : t(h, 14, 38),
    accent: t(h, sat, l - 9),
    'accent-foreground': fg,
    destructive: '0 84.2% 60.2%',
    'destructive-foreground': '210 40% 98%',
    border: t(h, sat, l - 9),
    input: t(h, sat, l - 12),
    ring: t(...primary),
    positive: '142 71% 30%',
    negative: '0 72% 45%',
  }, s);
};

/** Works out a palette's colours from its spec. */
export function buildPalette(spec: PaletteSpec): Palette {
  const bg = toHsl(spec.bg), primary = toHsl(spec.primary), dark = spec.mode === 'dark';
  return {
    id: spec.id, label: spec.label, dark, bg, primary, motif: spec.motif, own: spec.own, note: spec.note, group: spec.group ?? 'colour',
    wallpaper: spec.wallpaper ? { bg: spec.wallpaper.bg ? toHsl(spec.wallpaper.bg) : undefined, primary: spec.wallpaper.primary ? toHsl(spec.wallpaper.primary) : undefined } : undefined,
    vars: spec.own ? {} : dark ? darkVars(spec, bg, primary) : lightVars(spec, bg, primary),
  };
}

/** The tokens the stylesheets read (`hsl(var(--surface))` ...), translated from a palette's shadcn-style values. Empty for an own palette. */
export const tokens = (p: Palette): Record<string, string> => {
  const v = p.vars;
  if (!v.background) return {};
  const [h, s, l] = p.primary;
  return {
    bg: v.background, surface: v.card, raised: v.secondary, line: v.border, hover: v.accent,
    fg: v.foreground, muted: v['muted-foreground'],
    accent: v.primary, 'accent-fg': v['primary-foreground'],
    good: v.positive, bad: v.negative,
    warn: p.dark ? '42 92% 58%' : '38 90% 40%',
    top: `${h} ${Math.max(s, 60)}% ${p.dark ? Math.max(l, 64) : Math.min(l, 42)}%`,
  };
};

/** The names of the tokens an inline theme can set. */
export const TOKEN_NAMES = ['bg', 'surface', 'raised', 'line', 'hover', 'fg', 'muted', 'accent', 'accent-fg', 'good', 'warn', 'bad', 'top'] as const;
