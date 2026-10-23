#!/usr/bin/env node
// Compare an app with the engine modules it pins.   node scripts/engine-diff.mjs <path-to-app> [--show]
// Reads <app>/.turboengine.json:  { "engine": { "repo": "TurboNZL/turboengine", "ref": "<tag or commit>" }, "modules": ["updaters", ...], "moved": { "<engine path>": "<app path>" } }
// For every file of every pinned module it says: same, changed (the app diverged, or the engine moved on), missing in the app, or missing in the engine.
// It also lists engine modules marked "optional": false that the app does not pin (some depend on the kind of app: see CLAUDE.md "Mandatory sets").
// `--show` prints the diff of changed files. Nothing is written: this tells you what to port, in either direction.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const engine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const app = resolve(args.find((a) => !a.startsWith('--')) ?? '.');
const show = args.includes('--show');
const pinFile = join(app, '.turboengine.json');
if (!existsSync(pinFile)) { console.error(`No .turboengine.json in ${app}`); process.exit(2); }
const pin = JSON.parse(readFileSync(pinFile, 'utf8'));
const head = spawnSync('git', ['-C', engine, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
console.log(`app ${app}\npinned to ${pin.engine?.repo ?? '?'} @ ${pin.engine?.ref ?? '?'}   (this engine checkout is ${head.slice(0, 7) || 'unknown'})\n`);

const counts = { same: 0, changed: 0, missingInApp: 0 };
for (const name of pin.modules ?? []) {
  const mfile = join(engine, 'modules', name, 'module.json');
  if (!existsSync(mfile)) { console.log(`${name}: not an engine module`); continue; }
  const m = JSON.parse(readFileSync(mfile, 'utf8'));
  console.log(`== ${name}: ${m.title}`);
  for (const f of m.files) {
    const ours = join(app, pin.moved?.[f] ?? f), theirs = join(engine, 'modules', name, 'files', f);
    if (!existsSync(ours)) { counts.missingInApp++; console.log(`  missing in app  ${f}`); continue; }
    if (readFileSync(ours).equals(readFileSync(theirs))) { counts.same++; console.log(`  same            ${f}`); continue; }
    counts.changed++; console.log(`  changed         ${f}`);
    if (show) console.log(spawnSync('diff', ['-u', theirs, ours], { encoding: 'utf8' }).stdout.split('\n').slice(2).map((l) => `      ${l}`).join('\n'));
  }
}
const pinned = new Set(pin.modules ?? []);
const unpinned = readdirSync(join(engine, 'modules')).filter((n) => {
  const f = join(engine, 'modules', n, 'module.json');
  return existsSync(f) && JSON.parse(readFileSync(f, 'utf8')).optional === false && !pinned.has(n);
});
if (unpinned.length) console.log(`\nMandatory engine modules this app does not pin: ${unpinned.join(', ')}\n(updaters and self-hosted-server depend on the kind of app; see CLAUDE.md "Mandatory sets". Say so in notes if it is on purpose.)`);
console.log(`\n${counts.same} same, ${counts.changed} changed, ${counts.missingInApp} missing in the app`);
