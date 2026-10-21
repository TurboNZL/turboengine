import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildThemes, root } from '../scripts/lib/themes.mjs';
import { buildPalette, tokens, TOKEN_NAMES } from '../engine/src/palette.ts';
import { hex, readableOn, toHsl, toTriplet } from '../engine/src/color.ts';
import { validateCatalog } from '../engine/src/catalog.ts';
import type { Catalog } from '../engine/src/types.ts';

const HSL = /^-?\d+(\.\d+)? \d+(\.\d+)?% \d+(\.\d+)?%$/;
const built = await buildThemes({ minify: false });
const catalog = built.catalog as Catalog;

describe('the built themes', () => {
  it('is a valid catalog with unique ids', () => {
    expect(validateCatalog(catalog)).toEqual([]);
    for (const list of [catalog.palettes, catalog.styles]) expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
  });

  it('gives every palette except the own ones a full, valid set of colour tokens', () => {
    for (const spec of catalog.palettes) {
      const t = tokens(buildPalette(spec));
      if (spec.own) { expect(t, spec.id).toEqual({}); continue; }
      for (const n of TOKEN_NAMES) expect(t[n], `${spec.id}.${n}`).toMatch(HSL);
    }
  });

  it('keeps the three own palettes, whose colours live in a palette.css', () => {
    expect(catalog.palettes.filter((p) => p.own).map((p) => p.id)).toEqual(['default', 'classic', 'light']);
    expect(built.css).toContain("[data-theme='classic']");
  });

  it('pairs every style with palettes that exist, and the first-version look with zinc', () => {
    const ids = new Set(catalog.palettes.map((p) => p.id));
    for (const s of catalog.styles) for (const id of Object.values(s.matching ?? {})) expect(ids.has(id), `${s.id} -> ${id}`).toBe(true);
    expect(catalog.styles.find((s) => s.id === 'toolbar')?.matching).toEqual({ light: 'zinc', dark: 'zinc' });
  });

  it('uses the original Tailwind zinc and blue values for the first version', () => {
    const v = tokens(buildPalette(catalog.palettes.find((p) => p.id === 'zinc')!));
    const css = (c: string) => { const [h, s, l] = hex(c); return `${h} ${s}% ${l}%`; };
    expect(v.bg).toBe(css('#09090b'));
    expect(v.raised).toBe(css('#18181b'));
    expect(v.line).toBe(css('#27272a'));
    expect(v.muted).toBe(css('#71717a'));
    expect(v.accent).toBe(css('#2563eb'));
    expect(v.good).toBe(css('#10b981'));
    expect(v.bad).toBe(css('#ef4444'));
  });

  it('only scopes each style and palette CSS to itself', () => {
    // buildThemes would have thrown; the point of the test is that the build is clean
    expect(built.css.length).toBeGreaterThan(50_000);
    expect(built.manifest.hash).toMatch(/^[0-9a-z]+$/);
  });

  it('embeds the fonts and images a theme folder points at', () => {
    expect(built.css).toMatch(/url\("data:font\/woff2;base64,/);
    expect(built.css).not.toMatch(/url\(["']?\.\//);
  });
});

describe('colours', () => {
  it('converts hex to HSL and back to a triplet', () => {
    expect(hex('#ffffff')).toEqual([0, 0, 100]);
    expect(hex('#ff0000')).toEqual([0, 100, 50]);
    expect(hex('#f00')).toEqual([0, 100, 50]);
    expect(toTriplet('#ff0000')).toBe('0 100% 50%');
    expect(toTriplet([10, 20, 30])).toBe('10 20% 30%');
    expect(toTriplet('222 47% 11%')).toBe('222 47% 11%');
    expect(toHsl('222 47% 11%')).toEqual([222, 47, 11]);
  });
  it('picks a readable text colour for an accent', () => {
    expect(readableOn('#f59e0b')).toBe('240 10% 8%');
    expect(readableOn('#1e3a8a')).toBe('0 0% 100%');
  });
});

describe('a theme author\'s mistakes are caught by the build', () => {
  // a throwaway copy of the repository's themes, with one thing broken
  const broken = async (mutate: (dir: string) => void) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'turbothemes-'));
    fs.cpSync(path.join(root, 'themes'), path.join(dir, 'themes'), { recursive: true });
    mutate(dir);
    try { await buildThemes({ minify: false, dir }); return null; } catch (e) { return (e as Error).message; } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  };

  it('refuses CSS that is not scoped to its own style', async () => {
    const msg = await broken((d) => fs.appendFileSync(path.join(d, 'themes/win7/style.css'), '\n.btn { color: red; }\n'));
    expect(msg).toMatch(/win7\/style\.css.*not scoped/s);
  });
  it('refuses CSS that is scoped to somebody else\'s style', async () => {
    const msg = await broken((d) => fs.appendFileSync(path.join(d, 'themes/win7/style.css'), '\n[data-ui="win98"] .btn { color: red; }\n'));
    expect(msg).toMatch(/not scoped/);
  });
  it('refuses Tailwind syntax', async () => {
    const msg = await broken((d) => fs.appendFileSync(path.join(d, 'themes/classic/palette.css'), "\n[data-theme='classic'] p { @apply font-bold; }\n"));
    expect(msg).toMatch(/@apply is Tailwind syntax/);
  });
  it('refuses a folder whose id does not match its name', async () => {
    const msg = await broken((d) => { const f = path.join(d, 'themes/nord/theme.json'); fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('"id": "nord"', '"id": "norde"')); });
    expect(msg).toMatch(/folder is "nord"/);
  });
  it('refuses a style that names a palette that does not exist', async () => {
    const msg = await broken((d) => { const f = path.join(d, 'themes/win7/theme.json'); fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('"dark": "win7-dark"', '"dark": "win7-night"')); });
    expect(msg).toMatch(/palette "win7-night", which does not exist/);
  });
  it('refuses a duplicate palette id', async () => {
    const msg = await broken((d) => { const f = path.join(d, 'themes/ocean/theme.json'); fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('"id": "ocean",\n      "label"', '"id": "nord",\n      "label"')); });
    expect(msg).toMatch(/used twice/);
  });
  it('refuses an unknown effect', async () => {
    const msg = await broken((d) => { const f = path.join(d, 'themes/liquid/theme.json'); fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('"liquid-glass"', '"lasers"')); });
    expect(msg).toMatch(/unknown effect "lasers"/);
  });
  it('refuses a url(./file) that is not in the folder', async () => {
    const msg = await broken((d) => fs.appendFileSync(path.join(d, 'themes/blocky/style.css'), '\n[data-ui="blocky"] { background: url(./missing.png); }\n'));
    expect(msg).toMatch(/missing\.png/);
  });
});

