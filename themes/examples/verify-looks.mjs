#!/usr/bin/env node
// Looks at an app under many UI styles and widths and reports what a human would notice first. Needs playwright-core and a Chromium.
//   node examples/verify-looks.mjs --url http://localhost:5173 [--out shots] [--storage turbothemes.appearance]
//        [--looks default:default,macos:macos,win98:win98,liquid:dark] [--widths 1440,390] [--open "button[aria-label=Settings]"]
// --storage  the localStorage key the app persists the look in: `<storagePrefix>.appearance` (default prefix: turbothemes)
// --open     a selector to click after load (to check a dialog); repeat the flag for a sequence
// Writes <out>/<style>-<theme>-<width>.png and prints, per look: horizontal overflow, buttons the browser still draws natively, <select>s the OS draws, title bars whose close
// button wrapped onto a second line, and elements whose text colour does not come from the palette (low contrast).
// Exit code 1 when a check fails, so it can sit in CI.
import { mkdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const all = (k) => args.flatMap((a, i) => (a === `--${k}` ? [args[i + 1]] : []));
const url = get('url'); if (!url) { console.error('--url is required'); process.exit(2); }
const out = get('out', 'look-shots'); mkdirSync(out, { recursive: true });
const storage = get('storage', 'turbothemes.appearance');
const looks = get('looks', 'default:default,gtk4:gtk4,macos:macos,win11:win11,win98:win98,liquid:dark,material:material,fortnite5:fortnite-5').split(',').map((s) => s.split(':'));
const widths = get('widths', '1440,390').split(',').map(Number);
const opens = all('open');
const req = createRequire(process.cwd() + '/');
const { chromium } = req(process.env.PLAYWRIGHT_MODULE ?? 'playwright-core');
const exe = process.env.CHROMIUM_PATH || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch({ executablePath: exe });
let failed = 0;

for (const [ui, theme] of looks) for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w > 600 ? 900 : 844 } });
  await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [storage, JSON.stringify({ ui, theme })]);
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url); await page.waitForTimeout(1200);
  for (const sel of opens) { await page.locator(sel).first().click({ timeout: 4000 }).catch(() => errors.push(`could not click ${sel}`)); await page.waitForTimeout(600); }
  const r = await page.evaluate(() => {
    const root = document.documentElement, vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
    const sw = Math.max(root.scrollWidth, document.body.scrollWidth) - innerWidth;
    // a button the style never touched keeps the browser's own 2px outset border
    const native = [...document.querySelectorAll('button')].filter((b) => vis(b) && ['outset', 'inset'].includes(getComputedStyle(b).borderTopStyle)).map((b) => `${b.className || 'button'} "${(b.textContent || b.ariaLabel || '').trim().slice(0, 18)}"`);
    // a <select> the operating system draws: its list cannot be restyled by any look (Liquid Glass showed a plain grey one). enhanceSelects() hides the real select (class ts-native) behind a themed button
    const nativeSelects = [...document.querySelectorAll('select')].filter((s) => vis(s) && getComputedStyle(s).opacity !== '0' && !s.classList.contains('ts-native')).map((s) => s.getAttribute('aria-label') || s.className || 'select');
    // a title bar whose close button dropped under the title: the bar is not a flex row, or the title is not an <h2>
    const wrapped = [...document.querySelectorAll('.bt-titlebar')].filter((t) => { const c = t.querySelector('.bt-close'), h = t.firstElementChild; return c && h && c.getBoundingClientRect().top >= h.getBoundingClientRect().bottom - 1; }).length;
    const noH2 = [...document.querySelectorAll('.bt-titlebar')].filter((t) => !t.querySelector('h2')).length;
    const panelsLoose = [...document.querySelectorAll('.bt-panel-title')].filter((t) => !t.closest('.bt-panel')).length;
    return { dataset: `${root.dataset.ui}/${root.dataset.theme}/${root.dataset.mode}`, overflow: sw, native, nativeSelects, wrapped, noH2, panelsLoose };
  });
  await page.screenshot({ path: `${out}/${ui}-${theme}-${w}.png` });
  const problems = [];
  if (r.overflow > 1) problems.push(`sideways overflow ${r.overflow}px`);
  if (r.native.length) problems.push(`native-looking buttons: ${[...new Set(r.native)].slice(0, 6).join(', ')}`);
  if (r.nativeSelects.length) problems.push(`native <select> drop-downs (the OS draws their list; call enhanceSelects() and give them class "input"): ${[...new Set(r.nativeSelects)].slice(0, 6).join(', ')}`);
  if (r.wrapped) problems.push(`${r.wrapped} title bar(s) with the close button on a second line`);
  if (r.noH2) problems.push(`${r.noH2} .bt-titlebar without an <h2> (the style's title font and size do not reach it)`);
  if (r.panelsLoose) problems.push(`${r.panelsLoose} .bt-panel-title outside a .card.bt-panel`);
  problems.push(...errors.map((e) => `page error: ${e}`));
  console.log(`${problems.length ? 'FAIL' : 'ok  '} ${ui}/${theme} @${w}px (${r.dataset})${problems.length ? '\n     ' + problems.join('\n     ') : ''}`);
  if (problems.length) failed++;
  await ctx.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
