import type { Appearance, DeviceLook } from './types.ts';
import type { TurboThemes } from './index.ts';
import type { UpdateResult } from './updater.ts';
/** One palette as a picker shows it. `colors` are ready-to-use CSS colours for a swatch. */
export interface ThemeOption {
    id: string;
    label: string;
    note?: string;
    /** true dark, false light, null for "auto" and "system" (they depend on the device) */
    dark: boolean | null;
    colors: {
        bg: string;
        surface: string;
        accent: string;
        text: string;
    } | null;
}
export interface ThemeGroup {
    id: 'device' | 'own' | 'colour' | 'inspired' | 'platform';
    label: string;
    items: ThemeOption[];
}
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
    styles(): {
        id: string;
        label: string;
        description: string;
        font: string;
        effects?: string[];
        isAuto: boolean;
    }[];
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
    wallpaper: {
        hasCustom(): boolean;
        setCustom(file: File): Promise<void>;
        clearCustom(): void;
        getCustom(): string | null;
    };
    /** Looks for newer themes and tells how it went. */
    checkForUpdates(): Promise<UpdateResult>;
    version: TurboThemes['version'];
    /** Goes back to the themes built into the engine. */
    resetThemes(): void;
    /** Sets the palette and style back to "auto" (match the device) and turns the wallpaper off. */
    resetLook(): void;
}
/**
 * The logic of a theme/look settings screen, with no markup: what to list, how to preview, how to keep a choice. Build any UI on it
 * (the `<turbo-themes-picker>` element is one), or use it from React with useSyncExternalStore(picker.subscribe, picker.getState).
 */
export declare function createPicker(engine: TurboThemes, o?: PickerOptions): Picker;
