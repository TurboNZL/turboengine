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

import { options } from '../options.ts';

const NS = 'http://www.w3.org/2000/svg';

/** Floating chrome that is glass in Apple's design: the navigation layer, menus, dialogs and the controls in the bars. */
const TARGETS = '.bt-side, .bt-player, .bt-tabbar, .bt-menu, .bt-window';
/** Elements that animate their lens when they appear (they get a filter of their own). */
const MATERIALIZE = '.bt-menu, .bt-window';

/** Above this many px² (a dialog, not a button or a menu) the lens skips colour dispersion to stay cheap. */
export const BIG_SHAPE = 150_000;

/** Refractive index of the glass. */
const N_GLASS = 1.5;
/** Direction towards the light (top left), as a unit vector in screen space (y points down). */
const LIGHT = (() => { const x = -0.62, y = -0.78, l = Math.hypot(x, y); return [x / l, y / l] as const; })();

export interface LensGeometry { w: number; h: number; r: number }

/** Signed distance from (px, py) to a rounded rectangle centred at the origin: negative inside. Also returns the outward normal. */
export function roundedRect(px: number, py: number, hw: number, hh: number, r: number) {
  const qx = Math.abs(px) - (hw - r), qy = Math.abs(py) - (hh - r);
  const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
  const sd = Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
  const sx = px < 0 ? -1 : 1, sy = py < 0 ? -1 : 1;
  let nx: number, ny: number;
  if (qx > 0 && qy > 0) { const l = Math.hypot(qx, qy) || 1; nx = (qx / l) * sx; ny = (qy / l) * sy; }
  else if (qx > qy) { nx = sx; ny = 0; }
  else { nx = 0; ny = sy; }
  return { sd, nx, ny };
}

/** Width of the refracting rim for a shape: bigger shapes read as thicker glass, up to a limit (the rim stays a rim: a menu is not a magnifying glass). */
export const bezelFor = (w: number, h: number) => Math.max(8, Math.min(28, Math.min(w, h) * 0.22));

/** Convex squircle surface: height (0 at the rim, 1 on the flat top) and its slope, for t in [0, 1]. */
export const squircle = (t: number) => {
  const u = Math.pow(1 - t, 4);
  const height = Math.pow(1 - u, 0.25);
  const slope = u === 1 ? Infinity : Math.pow(1 - t, 3) / Math.pow(1 - u, 0.75);
  return { height, slope };
};

/**
 * How far (in px) the background appears to move at distance fraction t from the rim: the ray hits the surface at angle
 * theta1 to the normal, bends to theta2 (Snell), and covers the glass thickness below that point.
 */
export function displacementAt(t: number, bezel: number): number {
  const bezelHeight = bezel * 0.9;
  const base = bezelHeight * 0.5; // the slab under the bezel
  const { height, slope } = squircle(t);
  const theta1 = Math.min(Math.atan(slope * (bezelHeight / bezel)), (Math.PI / 180) * 86);
  const theta2 = Math.asin(Math.sin(theta1) / N_GLASS);
  return (base + bezelHeight * height) * Math.tan(theta1 - theta2);
}

/** Largest displacement over the bezel (it sets the filter's `scale`). */
export function maxDisplacement(bezel: number): number {
  let m = 0;
  for (let i = 0; i <= 1024; i++) m = Math.max(m, displacementAt(i / 1024, bezel));
  return m;
}

export interface LensImages {
  /** PNG data URL for feImage: red/green = displacement, 128 = none */
  map: string;
  /** PNG data URL of the specular rim, transparent elsewhere */
  spec: string;
  /** feDisplacementMap scale (px): twice the largest displacement, because 0.5 is the neutral value */
  scale: number;
}

const canvasFor = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = Math.max(1, w); c.height = Math.max(1, h); return c; };

/** Calls `fn` for every pixel within `band` pixels of the edge of a w x h grid (all pixels when the grid is thin). */
export function rimBand(w: number, h: number, band: number, fn: (x: number, y: number) => void) {
  for (let y = 0; y < h; y++) {
    if (y < band || y >= h - band || band * 2 >= w) { for (let x = 0; x < w; x++) fn(x, y); continue; }
    for (let x = 0; x < band; x++) fn(x, y);
    for (let x = w - band; x < w; x++) fn(x, y);
  }
}

