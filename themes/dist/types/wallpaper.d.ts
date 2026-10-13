import type { ThemeId } from "./types.ts";
export type WallpaperSettings = {
    enabled: boolean;
    /** 0 (as is) to 0.9 (nearly black): opacity of a black layer over the wallpaper. */
    darkness: number;
    custom: boolean;
};
export declare const getCustomImage: () => string | null;
/** The built-in wallpaper for a theme, as a CSS `background` value. */
export declare const themeWallpaper: (id: ThemeId) => string;
/** Applies the saved wallpaper settings (or the preview override) to the page. */
export declare const applyWallpaper: (theme: ThemeId, settings: WallpaperSettings) => void;
/** Shrinks a picked image so it fits in browser storage, and saves it as the custom wallpaper. */
export declare const saveCustomWallpaper: (file: File) => Promise<void>;
export declare const clearCustomWallpaper: () => void;
