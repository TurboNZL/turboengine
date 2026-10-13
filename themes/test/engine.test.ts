// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import builtin from 'virtual:builtin';
import { hashText } from '../engine/src/hash.ts';
import type { Catalog, Manifest } from '../engine/src/types.ts';

type Files = Record<string, string>;
/** A themes folder as the updater sees it, built from the built-in one with a change. */
function remote(change: (c: Catalog, css: string) => { catalog?: Partial<Catalog>; css?: string; apiVersion?: number } = () => ({})) {
  const base = structuredClone(builtin.catalog) as Catalog;
  const r = change(base, builtin.css);
  const catalog = { ...base, ...(r.catalog ?? {}) } as Catalog;
  const css = r.css ?? builtin.css;
  const catalogText = JSON.stringify(catalog);
  const manifest: Manifest = { apiVersion: r.apiVersion ?? catalog.apiVersion, hash: hashText(catalogText + '\n' + css), built: 'test', files: { catalog: 'themes.json', css: 'themes.css' } };
  const files: Files = { 'manifest.json': JSON.stringify(manifest), 'themes.json': catalogText, 'themes.css': css };
  const calls: string[] = [];
  const source = { describe: 'fake', fetchText: async (f: string) => { calls.push(f); if (!(f in files)) throw new Error(`${f}: HTTP 404`); return files[f]; } };
  return { source, files, calls, manifest, catalog };
}

const newer = () => remote((c, css) => ({
  catalog: { palettes: [...c.palettes, { id: 'zzz-new', label: 'Brand new', mode: 'dark', bg: '#101010', primary: '#ff00aa', motif: 'dots', group: 'colour', order: 99999 }] },
  css: css + '\n[data-ui="win7"] .btn { outline: 1px solid red; }',
}));

/** The engine keeps state in module variables, so each "launch" of the app gets fresh modules. */
async function launch() {
  vi.resetModules();
  return import('../engine/src/index.ts');
}

beforeEach(() => { localStorage.clear(); document.head.innerHTML = ''; document.body.innerHTML = ''; document.documentElement.removeAttribute('data-ui'); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('start', () => {
  it('puts the built-in themes to work and applies the look', async () => {
    const t = await launch();
    t.start({ appearance: { theme: 'nord', ui: 'win7', glass: 'clear' }, autoUpdate: false, fonts: 'none' });
    const style = document.getElementById('turbothemes-css') as HTMLStyleElement;
    expect(style.textContent).toBe(builtin.css);
    const root = document.documentElement;
    expect(root.dataset.theme).toBe('nord');
    expect(root.dataset.mode).toBe('dark');
    expect(root.dataset.ui).toBe('win7');
    expect(root.dataset.glass).toBe('clear');
    expect(root.style.getPropertyValue('--bg')).toMatch(/^\d+ \d+% [\d.]+%$/);
    expect(t.listThemes().slice(0, 2).map((x) => x.id)).toEqual(['auto', 'system']);
  });

  it('falls back to the defaults for ids the themes do not have, and clears the colours of an own palette', async () => {
    const t = await launch();
    const engine = t.start({ appearance: { theme: 'nord', ui: 'nope' }, autoUpdate: false, fonts: 'none' });
    expect(document.documentElement.dataset.ui).toBe('default');
    engine.apply({ theme: 'classic', ui: 'default' });
    expect(document.documentElement.style.getPropertyValue('--bg')).toBe('');
    expect(document.documentElement.dataset.theme).toBe('classic');
    engine.apply({ theme: 'gone', ui: 'default' });
    expect(document.documentElement.dataset.theme).toBe('default');
  });

  it('"auto" becomes the look of the device and "system" follows light and dark', async () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('dark'), addEventListener() {}, removeEventListener() {} }));
    const t = await launch();
    const engine = t.start({ appearance: { theme: 'auto', ui: 'auto' }, autoUpdate: false, fonts: 'none' });
    expect(['win11', 'macos', 'gtk4', 'default', 'material', 'oneui', 'breeze', 'yaru']).toContain(document.documentElement.dataset.ui);
    engine.apply({ theme: 'system', ui: 'default' });
    expect(document.documentElement.dataset.theme).toBe('default');
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: !q.includes('dark'), addEventListener() {}, removeEventListener() {} }));
    engine.apply({ theme: 'system', ui: 'default' });
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});

