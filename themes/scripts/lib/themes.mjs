// Reads themes/ and produces the three files the engine and the updater use: themes.json, themes.css, manifest.json.
import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import { transform } from 'esbuild';
import { hashText } from '../../engine/src/hash.ts';
import { API_VERSION } from '../../engine/src/types.ts';

export const root = path.resolve(import.meta.dirname, '..', '..');
/** where themes/, dist/ and docs/ are: this package, or another one that reuses this engine (TURBOTHEMES_SRC, see themes-open/) */
export const src = process.env.TURBOTHEMES_SRC ? path.resolve(process.env.TURBOTHEMES_SRC) : root;
const KNOWN_EFFECTS = new Set(['liquid-glass', 'ripple']);
const MIME = { '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif' };

const readJson = (p) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { throw new Error(`${path.relative(root, p)}: ${e.message}`); } };
const dirs = (p) => fs.existsSync(p) ? fs.readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.')).map((d) => d.name).sort() : [];

/** Files a stylesheet points at with url(./file) are embedded, so a theme folder is complete in itself and the bundle is one file. */
function inlineAssets(css, dir, errors, file) {
  return css.replace(/url\(\s*(["']?)\.\/([^)"']+)\1\s*\)/g, (_m, _q, rel) => {
    const p = path.join(dir, rel);
    if (!fs.existsSync(p)) { errors.push(`${file}: url(./${rel}) points at a file that is not in the folder`); return _m; }
    const mime = MIME[path.extname(p).toLowerCase()];
    if (!mime) { errors.push(`${file}: cannot embed ${rel} (unknown type)`); return _m; }
    return `url("data:${mime};base64,${fs.readFileSync(p).toString('base64')}")`;
  });
}

/** A theme folder may only restyle its own look: every rule has to be scoped to the folder's own style / palette. */
function lintScope(css, attr, ids, file, errors) {
  let root;
  try { root = postcss.parse(css); } catch (e) { errors.push(`${file}: invalid CSS (${e.message})`); return; }
  const mentions = new RegExp(`\\[data-${attr}(\\^?=["']?(${ids.map((i) => i.replace(/[-]/g, '\\-')).join('|')})["']?)?\\]`);
  root.walkAtRules((at) => {
    if (['apply', 'tailwind', 'screen', 'config'].includes(at.name)) errors.push(`${file}:${at.source?.start?.line}: @${at.name} is Tailwind syntax; theme CSS has to be plain CSS (it is used by apps that do not run Tailwind)`);
  });
  root.walkDecls((d) => { if (/\btheme\(/.test(d.value)) errors.push(`${file}:${d.source?.start?.line}: theme() is Tailwind syntax; use plain CSS`); });
  root.walkRules((rule) => {
    if (rule.parent?.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return;
    if (!rule.selectors.some((s) => mentions.test(s))) errors.push(`${file}:${rule.source?.start?.line}: "${rule.selector.slice(0, 60)}" is not scoped to [data-${attr}="${ids[0]}"]; it would leak into other looks`);
  });
}

export async function buildThemes({ minify = true, dir: base = src } = {}) {
  const errors = [];
  const config = readJson(path.join(base, 'themes', 'config.json'));
  const palettes = [], styles = [];
  const sections = { palette: [], style: [] };
  const seen = new Set(), seenStyle = new Set();

  for (const name of dirs(path.join(base, 'themes'))) {
    const dir = path.join(base, 'themes', name);
    const file = `themes/${name}/theme.json`;
    const t = readJson(path.join(dir, 'theme.json'));
    if (t.id !== name) errors.push(`${file}: "id" is "${t.id}" but the folder is "${name}"`);
    if (!t.label) errors.push(`${file}: "label" is missing`);
    if (!t.style && !(t.palettes ?? []).length) errors.push(`${file}: has neither a style nor a palette`);
    for (const p of t.palettes ?? []) {
      for (const k of ['id', 'label', 'mode', 'motif']) if (!p[k]) errors.push(`${file}: palette ${p.id ?? '?'} lacks "${k}"`);
      if (!p.own && (p.bg === undefined || p.primary === undefined)) errors.push(`${file}: palette ${p.id} needs "bg" and "primary"`);
      if (seen.has(p.id)) errors.push(`${file}: palette id "${p.id}" is used twice`);
      seen.add(p.id); palettes.push(p);
    }
    if (t.style) {
      const s = t.style;
      for (const k of ['description', 'font']) if (!s[k]) errors.push(`${file}: style lacks "${k}"`);
      for (const e of s.effects ?? []) if (!KNOWN_EFFECTS.has(e)) errors.push(`${file}: unknown effect "${e}" (the engine knows ${[...KNOWN_EFFECTS].join(', ')})`);
      for (const f of s.fonts ?? []) if (!/^[a-z0-9-]+$/.test(f.package) || !Array.isArray(f.weights)) errors.push(`${file}: bad font entry ${JSON.stringify(f)}`);
      if (seenStyle.has(name)) errors.push(`${file}: style id used twice`);
      seenStyle.add(name);
      styles.push({ id: name, label: t.label, ...s });
      const cssFile = path.join(dir, 'style.css');
      if (fs.existsSync(cssFile)) {
        const css = inlineAssets(fs.readFileSync(cssFile, 'utf8'), dir, errors, `themes/${name}/style.css`);
        lintScope(fs.readFileSync(cssFile, 'utf8'), 'ui', [name], `themes/${name}/style.css`, errors);
        sections.style.push({ order: s.order ?? 1e9, id: name, file: `themes/${name}/style.css`, css });
      }
    } else if (fs.existsSync(path.join(dir, 'style.css'))) errors.push(`${file}: has a style.css but no "style" entry`);
    const pcss = path.join(dir, 'palette.css');
    if (fs.existsSync(pcss)) {
      lintScope(fs.readFileSync(pcss, 'utf8'), 'theme', (t.palettes ?? []).map((p) => p.id), `themes/${name}/palette.css`, errors);
      sections.palette.push({ order: Math.min(...(t.palettes ?? []).map((p) => p.order ?? 1e9)), id: name, file: `themes/${name}/palette.css`, css: inlineAssets(fs.readFileSync(pcss, 'utf8'), dir, errors, `themes/${name}/palette.css`) });
    }
  }
  // cross references
  const ids = new Set(palettes.map((p) => p.id));
  for (const p of palettes) if (p.pair) {
    const twin = palettes.find((q) => q.id === p.pair);
    if (!twin) errors.push(`palette "${p.id}" names the pair "${p.pair}", which does not exist`);
    else if (twin.mode === p.mode) errors.push(`palette "${p.id}" and its pair "${p.pair}" are both ${p.mode}: a pair is one light and one dark`);
    else if (twin.pair && twin.pair !== p.id) errors.push(`palette "${p.id}" pairs with "${p.pair}", which pairs with "${twin.pair}"`);
  }
  for (const s of styles) for (const id of Object.values(s.matching ?? {})) if (!ids.has(id)) errors.push(`style "${s.id}" lists the palette "${id}", which does not exist`);
  const styleIds = new Set(styles.map((s) => s.id));
  if (!ids.has(config.defaults.theme)) errors.push(`themes/config.json: default palette "${config.defaults.theme}" does not exist`);
  if (!styleIds.has(config.defaults.ui)) errors.push(`themes/config.json: default style "${config.defaults.ui}" does not exist`);
  for (const r of config.devices) for (const [k, v] of [['ui', r.ui], ['light', r.light], ['dark', r.dark]]) if (!(k === 'ui' ? styleIds : ids).has(v)) errors.push(`themes/config.json: device rule "${r.name}" uses ${k} "${v}", which does not exist`);
  if (errors.length) { const e = new Error('The themes have problems:\n  - ' + errors.join('\n  - ')); e.problems = errors; throw e; }

  const byOrder = (a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || a.id.localeCompare(b.id);
  const catalog = { apiVersion: API_VERSION, palettes: palettes.sort(byOrder), styles: styles.sort(byOrder), config };
  const parts = [];
  for (const kind of ['palette', 'style']) for (const s of sections[kind].sort(byOrder)) parts.push(`/* ${s.file} */\n${s.css.trim()}\n`);
  let css = parts.join('\n');
  if (minify) css = (await transform(css, { loader: 'css', minify: true })).code;
  const catalogText = JSON.stringify(catalog);
  const manifest = { apiVersion: API_VERSION, hash: hashText(catalogText + '\n' + css), built: new Date().toISOString(), files: { catalog: 'themes.json', css: 'themes.css' } };
  return { catalog, catalogText, css, manifest };
}
