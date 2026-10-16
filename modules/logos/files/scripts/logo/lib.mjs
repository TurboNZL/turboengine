// The TurboNZL logo family. One engine mark (a lit ring, a record, a six-bladed compressor wheel) that every app shares, and an
// optional EMBLEM that an app lays over the centre (TurboMusic: a note). The engine mark alone is the TurboEngine logo.
// Everything is computed from geometry (no picture is copied). Colours of the original mark come from the owner's avatar.
// Pure functions: nothing here touches the disk. `scripts/gen-icons.mjs` writes the files.
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ENGINE_ACCENT = '#e10600';
export const INK = '#0b0b0e', DISC = '#101015', CHAR = '#17171c', GROOVE = '#2b2b33';
export const C = 256;          // centre of the 512 canvas
export const SCALE = 0.9;      // the mark sits at 90% inside the tile so the ring never touches the edge
export const PLATE = 130;      // radius of the dark plate an emblem sits on (covers the roots of the blades)
export const EMBLEM = 212;     // the emblem's box on the 512 canvas (a 100 box is scaled to this)
const MONO_R0 = 132, MONO_EMBLEM = 214; // the one-colour twin: blades start further out, the emblem is larger

const f = (n) => +n.toFixed(2);
const pol = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
/** a filled circle as path data with relative arcs (also valid in an Android vector) */
export const circle = (cx, cy, r) => `M${f(cx - r)},${f(cy)}a${f(r)},${f(r)} 0 1,0 ${f(2 * r)},0a${f(r)},${f(r)} 0 1,0 ${f(-2 * r)},0Z`;
/** a ring: two circles, filled evenodd (a ring is a filled path, never a stroke, so it scales exactly) */
const ringPath = (cx, cy, ro, ri) => circle(cx, cy, ro) + circle(cx, cy, ri);

/** one compressor blade: a curved fin from radius r0 to r1, leaning `twist` radians over its length */
function blade(cx, cy, a, r0, r1, twist, width) {
  const N = 14, lead = [], trail = [];
  for (let i = 0; i <= N; i++) {
    const s = i / N, r = r0 + (r1 - r0) * s, th = a + twist * s;
    lead.push(pol(cx, cy, r, th));
    trail.push(pol(cx, cy, r, th + width * (1 - 0.55 * s)));
  }
  return 'M' + [...lead, ...trail.reverse()].map(([x, y]) => `${f(x)},${f(y)}`).join('L') + 'Z';
}
const wheel = (cx, cy, r0, r1, n, twist, width) => Array.from({ length: n }, (_, i) => blade(cx, cy, -Math.PI / 2 + (i * 2 * Math.PI) / n, r0, r1, twist, width)).join('');

// ---- colour: one colour, three tones (the engine red for the mark; the app's own colour for its emblem) ----
const hsl = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
};
const hex = ([h, s, l]) => {
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), ch = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return '#' + [0, 8, 4].map((n) => Math.round(ch(n) * 255).toString(16).padStart(2, '0')).join('');
};
/** light / mid / dark / edge from one brand colour (the engine red keeps the exact values the first logo shipped with) */
export function tones(accent = ENGINE_ACCENT) {
  if (accent.toLowerCase() === ENGINE_ACCENT) return { light: '#ff5a44', mid: ENGINE_ACCENT, dark: '#8f0300', fin: ['#ff4a36', '#b30500'], edge: '#ffb3a8', deep: '#2a0300' };
  const [h, s, l] = hsl(accent), up = [Math.min(h + 4, 360), s, Math.min(l + 0.19, 0.78)], dn = [h, s, Math.max(l - 0.2, 0.12)];
  return { light: hex(up), mid: accent, dark: hex(dn), fin: [hex([h + 2, s, Math.min(l + 0.14, 0.72)]), hex([h, s, Math.max(l - 0.13, 0.15)])], edge: hex([h, s, 0.9]), deep: hex([h, s, 0.06]) };
}

// ---- emblems ----
/** An emblem is `{ name, box, d }`: `d` is path data inside a `box` x `box` square, centred, made ONLY of absolute M / L / Z (polygons;
 * curves are drawn as many short segments). That restriction is what lets the same shape be scaled into an SVG, an Android vector and a
 * one-colour icon with plain arithmetic. Same winding for overlapping shapes (clockwise on screen) or they cancel under nonzero fill. */
export function parseEmblem(e) {
  if (!e || typeof e.d !== 'string' || !(e.box > 0)) throw new Error('emblem needs { box, d }');
  if (!/^[MLZ0-9.,\-\s]+$/.test(e.d)) throw new Error(`emblem "${e.name ?? '?'}" may only use absolute M, L and Z commands`);
  return e;
}
/** find an emblem by name: the app's own `branding/emblems/<name>.json` first, then the ones shipped next to this file */
export function loadEmblem(name, root = process.cwd()) {
  if (!name) return null;
  const here = dirname(fileURLToPath(import.meta.url));
  for (const p of [join(root, 'branding/emblems', `${name}.json`), join(here, 'emblems', `${name}.json`), name]) {
    if (existsSync(p) && p.endsWith('.json')) return parseEmblem({ name, ...JSON.parse(readFileSync(p, 'utf8')) });
  }
  throw new Error(`no emblem called "${name}" (looked in branding/emblems and scripts/logo/emblems)`);
}
/** move the emblem's coordinates: a point (x,y) in the box becomes (x * k + ox, y * k + oy) */
const place = (d, k, ox, oy) => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_m, x, y) => `${f(+x * k + ox)},${f(+y * k + oy)}`);
/** the emblem `size` units wide, centred on (cx, cy) */
const emblemAt = (e, size, cx, cy) => place(e.d, size / e.box, cx - size / 2, cy - size / 2);

