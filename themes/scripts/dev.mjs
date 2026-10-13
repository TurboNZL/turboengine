// pnpm dev: the playground at http://localhost:5280/examples/playground.html?source=local
// Edit anything in themes/: it is rebuilt and the open page restyles itself within a second (through the real updater).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { root } from './lib/themes.mjs';

const port = Number(process.env.PORT ?? 5280);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

let building = false, again = false;
function rebuild() {
  if (building) { again = true; return; }
  building = true;
  try { execFileSync(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', path.join(root, 'scripts/build.mjs'), '--no-min'], { stdio: ['ignore', 'pipe', 'pipe'] }); console.log(new Date().toLocaleTimeString(), 'rebuilt'); }
  catch (e) { console.error((e.stderr?.toString() || e.message).trim()); }
  building = false;
  if (again) { again = false; rebuild(); }
}
rebuild();
let timer;
for (const dir of ['themes', 'engine']) fs.watch(path.join(root, dir), { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(rebuild, 200); });

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let file = path.join(root, decodeURIComponent(url.pathname));
  if (url.pathname === '/') { res.writeHead(302, { Location: '/examples/playground.html?source=local' }); return res.end(); }
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' });
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`playground: http://localhost:${port}/`));
