// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';

async function launch(opts: Record<string, unknown> = {}) {
  vi.resetModules();
  const t = await import('../engine/src/index.ts');
  const engine = t.start({ autoUpdate: false, fonts: 'none', source: false, ...opts });
  return { t, engine, picker: engine.picker() };
}

beforeEach(() => { localStorage.clear(); document.head.innerHTML = ''; document.body.innerHTML = ''; });

describe('persistence', () => {
  it('remembers the look when asked to, and applies it at the next start', async () => {
    let { engine } = await launch({ persist: true, appearance: { theme: 'nord', ui: 'win7' } });
    expect(engine.appearance()).toMatchObject({ theme: 'nord', ui: 'win7' });
    engine.apply({ theme: 'dracula', ui: 'spotify' });
    expect(JSON.parse(localStorage.getItem('turbothemes.appearance')!)).toMatchObject({ theme: 'dracula' });
    ({ engine } = await launch({ persist: true, appearance: { theme: 'nord', ui: 'win7' } }));
    expect(engine.appearance()).toMatchObject({ theme: 'dracula', ui: 'spotify' }); // saved beats the default
    expect(document.documentElement.dataset.ui).toBe('spotify');
  });
  it('starts on "auto" when nothing is given', async () => {
    const { engine } = await launch({ persist: true });
    expect(engine.appearance()).toMatchObject({ theme: 'auto', ui: 'auto' });
  });
  it('keeps nothing unless asked (the app may keep the choice itself)', async () => {
    const { engine } = await launch({ appearance: { theme: 'nord', ui: 'default' } });
    engine.apply({ theme: 'dracula', ui: 'default' });
    expect(localStorage.getItem('turbothemes.appearance')).toBeNull();
  });
});