/**
 * @param {{ name: string, color?: string, emblem?: object | null }} o
 * The ring, blades, plate rim and glow are ALWAYS the engine red. Only the emblem takes `color`, the app's own identifying colour.
 * `emblem` null = the plain engine mark (the TurboEngine logo)
 */
export function buildLogo({ name, color = ENGINE_ACCENT, emblem = null }) {
  const t = tones(ENGINE_ACCENT), et = tones(color), e = emblem ? parseEmblem(emblem) : null;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '') + '-'; // SVG ids are shared by every inline SVG on a page: prefix them
  const BLADES = 6, TWIST = 0.95, R0 = 52, R1 = 176;
  const blades = wheel(C, C, R0, R1, BLADES, TWIST, 0.5);
  const edges = Array.from({ length: BLADES }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / BLADES;
    return 'M' + Array.from({ length: 15 }, (_x, n) => { const s = n / 14, [x, y] = pol(C, C, R0 + (R1 - R0) * s, a + TWIST * s); return `${f(x)},${f(y)}`; }).join('L');
  }).join('');
  const bolts = Array.from({ length: BLADES }, (_, i) => { const [x, y] = pol(C, C, 31, -Math.PI / 2 + (i * 2 * Math.PI) / BLADES); return `<circle cx="${f(x)}" cy="${f(y)}" r="4.5"/>`; }).join('');
  const grooves = [196, 182, 168].map((r) => `<circle cx="${C}" cy="${C}" r="${r}"/>`).join('');
  const id = (s) => slug + s;

  /** the full-colour logo: a rounded tile, 512 x 512 */
  const svg = (size = 512) => {
    const centre = e
      // an emblem replaces the hub: a dark plate with a lit rim, and the emblem in the app's own colour on top
      ? `<circle cx="${C}" cy="${C}" r="${PLATE}" fill="${INK}"/>
    <path d="${ringPath(C, C, PLATE, PLATE - 5)}" fill-rule="evenodd" fill="url(#${id('ring')})"/>
    <g filter="url(#${id('soft')})"><path d="${emblemAt(e, EMBLEM, C, C)}" fill="url(#${id('emb')})"/></g>`
      : `<circle cx="${C}" cy="${C}" r="50" fill="url(#${id('hub')})"/>
    <circle cx="${C}" cy="${C}" r="50" fill="none" stroke="${t.edge}" stroke-opacity=".5" stroke-width="2"/>
    <g fill="${t.deep}" fill-opacity=".7">${bolts}</g>
    <circle cx="${C}" cy="${C}" r="13" fill="${INK}"/><circle cx="${C - 3}" cy="${C - 4}" r="3.5" fill="#fff" fill-opacity=".5"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}" role="img" aria-label="${name}">
  <defs>
    <linearGradient id="${id('bg')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#26262f"/><stop offset="1" stop-color="${INK}"/></linearGradient>
    <radialGradient id="${id('glow')}" cx="50%" cy="50%" r="55%"><stop offset="0" stop-color="${t.mid}" stop-opacity=".30"/><stop offset=".7" stop-color="${t.mid}" stop-opacity=".06"/><stop offset="1" stop-color="${t.mid}" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id('ring')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.light}"/><stop offset=".5" stop-color="${t.mid}"/><stop offset="1" stop-color="${t.dark}"/></linearGradient>
    <linearGradient id="${id('fin')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.fin[0]}"/><stop offset="1" stop-color="${t.fin[1]}"/></linearGradient>
    <linearGradient id="${id('emb')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${et.light}"/><stop offset="1" stop-color="${et.dark}"/></linearGradient>
    <radialGradient id="${id('hub')}" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="${t.light}"/><stop offset=".55" stop-color="${t.mid}"/><stop offset="1" stop-color="${t.dark}"/></radialGradient>
    <linearGradient id="${id('sheen')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <filter id="${id('soft')}" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000" flood-opacity=".55"/></filter>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#${id('bg')})"/>
  <rect width="512" height="512" rx="112" fill="url(#${id('glow')})"/>
  <g transform="translate(${f(256 * (1 - SCALE))} ${f(256 * (1 - SCALE))}) scale(${SCALE})">
    <path d="${ringPath(C, C, 236, 214)}" fill-rule="evenodd" fill="url(#${id('ring')})"/>
    <circle cx="${C}" cy="${C}" r="206" fill="${DISC}"/>
    <g fill="none" stroke="${GROOVE}" stroke-width="2.5">${grooves}</g>
    <path d="M${C},${C} L${f(C + 206 * Math.cos(-2.3))},${f(C + 206 * Math.sin(-2.3))} A206,206 0 0 1 ${f(C + 206 * Math.cos(-0.75))},${f(C + 206 * Math.sin(-0.75))} Z" fill="url(#${id('sheen')})"/>
    <g filter="url(#${id('soft')})"><path d="${blades}" fill="url(#${id('fin')})"/></g>
    <path d="${edges}" fill="none" stroke="${t.edge}" stroke-opacity=".75" stroke-width="2.2" stroke-linecap="round"/>
    ${centre}
  </g>
</svg>
`;
  };

  /** the one-colour twin (tray, notification, monochrome icons): ring, blades and emblem only, `currentColor`, no tile */
  const mono = (size = 512) => {
    const bl = wheel(C, C, e ? MONO_R0 : R0, R1, BLADES, TWIST, 0.5);
    const mid = e ? `<path d="${emblemAt(e, MONO_EMBLEM, C, C)}"/>` : `<circle cx="${C}" cy="${C}" r="50"/>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}" role="img" aria-label="${name}">
  <g fill="currentColor"><path d="${ringPath(C, C, 250, 224)}" fill-rule="evenodd"/><path d="${bl}"/>${mid}</g>
</svg>
`;
  };

  // ---- Android. Adaptive icons draw the foreground inside the 66 dp safe zone of a 108 dp canvas: flat fills only ----
  const k = (66 / 512) * SCALE, off = 21 + 33 * (1 - SCALE);
  const tx = (d) => place(d, k, off, off);
  const sc = (cx, cy, r) => circle(cx * k + off, cy * k + off, r * k);
  const vec = (w, paths) => `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="${w}dp" android:height="${w}dp" android:viewportWidth="${w === 24 ? 24 : 108}" android:viewportHeight="${w === 24 ? 24 : 108}">\n${paths}</vector>\n`;
  const apath = (fill, d, extra = '') => `    <path android:fillColor="${fill}" ${extra}android:pathData="${d}" />\n`;
  const sc2 = (cx, cy, ro, ri) => sc(cx, cy, ro) + sc(cx, cy, ri);

  const androidForeground = vec(108,
    apath(t.mid, sc2(C, C, 236, 214), 'android:fillType="evenOdd" ') +
    apath(DISC, sc(C, C, 206)) +
    apath(t.mid, tx(blades)) +
    (e
      ? apath(INK, sc(C, C, PLATE)) + apath(t.mid, sc2(C, C, PLATE, PLATE - 5), 'android:fillType="evenOdd" ') + apath(et.mid, tx(emblemAt(e, EMBLEM, C, C)))
      : apath(t.mid, sc(C, C, 50)) + apath(INK, sc(C, C, 13))));

  // the notification's small icon: white only on transparent (Android tints it), 24 dp: the mono twin scaled to 24
  const kn = 24 / 512, sm = (d) => place(d, kn, 0, 0); // blades and emblem are absolute polygons, circles are built at 24 dp directly
  const androidStat = vec(24,
    apath('#FFFFFFFF', circle(12, 12, 250 * kn) + circle(12, 12, 218 * kn), 'android:fillType="evenOdd" ') +
    apath('#FFFFFFFF', sm(wheel(C, C, e ? MONO_R0 : R0, R1, BLADES, TWIST, 0.5))) +
    apath('#FFFFFFFF', e ? sm(emblemAt(e, MONO_EMBLEM, C, C)) : circle(12, 12, 50 * kn)));

  /**
   * The small-size logo: ONLY the centre symbol in the app's own colour, no ring, blades or tile. At 16 to 48 px (a browser tab, a favicon) the full emblem is a dark
   * dot with a red ring and the symbol disappears; the symbol alone stays readable. Cropped tightly (6% margin), transparent background. An engine mark without an
   * emblem has no symbol of its own and falls back to the full logo.
   */
  const symbol = (size = 512) => {
    if (!e) return svg(size);
    const d = emblemAt(e, EMBLEM, C, C), xs = [], ys = [];
    for (const m of d.matchAll(/(-?[\d.]+)[ ,](-?[\d.]+)/g)) { xs.push(Number(m[1])); ys.push(Number(m[2])); }
    const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys), side = Math.max(w, h) * 1.12;
    const x0 = (Math.min(...xs) + Math.max(...xs)) / 2 - side / 2, y0 = (Math.min(...ys) + Math.max(...ys)) / 2 - side / 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f(x0)} ${f(y0)} ${f(side)} ${f(side)}" width="${size}" height="${size}" role="img" aria-label="${name}">
  <defs><linearGradient id="${id('sym')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${et.light}"/><stop offset="1" stop-color="${et.dark}"/></linearGradient></defs>
  <path d="${d}" fill="url(#${id('sym')})"/>
</svg>`;
  };

  return { svg, mono, symbol, androidForeground, androidStat, androidBackground: CHAR, tones: t };
}