/** Renders both images for one geometry. Pure apart from the canvases; `dpr` only affects the crispness of the rim. */
export function renderLens({ w, h, r }: LensGeometry, dpr = 1): LensImages {
  const bezel = bezelFor(w, h);
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  const maxD = maxDisplacement(bezel) || 1;
  const scale = maxD * 2;
  const hw = w / 2, hh = h / 2;

  // displacement map: kept at most ~640 px on the long side (it is stretched back to the element by the filter)
  const ms = Math.min(1, 640 / Math.max(w, h));
  const mw = Math.max(2, Math.round(w * ms)), mh = Math.max(2, Math.round(h * ms));
  const mc = canvasFor(mw, mh), mctx = mc.getContext('2d')!;
  const mimg = mctx.createImageData(mw, mh);
  // the profile only depends on t, so look it up instead of calling atan/asin for every pixel
  const STEPS = 128;
  const profile = Array.from({ length: STEPS + 1 }, (_, i) => displacementAt(i / STEPS, bezel));
  // everything deeper than the bezel is "no shift" (128), so only the rim band is computed: a tall dialog has ~10x fewer pixels to
  // do than its area, which is what made opening one stall the page
  for (let i = 0; i < mimg.data.length; i += 4) { mimg.data[i] = 128; mimg.data[i + 1] = 128; mimg.data[i + 2] = 128; mimg.data[i + 3] = 255; }
  rimBand(mw, mh, Math.ceil((bezel + radius * 0.3 + 2) * ms), (x, y) => {
    const px = ((x + 0.5) / ms) - hw, py = ((y + 0.5) / ms) - hh;
    const { sd, nx, ny } = roundedRect(px, py, hw, hh, radius);
    const depth = -sd; // distance inside the rim
    if (depth >= bezel) return;
    const d = profile[Math.max(0, Math.min(STEPS, Math.round((Math.max(depth, 0) / bezel) * STEPS)))];
    const i = (y * mw + x) * 4;
    mimg.data[i] = Math.round(255 * (0.5 - (nx * d) / scale));
    mimg.data[i + 1] = Math.round(255 * (0.5 - (ny * d) / scale)); // towards the inside
  });
  mctx.putImageData(mimg, 0, 0);

  // specular rim, at device resolution (capped), a ~1.2 px line plus a faint wide inner glow
  const ss = Math.min(Math.max(dpr, 1), 2, Math.sqrt(900_000 / (w * h)) || 1);
  const sw = Math.max(2, Math.round(w * ss)), sh = Math.max(2, Math.round(h * ss));
  const sc = canvasFor(sw, sh), sctx = sc.getContext('2d')!;
  const simg = sctx.createImageData(sw, sh);
  rimBand(sw, sh, Math.ceil((10 + radius * 0.3) * ss), (x, y) => {
    const px = ((x + 0.5) / ss) - hw, py = ((y + 0.5) / ss) - hh;
    const { sd, nx, ny } = roundedRect(px, py, hw, hh, radius);
    const depth = -sd;
    if (depth < 0 || depth > 9) return;
    const facing = nx * LIGHT[0] + ny * LIGHT[1]; // 1 = edge faces the light
    const lobe = 0.1 + 0.9 * Math.pow(Math.max(facing, 0), 1.6) + 0.5 * Math.pow(Math.max(-facing, 0), 1.6);
    const line = Math.exp(-Math.pow(depth / 1.05, 2)) + 0.16 * Math.exp(-Math.pow(depth / 5, 2));
    const a = Math.min(1, line * lobe);
    const i = (y * sw + x) * 4;
    simg.data[i] = simg.data[i + 1] = simg.data[i + 2] = 255;
    simg.data[i + 3] = Math.round(255 * a);
  });
  sctx.putImageData(simg, 0, 0);

  return { map: mc.toDataURL('image/png'), spec: sc.toDataURL('image/png'), scale };
}