describe('the themes updater', () => {
  it('downloads newer themes, switches to them live and remembers them', async () => {
    const t = await launch();
    const engine = t.start({ appearance: { theme: 'zzz-new', ui: 'win7' }, autoUpdate: false, fonts: 'none', source: false });
    expect(document.documentElement.dataset.theme).toBe('default'); // not known yet
    const seen = vi.fn();
    t.subscribe(seen);
    const r = newer();
    engine.setSource(r.source);
    const res = await engine.update();
    expect(res).toMatchObject({ status: 'updated', added: ['zzz-new'] });
    expect(seen).toHaveBeenCalled();
    expect(t.listThemes().some((x) => x.id === 'zzz-new')).toBe(true);
    expect(document.documentElement.dataset.theme).toBe('zzz-new'); // the look is re-applied by itself
    expect((document.getElementById('turbothemes-css') as HTMLElement).textContent).toContain('outline: 1px solid red');
    expect(engine.version()).toMatchObject({ origin: 'downloaded', hash: r.manifest.hash });
    expect(localStorage.getItem('turbothemes.themes')).toContain('zzz-new');
    expect(document.querySelectorAll('#turbothemes-css').length).toBe(1);
  });

  it('is quiet when nothing changed', async () => {
    const t = await launch();
    const engine = t.start({ autoUpdate: false, fonts: 'none', source: false });
    const r = remote();
    engine.setSource(r.source);
    expect((await engine.update()).status).toBe('current');
    expect(r.calls).toEqual(['manifest.json']); // only the small file was read
  });

  it('uses downloaded themes on the next launch, until a newer engine brings newer built-in ones', async () => {
    let t = await launch();
    let engine = t.start({ autoUpdate: false, fonts: 'none', source: false });
    engine.setSource(newer().source);
    await engine.update();

    t = await launch();
    engine = t.start({ appearance: { theme: 'zzz-new', ui: 'default' }, autoUpdate: false, fonts: 'none', source: false });
    expect(engine.version().origin).toBe('downloaded');
    expect(document.documentElement.dataset.theme).toBe('zzz-new');

    const stored = JSON.parse(localStorage.getItem('turbothemes.themes')!);
    stored.builtinHash = 'an-older-engine';
    localStorage.setItem('turbothemes.themes', JSON.stringify(stored));
    t = await launch();
    engine = t.start({ autoUpdate: false, fonts: 'none', source: false });
    expect(engine.version().origin).toBe('builtin');
    expect(localStorage.getItem('turbothemes.themes')).toBeNull();
  });

  it('can go back to the built-in themes', async () => {
    const t = await launch();
    const engine = t.start({ appearance: { theme: 'zzz-new', ui: 'default' }, autoUpdate: false, fonts: 'none', source: false });
    engine.setSource(newer().source);
    await engine.update();
    engine.resetToBuiltin();
    expect(engine.version().origin).toBe('builtin');
    expect(t.listThemes().some((x) => x.id === 'zzz-new')).toBe(false);
    expect(localStorage.getItem('turbothemes.themes')).toBeNull();
    expect(document.documentElement.dataset.theme).toBe('default');
  });

  it('refuses themes that need a newer engine', async () => {
    const t = await launch();
    const engine = t.start({ autoUpdate: false, fonts: 'none', source: remote(() => ({ catalog: { apiVersion: 99 } as Partial<Catalog>, apiVersion: 99 })).source });
    const res = await engine.update();
    expect(res.status).toBe('engine-too-old');
    expect(t.listThemes().some((x) => x.id === 'zzz-new')).toBe(false);
  });

  it('refuses a download that does not match its checksum, after trying twice', async () => {
    const t = await launch();
    const r = newer();
    r.files['themes.css'] += '/* tampered */';
    const res = await t.checkForUpdates(r.source, { retryDelayMs: 1 });
    expect(res.status).toBe('failed');
    expect(res.message).toMatch(/checksum/);
    expect(r.calls.filter((c) => c === 'themes.css').length).toBe(2);
  });

  it('refuses themes that are not valid and keeps the current ones', async () => {
    const t = await launch();
    t.start({ autoUpdate: false, fonts: 'none', source: false });
    const r = remote((c) => ({ catalog: { palettes: c.palettes.filter((p) => p.id !== 'default') } }));
    const res = await t.checkForUpdates(r.source);
    expect(res.status).toBe('failed');
    expect(res.message).toMatch(/not valid/);
    expect(t.listPalettes().some((p) => p.id === 'default')).toBe(true);
  });

  it('refuses themes with a device rule that is not a valid pattern', async () => {
    const t = await launch();
    t.start({ autoUpdate: false, fonts: 'none', source: false });
    const r = remote((c) => ({ catalog: { config: { ...c.config, devices: [{ name: 'x', when: { ua: '(' }, ui: 'default', light: 'light', dark: 'default' }] } } }));
    const res = await t.checkForUpdates(r.source);
    expect(res.status).toBe('failed');
    expect(res.message).toMatch(/not valid/);
  });

  it('does not count a failed check, so the next start tries again', async () => {
    vi.useFakeTimers();
    let t = await launch();
    t.start({ autoUpdate: false, fonts: 'none', source: false });
    await t.checkForUpdates({ describe: 'x', fetchText: async () => { throw new Error('offline'); } });
    expect(localStorage.getItem('turbothemes.themesChecked')).toBeNull();
    const r = remote();
    t = await launch();
    t.start({ fonts: 'none', source: r.source, checkEveryMs: 60_000 });
    await vi.advanceTimersByTimeAsync(6000);
    expect(r.calls.length).toBe(1);
    expect(localStorage.getItem('turbothemes.themesChecked')).not.toBeNull();
  });

  it('never throws when the network is down', async () => {
    const t = await launch();
    t.start({ autoUpdate: false, fonts: 'none', source: false });
    const res = await t.checkForUpdates({ describe: 'x', fetchText: async () => { throw new Error('offline'); } });
    expect(res).toMatchObject({ status: 'failed' });
    expect(res.message).toMatch(/offline/);
  });

  it('checks in the background after start, but not more often than asked', async () => {
    vi.useFakeTimers();
    const r = remote();
    let t = await launch();
    t.start({ fonts: 'none', source: r.source, checkEveryMs: 60_000 });
    await vi.advanceTimersByTimeAsync(6000);
    expect(r.calls.length).toBe(1);

    t = await launch();
    t.start({ fonts: 'none', source: r.source, checkEveryMs: 60_000 });
    await vi.advanceTimersByTimeAsync(6000);
    expect(r.calls.length).toBe(1); // checked a moment ago
    vi.setSystemTime(Date.now() + 120_000);
    t = await launch();
    t.start({ fonts: 'none', source: r.source, checkEveryMs: 60_000 });
    await vi.advanceTimersByTimeAsync(6000);
    expect(r.calls.length).toBe(2);
  });

  it('keeps its settings under the app\'s own prefix', async () => {
    const t = await launch();
    const engine = t.start({ storagePrefix: 'myapp', autoUpdate: false, fonts: 'none', source: false });
    engine.setSource(newer().source);
    await engine.update();
    expect(localStorage.getItem('myapp.themes')).toContain('zzz-new');
    expect(localStorage.getItem('turbothemes.themes')).toBeNull();
  });
});

