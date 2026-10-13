// Builds dist/: the bundle the updater downloads (themes.json, themes.css, manifest.json) and the engine (engine.js, engine.global.js, types).
//   node scripts/build.mjs            build everything
//   node scripts/build.mjs --check    build in memory and fail if dist/ is out of date (used by CI)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { build, transform } from 'esbuild';
import { buildThemes, root } from './lib/themes.mjs';

const check = process.argv.includes('--check');
const dist = path.join(root, 'dist');
const noMin = process.argv.includes('--no-min');

let themes;
try { themes = await buildThemes({ minify: !noMin }); } catch (e) { console.error(e.message); process.exit(1); }
const base = fs.readFileSync(path.join(root, 'engine', 'base.css'), 'utf8');

if (check) {
  const stale = [];
  const same = (file, text) => { const p = path.join(dist, file); if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== text) stale.push(file); };
  same('themes.json', themes.catalogText); same('themes.css', themes.css); same('base.css', base);
  if (stale.length) { console.error(`dist/ is out of date (${stale.join(', ')}). Run: pnpm build`); process.exit(1); }
  console.log('dist/ is up to date');
  process.exit(0);
}

// the same content must give the same files: keep the old build time when nothing changed, so CI does not commit a rebuild of the identical themes
try { const old = JSON.parse(fs.readFileSync(path.join(dist, 'manifest.json'), 'utf8')); if (old.hash === themes.manifest.hash) themes.manifest.built = old.built; } catch { /* first build */ }
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, 'themes.json'), themes.catalogText);
fs.writeFileSync(path.join(dist, 'themes.css'), themes.css);
fs.writeFileSync(path.join(dist, 'manifest.json'), JSON.stringify(themes.manifest, null, 2) + '\n');
fs.writeFileSync(path.join(dist, 'base.css'), base);

// the engine: the themes built in, as a virtual module
const virtualBuiltin = {
  name: 'builtin',
  setup(b) {
    b.onResolve({ filter: /^virtual:builtin$/ }, () => ({ path: 'builtin', namespace: 'builtin' }));
    b.onLoad({ filter: /.*/, namespace: 'builtin' }, () => ({ contents: `export default ${JSON.stringify({ manifest: themes.manifest, catalog: themes.catalog, css: themes.css })};`, loader: 'js' }));
  },
};
const common = { entryPoints: [path.join(root, 'engine/src/index.ts')], bundle: true, target: 'es2022', plugins: [virtualBuiltin], legalComments: 'none', logLevel: 'warning' };
await build({ ...common, format: 'esm', outfile: path.join(dist, 'engine.js') });
await build({ ...common, format: 'iife', globalName: 'TurboThemes', outfile: path.join(dist, 'engine.global.js') });
const tw = await transform(fs.readFileSync(path.join(root, 'engine/src/tailwind.ts'), 'utf8'), { loader: 'ts', format: 'esm', target: 'es2022' });
fs.writeFileSync(path.join(dist, 'tailwind.js'), tw.code);

// type declarations
execFileSync(path.join(root, 'node_modules/.bin/tsc'), ['-p', path.join(root, 'engine/tsconfig.build.json')], { stdio: 'inherit' });
fs.writeFileSync(path.join(dist, 'types', 'virtual.d.ts'), fs.readFileSync(path.join(root, 'engine/src/virtual.d.ts'), 'utf8'));

execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', path.join(root, 'scripts/gen-docs.mjs')], { stdio: 'inherit' });

const kb = (f) => (fs.statSync(path.join(dist, f)).size / 1024).toFixed(0) + ' KB';
console.log(`built: ${themes.catalog.palettes.length} palettes, ${themes.catalog.styles.length} styles`);
console.log(`themes.css ${kb('themes.css')} · themes.json ${kb('themes.json')} · engine.js ${kb('engine.js')} · hash ${themes.manifest.hash}`);