interface Lens { id: string; node: SVGFilterElement; bases: { el: SVGFEDisplacementMapElement; base: number }[]; spec: string; /** resolves when the displacement image is decoded; a filter whose image is not ready yet shows nothing */ ready: Promise<void> }

let root: SVGSVGElement | null = null;
let active = false;
let mo: MutationObserver | null = null;
let ro: ResizeObserver | null = null;
let scanQueued = false;
let uid = 0;
const cache = new Map<string, Lens>();
const applied = new WeakMap<Element, { key: string; lens: Lens }>();
const tracked = new Set<Element>();
const animations = new WeakMap<Element, number>();
const rebuild = new WeakMap<Element, number>();

const lensAllowed = () => { const l = options().lens; return typeof l === 'function' ? l() : l; };

/** Chromium is the only engine that accepts an SVG filter inside backdrop-filter. */
export function supportsLens(): boolean {
  if (typeof CSS === 'undefined' || typeof navigator === 'undefined') return false;
  const brands = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands.map((b) => b.brand) ?? [];
  const chromium = brands.includes('Chromium') || (/Chrome\//.test(navigator.userAgent) && !/Edg\/.*Firefox/.test(navigator.userAgent));
  // Phones (touch screens, the Android app) get frosted glass without the refraction: re-running an SVG filter behind scrolling content
  // is what made it lag there. Pointer-driven Chromium (browser, Electron) keeps the lens.
  if (window.matchMedia?.('(pointer: coarse)').matches || !lensAllowed()) return false;
  return chromium && CSS.supports('backdrop-filter', 'url(#x) blur(1px)');
}

function buildFilter(key: string, g: LensGeometry, dpr: number, unique: boolean): Lens {
  const img = renderLens(g, dpr);
  const id = `lg-${unique ? 'u' : 'k'}${++uid}`;
  const f = document.createElementNS(NS, 'filter');
  f.setAttribute('id', id);
  f.setAttribute('color-interpolation-filters', 'sRGB'); // the map holds raw numbers, not colours
  f.setAttribute('filterUnits', 'userSpaceOnUse');
  f.setAttribute('x', '0'); f.setAttribute('y', '0'); f.setAttribute('width', String(g.w)); f.setAttribute('height', String(g.h));
  const image = document.createElementNS(NS, 'feImage');
  image.setAttribute('href', img.map); image.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', img.map);
  image.setAttribute('x', '0'); image.setAttribute('y', '0'); image.setAttribute('width', String(g.w)); image.setAttribute('height', String(g.h));
  image.setAttribute('preserveAspectRatio', 'none'); image.setAttribute('result', 'map');
  f.appendChild(image);
  const bases: Lens['bases'] = [];
  if (g.w * g.h > BIG_SHAPE) {
    // a big dialog: one displacement instead of three plus mixing. The colour fringe is only visible on a thin rim, and the filter's
    // cost grows with the area, so this is what keeps the album editor smooth
    const d = document.createElementNS(NS, 'feDisplacementMap');
    d.setAttribute('in', 'SourceGraphic'); d.setAttribute('in2', 'map'); d.setAttribute('scale', String(img.scale));
    d.setAttribute('xChannelSelector', 'R'); d.setAttribute('yChannelSelector', 'G'); d.setAttribute('result', 'out');
    f.appendChild(d); bases.push({ el: d, base: img.scale });
    root!.appendChild(f);
    const probe = new Image(); probe.src = img.map;
    const lens: Lens = { id, node: f, bases, spec: img.spec, ready: (probe.decode ? probe.decode() : Promise.resolve()).catch(() => undefined) };
    if (!unique) cache.set(key, lens);
    return lens;
  }
  // a hint of dispersion: red, green and blue are displaced by slightly different amounts, so edges fringe like real glass
  const bands: [string, number, string][] = [['r', 1, '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'], ['g', 0.955, '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'], ['b', 0.91, '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0']];
  for (const [name, k, matrix] of bands) {
    const d = document.createElementNS(NS, 'feDisplacementMap');
    d.setAttribute('in', 'SourceGraphic'); d.setAttribute('in2', 'map'); d.setAttribute('scale', String(img.scale * k));
    d.setAttribute('xChannelSelector', 'R'); d.setAttribute('yChannelSelector', 'G'); d.setAttribute('result', `d${name}`);
    f.appendChild(d); bases.push({ el: d, base: img.scale * k });
    const m = document.createElementNS(NS, 'feColorMatrix');
    m.setAttribute('in', `d${name}`); m.setAttribute('type', 'matrix'); m.setAttribute('values', matrix); m.setAttribute('result', name);
    f.appendChild(m);
  }
  for (const [a, b, out] of [['r', 'g', 'rg'], ['rg', 'b', 'out']] as const) {
    const bl = document.createElementNS(NS, 'feBlend');
    bl.setAttribute('in', a); bl.setAttribute('in2', b); bl.setAttribute('mode', 'screen'); bl.setAttribute('result', out);
    f.appendChild(bl);
  }
  root!.appendChild(f);
  const probe = new Image();
  probe.src = img.map;
  const ready = (probe.decode ? probe.decode() : Promise.resolve()).catch(() => undefined);
  const lens: Lens = { id, node: f, bases, spec: img.spec, ready };
  if (!unique) cache.set(key, lens);
  return lens;
}

const isLiquidScope = (el: Element) => (el.closest('[data-ui]') as HTMLElement | null)?.dataset.ui === 'liquid';

/**
 * The corner radius the shape settles at. Menus and dialogs animate their radius (they start as a pill and grow into
 * their shape), so the computed value on the first frame is the pill's, and a lens built from it was a circle. Their final
 * radius is in the style's variables.
 */
export function cornerRadius(el: Element): number {
  const cs = getComputedStyle(el);
  const v = el.matches('.bt-menu') ? '--menu-r' : el.matches('.bt-window') ? '--win-r' : null;
  const settled = v ? parseFloat(cs.getPropertyValue(v)) : NaN;
  return Number.isFinite(settled) ? settled : parseFloat(cs.borderTopLeftRadius) || 0;
}

function apply(el: HTMLElement, settled = false) {
  // layout size, not getBoundingClientRect: that one includes transforms, so an element animating in would look like a new shape every frame
  const w = el.offsetWidth, h = el.offsetHeight;
  if (w < 4 || h < 4 || !isLiquidScope(el)) return;
  const radius = Math.min(cornerRadius(el), w / 2, h / 2);
  const dpr = window.devicePixelRatio || 1;
  // shapes within 4 px of each other share a lens, so the many equal buttons cost one filter
  const unique = el.matches(MATERIALIZE);
  const q = (n: number) => Math.max(4, Math.round(n / 4) * 4);
  const key = unique ? `${w}x${h}r${Math.round(radius)}` : `${q(w)}x${q(h)}r${Math.round(radius)}@${dpr}`;
  const prev = applied.get(el);
  if (prev?.key === key) { clearTimeout(rebuild.get(el)); rebuild.delete(el); return; }
  // a menu or dialog whose size keeps changing (content loading in) is rebuilt once it has settled, not at every step
  if (prev && unique && !settled) {
    clearTimeout(rebuild.get(el));
    rebuild.set(el, window.setTimeout(() => { rebuild.delete(el); if (el.isConnected) apply(el as HTMLElement, true); }, 140) as unknown as number);
    return;
  }
  const g = { w: unique ? w : q(w), h: unique ? h : q(h), r: radius };
  const lens = (!unique && cache.get(key)) || buildFilter(key, g, dpr, unique);
  if (prev && unique) prev.lens.node.remove();
  applied.set(el, { key, lens });
  el.style.setProperty('--lg-spec', `url("${lens.spec}")`);
  if (!supportsLens()) return;
  const first = !prev;
  // switch to the new lens only once its image has decoded, so the glass never flashes unfiltered
  // A dialog also waits for its entrance animation: re-running a full-size refraction filter on every frame of a scale animation is
  // what made big dialogs (the album editor) stutter; they open as frosted glass and the lens then materializes.
  const entering = first && unique && el.matches('.bt-window') ? Promise.allSettled(el.getAnimations().map((a) => a.finished)) : Promise.resolve();
  void Promise.all([lens.ready, entering]).then(() => {
    if (applied.get(el)?.lens !== lens || !el.isConnected) return;
    el.style.setProperty('--lg-filter', `url(#${lens.id})`);
    if (first && unique) materialize(el, lens);
  });
}

/**
 * Ease the lens in from nothing (Apple: glass materializes by modulating its light bending, not by fading). Changing an SVG
 * filter's scale re-renders it, which is the expensive part, so this takes a handful of steps timed for the eye instead of
 * one per frame: on a 200 Hz display a per-frame loop did a thousand filter updates for one menu.
 */
const STEPS = [0.28, 0.58, 0.8, 0.93, 1];
function materialize(el: Element, lens: Lens, ms = 300) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const set = (k: number) => lens.bases.forEach(({ el: d, base }) => d.setAttribute('scale', String(base * k)));
  set(0);
  STEPS.forEach((k, i) => animations.set(el, window.setTimeout(() => { if (lens.node.isConnected) set(k); }, ((i + 1) / STEPS.length) * ms) as unknown as number));
}

