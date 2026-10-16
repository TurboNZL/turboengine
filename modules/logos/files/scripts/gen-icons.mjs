#!/usr/bin/env node
// Writes an app's logo files from branding/logo.json (see MODULE.md of the `logos` engine module). Run from the repository root:
//   node scripts/gen-icons.mjs            SVG, one-colour SVG and Android vector drawables
//   (also `out.symbolSvg` / `out.symbolPng`: the centre symbol ALONE, for favicons and anything 48 px or smaller)
//   node scripts/gen-icons.mjs --png      also the PNGs (needs Chromium: CHROMIUM=<binary>, PLAYWRIGHT_MODULE=<path to playwright's index.mjs>)
//   node scripts/gen-icons.mjs --sheet out.png   a contact sheet to check the logo: big, 64/48/32/16 px on light and dark, one-colour twin
//   node scripts/gen-icons.mjs --root <dir> --config <file>
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { buildLogo, loadEmblem } from './logo/lib.mjs';

const argv = process.argv.slice(2), opt = (n) => { const i = argv.indexOf(n); return i < 0 ? undefined : argv[i + 1]; };
const root = resolve(opt('--root') ?? process.cwd());
const cfg = JSON.parse(readFileSync(resolve(root, opt('--config') ?? 'branding/logo.json'), 'utf8'));
const logo = buildLogo({ name: cfg.name, color: cfg.emblemColor ?? undefined, emblem: loadEmblem(cfg.emblem, root) });
const out = cfg.out ?? {};

const write = (rel, text) => { const p = join(root, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text); console.log('wrote', rel); };
if (out.svg) write(out.svg, logo.svg());
if (out.mono) write(out.mono, logo.mono());
if (out.symbolSvg) write(out.symbolSvg, logo.symbol());
if (out.android) {
  const res = out.android.res, stat = out.android.stat ?? 'ic_stat_app';
  write(`${res}/drawable/ic_launcher_foreground.xml`, logo.androidForeground);
  write(`${res}/drawable/${stat}.xml`, logo.androidStat);
  write(`${res}/values/colors.xml`, `<resources>\n    <color name="ic_launcher_background">${logo.androidBackground}</color>\n</resources>\n`);
}
if (opt('--sheet')) {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const row = (bg, fg, items) => `<div style="display:flex;gap:16px;align-items:end;padding:12px;background:${bg};color:${fg}">${items}</div>`;
  const sizes = [64, 48, 32, 16];
  const html = `<body style="margin:0;background:#fff">${logo.svg(280)}${row('#fff', '#000', sizes.map((n) => logo.svg(n)).join(''))}${row('#1b1b20', '#fff', sizes.map((n) => logo.svg(n)).join('') + [96, 48, 24].map((n) => logo.mono(n)).join(''))}${row('#eee', '#000', [96, 48, 24].map((n) => logo.mono(n)).join(''))}</body>`;
  const p = await b.newPage({ viewport: { width: 420, height: 620 } });
  await p.setContent(html); await p.screenshot({ path: resolve(opt('--sheet')), fullPage: true }); await b.close(); console.log('wrote', opt('--sheet'));
}
if (argv.includes('--png') && (out.symbolPng?.length)) {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  for (const [rel, size] of out.symbolPng) {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    await p.setContent(`<body style="margin:0;background:transparent">${logo.symbol(size)}</body>`);
    const file = join(root, rel); mkdirSync(dirname(file), { recursive: true });
    await p.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    await p.close(); console.log('wrote', rel);
  }
  await b.close();
}
if (argv.includes('--png') && out.png?.length) {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  for (const [rel, size] of out.png) {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    await p.setContent(`<body style="margin:0;background:transparent">${logo.svg(size)}</body>`);
    const file = join(root, rel); mkdirSync(dirname(file), { recursive: true });
    await p.screenshot({ path: file, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    await p.close(); console.log('wrote', rel);
  }
  await b.close();
}