describe('where updates come from', () => {
  it('reads a public GitHub repository from raw.githubusercontent.com', async () => {
    const f = vi.fn(async () => new Response('{}'));
    vi.stubGlobal('fetch', f);
    const { githubSource } = await launch();
    await githubSource({ repo: 'me/themes', ref: 'dev' }).fetchText('manifest.json');
    expect(f).toHaveBeenCalledWith('https://raw.githubusercontent.com/me/themes/dev/themes/dist/manifest.json', expect.objectContaining({ cache: 'no-cache' }));
  });
  it('reads the turboengine repository (themes/dist) when told nothing', async () => {
    const f = vi.fn(async () => new Response('{}'));
    vi.stubGlobal('fetch', f);
    const { githubSource } = await launch();
    await githubSource().fetchText('manifest.json');
    expect(f).toHaveBeenCalledWith('https://raw.githubusercontent.com/TurboNZL/turboengine/main/themes/dist/manifest.json', expect.objectContaining({ cache: 'no-cache' }));
  });
  it('reads a private one through the GitHub API with the token', async () => {
    const f = vi.fn(async () => new Response('{}'));
    vi.stubGlobal('fetch', f);
    const { githubSource } = await launch();
    await githubSource({ repo: 'me/themes', token: 'tok' }).fetchText('themes.css');
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.github.com/repos/me/themes/contents/themes/dist/themes.css?ref=main');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });
  it('explains an HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    const { urlSource } = await launch();
    await expect(urlSource('https://x.test/dist').fetchText('manifest.json')).rejects.toThrow(/HTTP 404/);
  });
});

describe('fonts, wallpaper and effects', () => {
  it('loads a style\'s fonts from the CDN when asked, once, and not when the app bundles its own', async () => {
    let t = await launch();
    t.start({ appearance: { theme: 'default', ui: 'win7' }, autoUpdate: false, source: false });
    const links = [...document.querySelectorAll('link[data-turbothemes-font]')].map((l) => (l as HTMLLinkElement).href);
    expect(links).toContain('https://cdn.jsdelivr.net/npm/@fontsource/open-sans@5/400.css');
    const before = links.length;
    t.applyAppearance({ theme: 'default', ui: 'win7' });
    expect(document.querySelectorAll('link[data-turbothemes-font]').length).toBe(before);

    document.head.innerHTML = '';
    t = await launch();
    t.start({ appearance: { theme: 'default', ui: 'win7' }, autoUpdate: false, source: false, fonts: 'none' });
    expect(document.querySelectorAll('link[data-turbothemes-font]').length).toBe(0);
  });

  it('draws the wallpaper behind the page and removes it again', async () => {
    const t = await launch();
    const engine = t.start({ appearance: { theme: 'ocean', ui: 'default', wallpaper: true, wallpaperDarkness: 0.5 }, autoUpdate: false, fonts: 'none', source: false });
    expect(document.getElementById('bt-wallpaper')).not.toBeNull();
    expect(document.documentElement.getAttribute('data-wallpaper')).toBe('on');
    engine.apply({ theme: 'ocean', ui: 'default', wallpaper: false });
    expect(document.documentElement.hasAttribute('data-wallpaper')).toBe(false);
    expect(document.getElementById('bt-wallpaper')).toBeNull();
  });

  it('uses a wallpaper tint the palette asks for', async () => {
    const t = await launch();
    t.start({ autoUpdate: false, fonts: 'none', source: false });
    expect(t.themeWallpaper('lg-marshmallow')).not.toBe(t.themeWallpaper('macos'));
    expect(t.getPalette('lg-marshmallow')?.wallpaper?.primary).toEqual([338, 78, 62]);
  });

  it('ripples only in styles that ask for the ripple effect', async () => {
    const t = await launch();
    t.start({ appearance: { theme: 'default', ui: 'default' }, autoUpdate: false, fonts: 'none', source: false });
    document.body.innerHTML = '<div data-ui="lgux"><button class="btn" id="a">a</button></div><div data-ui="win7"><button class="btn" id="b">b</button></div>';
    const press = (id: string) => document.getElementById(id)!.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 5, clientY: 5 }));
    press('b');
    expect(document.querySelectorAll('.bt-ripple').length).toBe(0);
    press('a');
    expect(document.querySelectorAll('.bt-ripple').length).toBe(1);
  });
});
