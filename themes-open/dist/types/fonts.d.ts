/**
 * Loads the @fontsource fonts a style's font stack names, from a CDN, the first time the style is used or previewed.
 * Apps that bundle their own fonts (so they work offline) start the engine with fonts: 'none'.
 */
export declare function ensureFonts(styleId: string): void;
