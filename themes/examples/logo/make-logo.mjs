#!/usr/bin/env node
// A logo generator in the Curator style (see docs/LOGO.md): a dark rounded tile with a soft brand-colour glow, a lit ring, a dark inner disc with fine
// grooves and a sheen, a glossy centre motif with a bright leading edge and a drop shadow, and a hub. Everything is computed from geometry, so a
// new app only changes the PALETTE and the motif() function.
//   node examples/logo/make-logo.mjs [outDir]            writes logo.svg, logo-mono.svg (one colour, for notification/tray icons)
//   node examples/logo/make-logo.mjs outDir --png        also renders PNGs (512, 192, 32) with Chromium (set CHROMIUM / PLAYWRIGHT_MODULE)
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ---- 1. the palette: ONE accent in three tones, plus the shared dark neutrals ----
const PALETTE = {
  light: '#5fb0ff', mid: '#1f7aff', dark: '#0a3a9a',   // the accent: highlight, body, shade
  edge: '#cfe6ff',                                      // the thin bright line along a leading edge (a pale tint of the accent)
  ink: '#0b0b0e', tileTop: '#26262f', disc: '#101015', groove: '#2b2b33', // neutrals, the same in every app
};
const NAME = 'TurboCut';
const ID = 'tc'; // prefix for the SVG ids: two inline SVGs on one page share ONE id namespace, and the first gradient called "ring" wins for both

// ---- 2. geometry helpers (all coordinates on a 512 canvas) ----
const f = (n) => +n.toFixed(2);
const C = 256;
const pol = (r, a) => [C + r * Math.cos(a), C + r * Math.sin(a)];
const circle = (r) => `M${f(C - r)},${C}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`;
const poly = (pts) => 'M' + pts.map(([x, y]) => `${f(x)},${f(y)}`).join('L') + 'Z';
const rot = ([x, y], a) => { const c = Math.cos(a), s = Math.sin(a), dx = x - C, dy = y - C; return [C + dx * c - dy * s, C + dx * s + dy * c]; };

// ---- 3. the motif: replace this. Return { body, edges, accents } as SVG path data (body is filled with the glossy gradient) ----
// TurboCut: a rounded play triangle cut in two by a diagonal slash.
function motif() {
  const R = 120, tri = [pol(R, 0), pol(R, (2 * Math.PI) / 3), pol(R, (4 * Math.PI) / 3)].map(([x, y]) => [x - 18, y]);
  // Sutherland-Hodgman: keep the part of the triangle on one side of a diagonal line, leaving a gap of 2*GAP between the two halves
  const ANG = -0.9, GAP = 9, nx = Math.cos(ANG), ny = Math.sin(ANG);
  const dist = (t) => (t[0] - C) * nx + (t[1] - C) * ny;
  const slash = (side) => {
    const d = (t) => side * (dist(t)) - GAP; // >= 0 means kept
    const out = [];
    tri.forEach((p, i) => {
      const q = tri[(i + 1) % 3], dp = d(p), dq = d(q);
      if (dp >= 0) out.push(p);
      if (dp * dq < 0) { const t = dp / (dp - dq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
    });
    return out;
  };
  const a = slash(1), b = slash(-1);
  return { body: poly(a) + poly(b), edges: 'M' + a.slice(0, 2).map(([x, y]) => `${f(x)},${f(y)}`).join('L'), shapes: [a, b] };
}

// ---- 4. sprocket holes on the disc, a film-reel nod (the "grooves" slot of the style) ----
const holes = Array.from({ length: 12 }, (_, i) => { const [x, y] = pol(190, (i * 2 * Math.PI) / 12); return `<rect x="${f(x - 7)}" y="${f(y - 10)}" width="14" height="20" rx="4" transform="rotate(${f((i * 360) / 12 + 90)} ${f(x)} ${f(y)})"/>`; }).join('');
const grooves = [172, 158].map((r) => `<circle cx="${C}" cy="${C}" r="${r}"/>`).join('');

export function logoSvg(size = 512, p = PALETTE) {
  const m = motif();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}" role="img" aria-label="${NAME}">
  <defs>
    <linearGradient id="${ID}-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.tileTop}"/><stop offset="1" stop-color="${p.ink}"/></linearGradient>
    <radialGradient id="${ID}-glow" cx="50%" cy="50%" r="55%"><stop offset="0" stop-color="${p.mid}" stop-opacity=".30"/><stop offset=".7" stop-color="${p.mid}" stop-opacity=".06"/><stop offset="1" stop-color="${p.mid}" stop-opacity="0"/></radialGradient>
    <linearGradient id="${ID}-ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.light}"/><stop offset=".5" stop-color="${p.mid}"/><stop offset="1" stop-color="${p.dark}"/></linearGradient>
    <linearGradient id="${ID}-fin" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.light}"/><stop offset="1" stop-color="${p.dark}"/></linearGradient>
    <linearGradient id="${ID}-sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <filter id="${ID}-soft" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000" flood-opacity=".55"/></filter>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#${ID}-bg)"/>
  <rect width="512" height="512" rx="112" fill="url(#${ID}-glow)"/>
  <g transform="translate(25.6 25.6) scale(.9)">
    <path d="${circle(236) + circle(214)}" fill-rule="evenodd" fill="url(#${ID}-ring)"/>
    <circle cx="${C}" cy="${C}" r="206" fill="${p.disc}"/>
    <g fill="none" stroke="${p.groove}" stroke-width="2.5">${grooves}</g>
    <g fill="${p.groove}">${holes}</g>
    <path d="M${C},${C} L${f(C + 206 * Math.cos(-2.3))},${f(C + 206 * Math.sin(-2.3))} A206,206 0 0 1 ${f(C + 206 * Math.cos(-0.75))},${f(C + 206 * Math.sin(-0.75))} Z" fill="url(#${ID}-sheen)"/>
    <g filter="url(#${ID}-soft)"><path d="${m.body}" fill="url(#${ID}-fin)"/></g>
    <path d="${m.edges}" fill="none" stroke="${p.edge}" stroke-opacity=".75" stroke-width="2.4" stroke-linecap="round"/>
  </g>
</svg>
`;
}

/** One colour on transparent, for places the OS tints (Android notification, tray, favicon at 16 px): ring + motif only, no gradients or fine detail. */
export function monoSvg(colour = '#fff') {
  const m = motif();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><path d="${circle(236) + circle(214)}" fill-rule="evenodd" fill="${colour}" transform="translate(25.6 25.6) scale(.9)"/><path d="${m.body}" fill="${colour}" transform="translate(25.6 25.6) scale(.9)"/></svg>\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '.');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'logo.svg'), logoSvg());
  writeFileSync(join(out, 'logo-mono.svg'), monoSvg());
  console.log('wrote logo.svg, logo-mono.svg in', out);
  if (process.argv.includes('--png')) {
    const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
    const b = await chromium.launch({ executablePath: process.env.CHROMIUM });
    for (const [size, name] of [[512, 'logo-512.png'], [192, 'logo-192.png'], [32, 'logo-32.png']]) {
      const pg = await b.newPage({ viewport: { width: size, height: size } });
      await pg.setContent(`<body style="margin:0;background:transparent">${logoSvg(size)}</body>`);
      await pg.screenshot({ path: join(out, name), omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
      await pg.close(); console.log('wrote', name);
    }
    await b.close();
  }
}
