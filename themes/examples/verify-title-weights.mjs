// Fails if any UI style draws the window border (.bt-wf-title) in a different font weight from its dialog title bars (.bt-titlebar h2).
// Both must follow the style's --tb-weight; a style that overrides one of them directly (e.g. `h1, h2 { font-weight: 400 }`) makes them disagree.
//   node examples/verify-title-weights.mjs [dist-folder]      needs Chromium: CHROMIUM=<binary>, PLAYWRIGHT_MODULE=<path to playwright's index.mjs>
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const dist = resolve(process.argv[2] ?? new URL('../dist', import.meta.url).pathname);
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const styles = JSON.parse(readFileSync(`${dist}/themes.json`, 'utf8')).styles.map((s) => s.id);
const css = readFileSync(`${dist}/base.css`, 'utf8') + '\n' + readFileSync(`${dist}/themes.css`, 'utf8');
const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
const p = await b.newPage();
const bad = [];
for (const ui of styles) {
  await p.setContent(`<style>${css}</style><body><div data-ui="${ui}" data-theme="default" data-mode="light"><div class="bt-window"><div class="bt-titlebar flex"><h2>Dialog</h2></div></div><div class="bt-wf"><span class="bt-wf-title">Frame</span></div></div></body>`);
  const w = await p.evaluate(() => ({ dialog: getComputedStyle(document.querySelector('.bt-titlebar h2')).fontWeight, frame: getComputedStyle(document.querySelector('.bt-wf-title')).fontWeight }));
  if (w.dialog !== w.frame) bad.push(`${ui}: dialog ${w.dialog}, window border ${w.frame}`);
}
await b.close();
if (bad.length) { console.error(`${bad.length} of ${styles.length} styles disagree:\n  ${bad.join('\n  ')}`); process.exit(1); }
console.log(`ok: window border and dialog titles share one weight in all ${styles.length} styles`);
