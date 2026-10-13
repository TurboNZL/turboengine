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

let current: Options = { storagePrefix: 'turbothemes', fonts: 'cdn', fontsCdn: 'https://cdn.jsdelivr.net/npm', lens: true };

export const options = (): Options => current;
export const setOptions = (o: Partial<Options>) => { current = { ...current, ...o }; };

export const storageKey = (name: string) => `${current.storagePrefix}.${name}`;

export const safeGet = (key: string): string | null => { try { return window.localStorage.getItem(key); } catch { return null; } };
export const safeSet = (key: string, value: string): boolean => { try { window.localStorage.setItem(key, value); return true; } catch { return false; } };
export const safeRemove = (key: string) => { try { window.localStorage.removeItem(key); } catch { /* storage unavailable */ } };