describe('the headless picker', () => {
  it('lists palettes in groups, the special entries first', async () => {
    const { picker } = await launch({ appearance: { theme: 'nord', ui: 'default' } });
    const groups = picker.themes();
    expect(groups.map((g) => g.id)).toEqual(['device', 'own', 'colour', 'inspired', 'platform']);
    expect(groups[0].items.map((i) => i.id)).toEqual(['auto', 'system']);
    expect(groups[1].items.map((i) => i.id)).toEqual(['default', 'turbomusic', 'turbokeep', 'turbodocs', 'classic', 'light', 'turbomusic-light', 'turbokeep-light', 'turbodocs-light']);
    const nord = groups.flatMap((g) => g.items).find((i) => i.id === 'nord')!;
    expect(nord.colors?.bg).toMatch(/^hsl\(/);
    expect(picker.themes('light').flatMap((g) => g.items).every((i) => i.dark !== true)).toBe(true);
    expect(picker.styles()[0]).toMatchObject({ id: 'auto', isAuto: true });
  });

  it('changes and keeps parts of the look, and tells subscribers', async () => {
    const { engine, picker } = await launch({ appearance: { theme: 'nord', ui: 'default' } });
    const seen = vi.fn();
    picker.subscribe(seen);
    picker.set({ ui: 'win11' });
    expect(engine.appearance()).toMatchObject({ theme: 'nord', ui: 'win11' });
    expect(document.documentElement.dataset.ui).toBe('win11');
    expect(picker.getState().appearance.ui).toBe('win11');
    expect(seen).toHaveBeenCalled();
  });

  it('previews without keeping, and goes back', async () => {
    const { picker } = await launch({ persist: true, appearance: { theme: 'nord', ui: 'default' } });
    picker.preview({ ui: 'win98' });
    expect(document.documentElement.dataset.ui).toBe('win98');
    expect(picker.getState()).toMatchObject({ previewing: true, shown: { ui: 'win98' }, appearance: { ui: 'default' } });
    expect(JSON.parse(localStorage.getItem('turbothemes.appearance')!)?.ui).not.toBe('win98');
    picker.preview(null);
    expect(document.documentElement.dataset.ui).toBe('default');
    expect(picker.getState().previewing).toBe(false);
  });

  it('knows the palette made for a style, in the right light or dark', async () => {
    const { picker } = await launch({ appearance: { theme: 'nord', ui: 'win7' } });
    expect(picker.matchingTheme()).toBe('win7-dark'); // nord is dark
    picker.set({ theme: 'daylight' });
    expect(picker.matchingTheme()).toBe('win7');
    expect(picker.matchingTheme('winxp')).toBe('winxp'); // XP has a light palette only
    picker.useMatchingTheme();
    expect(picker.getState().appearance.theme).toBe('win7');
    picker.set({ ui: 'default' });
    expect(picker.matchingTheme()).toBe('light');
  });

  it('picks up themes that arrive in an update', async () => {
    const { t, picker } = await launch({ appearance: { theme: 'nord', ui: 'default' } });
    const seen = vi.fn(); picker.subscribe(seen);
    const before = picker.getState().revision;
    const cat = structuredClone(t.getCatalog());
    cat.palettes.push({ id: 'zzz', label: 'Zzz', mode: 'dark', bg: '#000', primary: '#fff', motif: 'dots', group: 'colour', order: 99999 });
    const { setCatalog } = await import('../engine/src/catalog.ts');
    setCatalog(cat);
    expect(picker.getState().revision).toBeGreaterThan(before);
    expect(picker.themes().flatMap((g) => g.items).some((i) => i.id === 'zzz')).toBe(true);
    expect(seen).toHaveBeenCalled();
  });

  it('resets the look to the device', async () => {
    const { picker } = await launch({ appearance: { theme: 'nord', ui: 'win7', wallpaper: true } });
    picker.resetLook();
    expect(picker.getState().appearance).toMatchObject({ theme: 'auto', ui: 'auto', wallpaper: false });
  });
});

describe('<turbo-themes-picker>', () => {
  const tag = (attrs = '') => { document.body.innerHTML = `<turbo-themes-picker ${attrs}></turbo-themes-picker>`; return document.querySelector('turbo-themes-picker') as HTMLElement & { picker: import('../engine/src/picker.ts').Picker }; };

  it('is registered by start({ picker: true }) and shows every section as drop-downs', async () => {
    await launch({ picker: true, appearance: { theme: 'nord', ui: 'default' } });
    const p = tag();
    expect(p.querySelectorAll('select').length).toBe(2); // colours, style
    expect(p.textContent).toMatch(/Wallpaper/);
    expect(p.textContent).toMatch(/Check for newer themes/);
    expect(p.querySelector('optgroup')?.getAttribute('label')).toBe('Device');
  });

  it('fills tags that were already in the page when start() ran (the usual order)', async () => {
    document.body.innerHTML = '<turbo-themes-picker sections="ui"></turbo-themes-picker>';
    await launch({ picker: true, appearance: { theme: 'nord', ui: 'default' } });
    expect(document.querySelector('turbo-themes-picker select')).not.toBeNull();
  });

  it('changes the look when a drop-down changes, and says so', async () => {
    await launch({ picker: true, appearance: { theme: 'nord', ui: 'default' } });
    const p = tag('sections="ui"');
    const changed = vi.fn(); p.addEventListener('tt-change', changed);
    const sel = p.querySelector('select')!;
    sel.value = 'win11'; sel.dispatchEvent(new Event('change'));
    expect(document.documentElement.dataset.ui).toBe('win11');
    expect(changed).toHaveBeenCalledTimes(1);
    expect((changed.mock.calls[0][0] as CustomEvent).detail).toMatchObject({ ui: 'win11' });
  });

  it('shows only the sections asked for', async () => {
    await launch({ picker: true, appearance: { theme: 'nord', ui: 'default' } });
    const p = tag('sections="theme, wallpaper"');
    expect([...p.querySelectorAll('h3')].map((h) => h.textContent)).toEqual(['Colours', 'Wallpaper']);
  });

  it('as tiles previews on hover and keeps on click', async () => {
    const { engine } = await launch({ picker: true, persist: true, appearance: { theme: 'nord', ui: 'default' } });
    const p = tag('variant="tiles" sections="theme,ui"');
    const tile = [...p.querySelectorAll<HTMLButtonElement>('.tt-tile')].find((b) => b.textContent === 'Dracula')!;
    expect(tile.querySelectorAll('.tt-sw i').length).toBe(4);
    tile.dispatchEvent(new Event('mouseenter'));
    expect(document.documentElement.dataset.theme).toBe('dracula');
    expect(engine.appearance().theme).toBe('nord'); // not kept
    tile.dispatchEvent(new Event('blur'));
    expect(document.documentElement.dataset.theme).toBe('nord');
    tile.click();
    expect(engine.appearance().theme).toBe('dracula');
    expect(p.querySelector('.tt-tile[aria-checked="true"]')?.textContent).toBe('Dracula');
  });

  it('does not redraw itself for a hover preview (that would replace the tile under the pointer, over and over)', async () => {
    await launch({ picker: true, appearance: { theme: 'nord', ui: 'default' } });
    const p = tag('variant="tiles" sections="theme"');
    const first = p.querySelector('.tt-tile')!;
    const tile = [...p.querySelectorAll<HTMLButtonElement>('.tt-tile')].find((b) => b.textContent === 'Dracula')!;
    tile.dispatchEvent(new Event('mouseenter'));
    expect(p.querySelector('.tt-tile')).toBe(first); // same DOM node: nothing was rebuilt
    tile.click();
    expect(p.querySelector('.tt-tile')).not.toBe(first); // a real change redraws
  });

  it('offers the matching colours of a style', async () => {
    await launch({ picker: true, appearance: { theme: 'nord', ui: 'win7' } });
    const p = tag('sections="theme"');
    const b = [...p.querySelectorAll('button')].find((x) => /matching colours/i.test(x.textContent ?? ''))!;
    expect(b.textContent).toContain('Windows 7 Dark');
    b.click();
    expect(document.documentElement.dataset.theme).toBe('win7-dark');
    expect([...p.querySelectorAll('button')].some((x) => /matching colours/i.test(x.textContent ?? ''))).toBe(false);
  });

  it('floating: a button that opens the panel', async () => {
    await launch({ picker: true, appearance: { theme: 'nord', ui: 'default' } });
    const p = tag('floating');
    const pop = p.querySelector<HTMLElement>('.tt-pop')!;
    expect(pop.hidden).toBe(true);
    p.querySelector<HTMLButtonElement>('.tt-float > .btn')!.click();
    expect(p.querySelector<HTMLElement>('.tt-pop')!.hidden).toBe(false);
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(p.querySelector<HTMLElement>('.tt-pop')!.hidden).toBe(true);
  });

  it('shows the wallpaper controls only when it is on', async () => {
    const { engine } = await launch({ picker: true, appearance: { theme: 'nord', ui: 'default' } });
    const p = tag('sections="wallpaper"');
    expect(p.querySelector('input[type="range"]')).toBeNull();
    engine.apply({ ...engine.appearance(), wallpaper: true });
    expect(p.querySelector('input[type="range"]')).not.toBeNull();
    expect(document.getElementById('bt-wallpaper')).not.toBeNull();
  });
});