describe('light / dark pairs', async () => {
  const { buildPairs } = await import('../engine/src/catalog.ts');
  const pairs = buildPairs(catalog.palettes, catalog.styles);
  const mode = new Map(catalog.palettes.map((p) => [p.id, p.mode]));

  it('are symmetric and always one light with one dark', () => {
    for (const [a, b] of pairs) { expect(pairs.get(b), `${a} <-> ${b}`).toBe(a); expect(mode.get(a)).not.toBe(mode.get(b)); }
  });
  it('take an explicit pair first, then the palettes a style lists as matching', () => {
    expect(pairs.get('turbomusic')).toBe('turbomusic-light');
    expect(pairs.get('turbokeep')).toBe('turbokeep-light');
    expect(pairs.get('turbodocs')).toBe('turbodocs-light');
    expect(pairs.get('dark')).toBe('daylight');
    expect(pairs.get('default')).toBe('light'); // from the Standard v2 style's matching
    expect(pairs.get('breeze')).toBe('breeze-dark');
  });
  it('leaves a look that exists in one mode only without a twin', () => {
    expect(pairs.has('nord')).toBe(false);
    expect(pairs.has('classic')).toBe(false);
  });
  it('is refused by the build when a pair is missing or in the same mode', async () => {
    const edit = (to: string) => (d: string) => {
      const f = path.join(d, 'themes/turbomusic/theme.json');
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      j.palettes[0].pair = to;
      fs.writeFileSync(f, JSON.stringify(j));
    };
    const missing = await (async () => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'turbothemes-')); fs.cpSync(path.join(root, 'themes'), path.join(dir, 'themes'), { recursive: true }); edit('nope')(dir); try { await buildThemes({ minify: false, dir }); return null; } catch (e) { return (e as Error).message; } finally { fs.rmSync(dir, { recursive: true, force: true }); } })();
    expect(missing).toMatch(/does not exist/);
    const same = await (async () => { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'turbothemes-')); fs.cpSync(path.join(root, 'themes'), path.join(dir, 'themes'), { recursive: true }); edit('dracula')(dir); try { await buildThemes({ minify: false, dir }); return null; } catch (e) { return (e as Error).message; } finally { fs.rmSync(dir, { recursive: true, force: true }); } })();
    expect(same).toMatch(/both dark|pairs with/);
  });
});

describe('base.css', () => {
  it('gives pressable hook classes a pointer cursor, and a disabled button a not-allowed one', async () => {
    const { readFileSync } = await import('node:fs');
    const css = readFileSync(new URL('../engine/base.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.btn:not\(:disabled\)[^{]*\{ cursor: pointer; \}/);
    expect(css).toMatch(/\.btn:disabled[^{]*\{ cursor: not-allowed; \}/);
  });
});
