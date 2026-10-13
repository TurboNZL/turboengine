/** Runtime options shared by the engine's modules. Set once by start(). */
export interface Options {
    /** Prefix for everything the engine keeps in localStorage ("turbothemes" -> "turbothemes.wallpaperImage"). */
    storagePrefix: string;
    /** "cdn": load a style's @fontsource fonts from jsDelivr when it is used. "none": the app bundles its own fonts. */
    fonts: 'cdn' | 'none';
    fontsCdn: string;
    /** Liquid Glass refraction (an SVG lens behind the glass). Phones and some webviews should say no. */
    lens: boolean | (() => boolean);
}
export declare const options: () => Options;
export declare const setOptions: (o: Partial<Options>) => void;
export declare const storageKey: (name: string) => string;
export declare const safeGet: (key: string) => string | null;
export declare const safeSet: (key: string, value: string) => boolean;
export declare const safeRemove: (key: string) => void;
