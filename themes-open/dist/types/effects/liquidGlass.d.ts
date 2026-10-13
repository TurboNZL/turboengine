/**
 * The runtime half of the "macOS Liquid Glass" UI style (the rest is CSS in themes/liquid/style.css).
 *
 * What the CSS cannot do is real refraction. Apple's Liquid Glass bends the light behind it ("lensing") at the
 * rim of every shape, and shows a thin specular highlight along that rim. For the web this is the established
 * recipe (a convex bezel, Snell's law, an SVG displacement map used from `backdrop-filter`; see the notes in
 * docs/LIQUID_GLASS.md), and it is what this file implements:
 *
 *  1. For a rounded rectangle of a given size and corner radius, treat the outer `bezel` pixels as a convex
 *     "squircle" surface, h(t) = (1 - (1 - t)^4)^(1/4), t = distance from the rim / bezel width.
 *  2. A vertical ray hitting that surface is bent by Snell's law (glass index n = 1.5). It then travels down
 *     through the glass and lands displaced towards the middle of the shape. That displacement, per pixel, is
 *     written into an image (red = x, green = y, 128 = no shift) that `feDisplacementMap` applies to the backdrop.
 *     The rays always land INSIDE the element, which matters because `backdrop-filter` only sees what is
 *     under the element's own box.
 *  3. A second image holds the specular rim: a thin line along the edge whose brightness follows how much
 *     the edge faces a light at the top left (and, weaker, the opposite side), as in Apple's material.
 *  4. Elements get the results as CSS variables (`--lg-filter`, `--lg-spec`) and the stylesheet does the rest
 *     (frosting, saturation, tint, shadow, motion).
 *
 * Only Chromium (and so Electron) can use an SVG filter inside `backdrop-filter`. Elsewhere the variables are
 * never set and the style falls back to frosted glass with the same rim highlight and motion.
 */
/** Above this many px² (a dialog, not a button or a menu) the lens skips colour dispersion to stay cheap. */
export declare const BIG_SHAPE = 150000;
export interface LensGeometry {
    w: number;
    h: number;
    r: number;
}
/** Signed distance from (px, py) to a rounded rectangle centred at the origin: negative inside. Also returns the outward normal. */
export declare function roundedRect(px: number, py: number, hw: number, hh: number, r: number): {
    sd: number;
    nx: number;
    ny: number;
};
/** Width of the refracting rim for a shape: bigger shapes read as thicker glass, up to a limit (the rim stays a rim: a menu is not a magnifying glass). */
export declare const bezelFor: (w: number, h: number) => number;
/** Convex squircle surface: height (0 at the rim, 1 on the flat top) and its slope, for t in [0, 1]. */
export declare const squircle: (t: number) => {
    height: number;
    slope: number;
};
/**
 * How far (in px) the background appears to move at distance fraction t from the rim: the ray hits the surface at angle
 * theta1 to the normal, bends to theta2 (Snell), and covers the glass thickness below that point.
 */
export declare function displacementAt(t: number, bezel: number): number;
/** Largest displacement over the bezel (it sets the filter's `scale`). */
export declare function maxDisplacement(bezel: number): number;
export interface LensImages {
    /** PNG data URL for feImage: red/green = displacement, 128 = none */
    map: string;
    /** PNG data URL of the specular rim, transparent elsewhere */
    spec: string;
    /** feDisplacementMap scale (px): twice the largest displacement, because 0.5 is the neutral value */
    scale: number;
}
/** Calls `fn` for every pixel within `band` pixels of the edge of a w x h grid (all pixels when the grid is thin). */
export declare function rimBand(w: number, h: number, band: number, fn: (x: number, y: number) => void): void;
/** Renders both images for one geometry. Pure apart from the canvases; `dpr` only affects the crispness of the rim. */
export declare function renderLens({ w, h, r }: LensGeometry, dpr?: number): LensImages;
/** Chromium is the only engine that accepts an SVG filter inside backdrop-filter. */
export declare function supportsLens(): boolean;
/**
 * The corner radius the shape settles at. Menus and dialogs animate their radius (they start as a pill and grow into
 * their shape), so the computed value on the first frame is the pill's, and a lens built from it was a circle. Their final
 * radius is in the style's variables.
 */
export declare function cornerRadius(el: Element): number;
/** Turn the runtime on or off with the UI style. Safe to call on every settings change. */
export declare function syncLiquidGlass(on: boolean): void;
