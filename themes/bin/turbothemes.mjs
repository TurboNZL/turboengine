#!/usr/bin/env node
// npx turbothemes init | list | version
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [cmd = 'help', ...args] = process.argv.slice(2);

function readCatalog() { return JSON.parse(fs.readFileSync(path.join(pkgRoot, 'dist', 'themes.json'), 'utf8')); }
const exists = (p) => fs.existsSync(p);

function init() {
  const cwd = process.cwd();
  const pkgFile = path.join(cwd, 'package.json');
  if (!exists(pkgFile)) { console.error('Run this in the folder of your app (there is no package.json here).'); process.exit(1); }
  const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const ts = exists(path.join(cwd, 'tsconfig.json')) || 'typescript' in deps;
  const srcDir = exists(path.join(cwd, 'src')) ? 'src' : '.';
  const file = path.join(cwd, srcDir, `turbothemes.${ts ? 'ts' : 'js'}`);
  if (exists(file) && !args.includes('--force')) { console.log(`${path.relative(cwd, file)} already exists (use --force to overwrite).`); return; }
  fs.writeFileSync(file, `import { start } from 'turbothemes';
import 'turbothemes/base.css';

/**
 * The look of this app. Change the three ids to pick another look: \`npx turbothemes list\` shows what exists.
 * 'auto' means "match the device". Newer themes are downloaded in the background; no app update needed.
 */
export const themes = start({
  persist: true, // remember the user's choice and apply it at the next start
  picker: true, // enables <turbo-themes-picker>
  appearance: { theme: 'auto', ui: 'auto' }, // the look of a first visit
});

// later, from a settings screen:  themes.apply({ theme: 'nord', ui: 'win11' });
`);
  console.log(`wrote ${path.relative(cwd, file)}\n`);
  console.log('Two more steps:');
  console.log(`  1. import it first in your entry file:   import './turbothemes${ts ? '' : '.js'}';`);
  console.log('  2. put <turbo-themes-picker floating></turbo-themes-picker> anywhere (or build your own picker: docs/PICKER.md)');
  console.log('  3. mark your elements with the hook classes (.btn .input .card .bt-side ...): see docs/CONTRACT.md');
  if ('tailwindcss' in deps) {
    console.log('\nYou use Tailwind: add the preset to tailwind.config so bg-surface, text-muted, rounded-theme ... exist:');
    console.log("    import turbothemes from 'turbothemes/tailwind';   export default { presets: [turbothemes], ... }");
    console.log("and import 'turbothemes/base.css' BEFORE Tailwind's utilities (first line of your main css:  @import 'turbothemes/base.css';  and drop the import from the file above).");
  }
}

function list() {
  const c = readCatalog();
  console.log('Palettes (theme):\n  ' + c.palettes.map((p) => p.id).join(', '));
  console.log('\nUI styles (ui):\n  ' + c.styles.map((s) => s.id).join(', '));
  console.log("\nPlus 'auto' (match this device) for theme and ui, and 'system' for theme.");
}

switch (cmd) {
  case 'init': init(); break;
  case 'list': list(); break;
  case 'version': console.log(JSON.parse(fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf8')).version, '| themes', JSON.parse(fs.readFileSync(path.join(pkgRoot, 'dist', 'manifest.json'), 'utf8')).hash); break;
  default:
    console.log('turbothemes\n\n  npx turbothemes init     add the engine to this app (writes one file)\n  npx turbothemes list     the ids you can use\n  npx turbothemes version');
}