function scan() {
  scanQueued = false;
  if (!active) return;
  const found = new Set<Element>(document.querySelectorAll(TARGETS));
  for (const el of found) {
    if (!tracked.has(el)) { tracked.add(el); ro?.observe(el); }
    apply(el as HTMLElement);
  }
  for (const el of [...tracked]) {
    if (!el.isConnected) {
      tracked.delete(el); ro?.unobserve(el);
      const a = applied.get(el); if (a && a.lens.id.startsWith('lg-u')) a.lens.node.remove();
      applied.delete(el);
    }
  }
}
const queueScan = () => { if (!scanQueued) { scanQueued = true; requestAnimationFrame(scan); } };

/** The light follows the pointer: the glow under a control is centred where the pointer is (and starts there when pressed). */
function onPointer(e: PointerEvent) {
  const t = (e.target as Element | null)?.closest?.('.btn, .bt-nav, .bt-tab, [role="menuitem"], .lg-glow') as HTMLElement | null;
  if (!t) return;
  const r = t.getBoundingClientRect();
  t.style.setProperty('--mx', `${e.clientX - r.left}px`);
  t.style.setProperty('--my', `${e.clientY - r.top}px`);
}
const recede = () => document.documentElement.classList.add('lg-inactive');
const restore = () => document.documentElement.classList.remove('lg-inactive');

