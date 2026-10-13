/** The shapes shared by the engine, the theme folders and the bundle the updater downloads. */
/** Bump when the engine can no longer understand a bundle (a new theme.json field it needs, a new hook in base.css). */
export declare const API_VERSION = 2;
export type Hsl = [number, number, number];
/** "#rrggbb", "#rgb", an HSL triplet string ("222 47% 11%") or an [h, s, l] array. */
export type ColorIn = string | Hsl;
export type Motif = 'stars' | 'waves' | 'hills' | 'grid' | 'dots' | 'rays' | 'peaks';
export type PaletteGroup = 'own' | 'colour' | 'platform' | 'inspired';
export type ThemeId = string;
export type UiStyleId = string;
/** One colour palette, as written in themes/<folder>/theme.json. */
export interface PaletteSpec {
    id: ThemeId;
    label: string;
    mode: 'dark' | 'light';
    /** Page background. Also drives the wallpaper and the browser's theme colour. */
    bg: ColorIn;
    /** Accent colour. */
    primary: ColorIn;
    /** Text on the accent colour (default: white, or near black on a light accent). */
    onPrimary?: ColorIn;
    fg?: ColorIn;
    mutedFg?: ColorIn;
    motif: Motif;
    /** Dark palettes: how much lighter each stacked surface gets (default 1). */
    step?: number;
    /** Exact colours for individual surfaces, for palettes that copy a real design system. */
    overrides?: Partial<Record<'card' | 'popover' | 'secondary' | 'muted' | 'accent' | 'border' | 'input' | 'mutedFg' | 'fg', ColorIn>>;
    /** Extra variables by their shadcn-style name (positive, negative, ...), applied last. */
    vars?: Record<string, ColorIn>;
    /** The app's own palette: its colours come from the palette.css next to the theme.json, not from this spec. */
    own?: boolean;
    /** The wallpaper uses these instead of bg/primary (Marshmallow's chrome is blue, its wallpaper pink). */
    wallpaper?: {
        bg?: ColorIn;
        primary?: ColorIn;
    };
    /** Text shown next to the palette in a picker (the app's own palettes). */
    note?: string;
    /** Where the colours come from. Documentation only. */
    source?: string;
    group?: PaletteGroup;
    order?: number;
}
/** A palette after its colours are worked out. */
export interface Palette {
    id: ThemeId;
    label: string;
    dark: boolean;
    bg: Hsl;
    primary: Hsl;
    /** shadcn-style variable values (empty for an own palette). */
    vars: Record<string, string>;
    motif: Motif;
    own?: boolean;
    wallpaper?: {
        bg?: Hsl;
        primary?: Hsl;
    };
    note?: string;
    group: PaletteGroup;
}
export interface FontNeed {
    package: string;
    weights: number[];
    italic?: number[];
}
export interface StyleDef {
    id: UiStyleId;
    label: string;
    description: string;
    /** First choice of the style's font stack (the whole stack is in its style.css). */
    font: string;
    /** Palettes made for this style: [light, dark]. Some styles have one palette only. */
    matching?: {
        light: ThemeId;
        dark?: ThemeId;
    };
    /** @fontsource packages the style's font stack uses (loaded from a CDN when the app asks for it). */
    fonts?: FontNeed[];
    /** Scripted extras the engine switches on for this style. */
    effects?: string[];
    order?: number;
}
/** A rule that maps "the device this runs on" to a look. The first matching rule wins. */
export interface DeviceCond {
    ua?: string;
    platform?: string;
    env?: string;
    minTouchPoints?: number;
    all?: DeviceCond[];
    any?: DeviceCond[];
}
export interface DeviceRule {
    name: string;
    when: DeviceCond;
    ui: UiStyleId;
    light: ThemeId;
    dark: ThemeId;
}
export interface Choice {
    id: string;
    label: string;
    description?: string;
    note?: string;
    font?: string;
}
export interface Config {
    defaults: {
        theme: ThemeId;
        ui: UiStyleId;
    };
    /** What "system" resolves to. */
    system: {
        dark: ThemeId;
        light: ThemeId;
    };
    /** The special first entries of the pickers ("Match this device", "System"). */
    choices: {
        theme: Choice[];
        ui: Choice[];
    };
    /** Where the fallback look goes when no device rule matches. */
    fallbackDevice: {
        name: string;
        ui: UiStyleId;
        light: ThemeId;
        dark: ThemeId;
    };
    devices: DeviceRule[];
}
/** Everything the engine needs to know about the themes. This is themes.json. */
export interface Catalog {
    apiVersion: number;
    palettes: PaletteSpec[];
    styles: StyleDef[];
    config: Config;
}
/** The small file the updater reads first. */
export interface Manifest {
    apiVersion: number;
    /** Content hash of themes.json + themes.css. Changes when (and only when) a theme changes. */
    hash: string;
    /** Human readable build time, for the "last updated" line. */
    built: string;
    files: {
        catalog: string;
        css: string;
    };
}
/** What the picker in an app stores and passes to apply(). */
export interface Appearance {
    /** palette id, "auto" (match the device) or "system" (follow light/dark) */
    theme: string;
    /** style id or "auto" */
    ui: string;
    glass?: 'regular' | 'clear';
    wallpaper?: boolean;
    wallpaperDarkness?: number;
    wallpaperCustom?: boolean;
}
export interface DeviceInfo {
    ua: string;
    platform?: string;
    touchPoints?: number;
    desktopEnv?: string;
}
export interface DeviceLook {
    ui: UiStyleId;
    light: ThemeId;
    dark: ThemeId;
    name: string;
}
