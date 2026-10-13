import { type Catalog, type Manifest } from './types.ts';
/** A complete set of themes: what themes.json, themes.css and manifest.json say together. */
export interface Bundle {
    manifest: Manifest;
    catalog: Catalog;
    css: string;
}
export declare const BUILTIN: Bundle;
/** Puts a bundle to work: the catalog for the engine, the CSS into the page (replacing the previous bundle's). */
export declare function installBundle(b: Bundle, from: 'builtin' | 'downloaded'): void;
export declare const currentBundle: () => Bundle;
export declare const bundleSource: () => "builtin" | "downloaded";
/** A downloaded bundle is only trusted for the engine build it was downloaded against: a newer engine brings newer built-in themes. */
export declare function loadStored(): Bundle | null;
export declare function store(b: Bundle): boolean;
export declare const forgetStored: () => void;