/** Turn the runtime on or off with the UI style. Safe to call on every settings change. */
export function syncLiquidGlass(on: boolean) {
  if (typeof document === 'undefined') return;
  if (on === active) { if (on) queueScan(); return; }
  active = on;
  if (on) {
    root = document.createElementNS(NS, 'svg');
    root.setAttribute('aria-hidden', 'true'); root.setAttribute('width', '0'); root.setAttribute('height', '0');
    root.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none;overflow:hidden';
    root.appendChild(document.createElementNS(NS, 'defs'));
    document.body.appendChild(root);
    ro = new ResizeObserver(queueScan);
    mo = new MutationObserver(queueScan);
    mo.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('pointerdown', onPointer, { passive: true });
    window.addEventListener('blur', recede); window.addEventListener('focus', restore);
    if (!document.hasFocus()) recede();
    queueScan();
  } else {
    mo?.disconnect(); ro?.disconnect(); mo = ro = null;
    document.removeEventListener('pointermove', onPointer); document.removeEventListener('pointerdown', onPointer);
    window.removeEventListener('blur', recede); window.removeEventListener('focus', restore);
    restore();
    for (const el of tracked) { (el as HTMLElement).style.removeProperty('--lg-filter'); (el as HTMLElement).style.removeProperty('--lg-spec'); applied.delete(el); }
    tracked.clear(); cache.clear();
    root?.remove(); root = null;
  }
}
