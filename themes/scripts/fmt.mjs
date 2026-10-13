// Re-formats every theme.json / config.json the way the build and the docs show them.
import fs from 'node:fs';
import path from 'node:path';
import { stringify } from './lib/json.mjs';

const root = path.resolve(import.meta.dirname, '..');
let n = 0;
const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.json')) { const before = fs.readFileSync(p, 'utf8'); const after = stringify(JSON.parse(before)); if (before !== after) { fs.writeFileSync(p, after); n++; } }
  }
};
walk(path.join(root, 'themes'));
console.log(n ? `formatted ${n} file(s)` : 'already tidy');
