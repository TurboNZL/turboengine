// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';

async function launch(opts: Record<string, unknown> = {}) {
  vi.resetModules();
  const t = await import('../engine/src/index.ts');
  const engine = t.start({ autoUpdate: false, fonts: 'none', source: false, ...opts });
  return { t, engine };
}
beforeEach(() => { localStorage.clear(); document.head.innerHTML = ''; document.body.innerHTML = ''; });

const menu = () => document.querySelector<HTMLElement>('.themed-select-menu');
const rowsOf = (m: HTMLElement) => [...m.querySelectorAll<HTMLButtonElement>('.ts-option')];

describe('themed select (engine/src/select.ts)', () => {
  it('replaces a select.input with a button and keeps the select, hidden, as the source of truth', async () => {
    const { t } = await launch();
    document.body.innerHTML = '<select class="input" aria-label="Fruit"><option value="a">Apple</option><option value="b" selected>Banana</option></select>';
    t.enhanceSelects();
    const sel = document.querySelector('select')!, btn = document.querySelector<HTMLButtonElement>('button.themed-select')!;
    expect(sel.classList.contains('ts-native')).toBe(true);
    expect(sel.getAttribute('aria-hidden')).toBe('true');
    expect(btn.textContent).toBe('Banana');
    expect(btn.getAttribute('aria-haspopup')).toBe('listbox');
    expect(btn.getAttribute('aria-label')).toBe('Fruit');
    sel.value = 'a'; // set from script: no change event, the label must still follow
    expect(btn.textContent).toBe('Apple');
  });

  it('opens a .bt-menu list, picks a row with a click and fires input and change on the select', async () => {
    const { t } = await launch();
    document.body.innerHTML = '<select class="input"><option value="a">Apple</option><option value="b">Banana</option></select>';
    t.enhanceSelects();
    const sel = document.querySelector('select')!, btn = document.querySelector<HTMLButtonElement>('button.themed-select')!;
    const changed = vi.fn(); sel.addEventListener('change', changed);
    btn.click();
    expect(menu()?.classList.contains('bt-menu')).toBe(true);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(rowsOf(menu()!).map((r) => r.textContent)).toEqual(['Apple', 'Banana']);
    expect(rowsOf(menu()!)[0]!.getAttribute('aria-selected')).toBe('true');
    rowsOf(menu()!)[1]!.click();
    expect(sel.value).toBe('b');
    expect(changed).toHaveBeenCalledTimes(1);
    expect(btn.textContent).toBe('Banana');
    expect(menu()).toBeNull();
  });

  it('draws <optgroup> labels as headings that cannot be chosen, and the keyboard skips them', async () => {
    const { t } = await launch();
    document.body.innerHTML = '<select class="input"><optgroup label="Device"><option value="d1">Match</option></optgroup><optgroup label="Dark"><option value="k1">Night</option><option value="k2">Nord</option></optgroup></select>';
    t.enhanceSelects();
    const sel = document.querySelector('select')!;
    document.querySelector<HTMLButtonElement>('button.themed-select')!.click();
    expect([...menu()!.querySelectorAll('.ts-heading')].map((h) => h.textContent)).toEqual(['Device', 'Dark']);
    expect(rowsOf(menu()!).length).toBe(3);
    // the lit row starts on the chosen one (Match); ArrowDown must jump over the "Dark" heading to Night, then Nord
    const key = (k: string) => menu()!.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    key('ArrowDown'); key('ArrowDown'); key('Enter');
    expect(sel.value).toBe('k2');
  });

  it('Escape closes without changing anything', async () => {
    const { t } = await launch();
    document.body.innerHTML = '<select class="input"><option value="a">Apple</option><option value="b">Banana</option></select>';
    t.enhanceSelects();
    document.querySelector<HTMLButtonElement>('button.themed-select')!.click();
    menu()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(menu()).toBeNull();
    expect(document.querySelector('select')!.value).toBe('a');
  });

  it('adds a search box above 12 rows and filters by it', async () => {
    const { t } = await launch();
    document.body.innerHTML = `<select class="input">${Array.from({ length: 14 }, (_, i) => `<option value="v${i}">Item ${i}${i === 9 ? ' special' : ''}</option>`).join('')}</select>`;
    t.enhanceSelects();
    document.querySelector<HTMLButtonElement>('button.themed-select')!.click();
    const search = menu()!.querySelector<HTMLInputElement>('input.ts-search')!;
    expect(search).not.toBeNull();
    search.value = 'special'; search.dispatchEvent(new Event('input'));
    expect(rowsOf(menu()!).map((r) => r.textContent)).toEqual(['Item 9 special']);
  });

  it('upgrades selects that appear later, and leaves multiple and listbox selects alone', async () => {
    const { t } = await launch();
    t.enhanceSelects();
    document.body.insertAdjacentHTML('beforeend', '<select class="input" id="late"><option>x</option></select><select class="input" id="many" multiple><option>y</option></select>');
    await new Promise((r) => setTimeout(r, 0)); // MutationObserver callbacks are microtasks
    expect(document.querySelector('#late')!.classList.contains('ts-native')).toBe(true);
    expect(document.querySelector('#many')!.classList.contains('ts-native')).toBe(false);
  });
});

describe('<turbo-themes-picker> has no native drop-downs', () => {
  it('every select it makes is hidden behind a themed button, in both the inline and the floating form', async () => {
    const { } = await launch({ picker: true, appearance: { theme: 'nord', ui: 'default' } });
    for (const attrs of ['', 'floating']) {
      document.body.innerHTML = `<turbo-themes-picker ${attrs}></turbo-themes-picker>`;
      const p = document.querySelector('turbo-themes-picker')!;
      const selects = [...p.querySelectorAll('select')];
      expect(selects.length).toBe(2);
      expect(selects.every((s) => s.classList.contains('ts-native'))).toBe(true);
      expect(p.querySelectorAll('button.themed-select').length).toBe(2);
    }
  });

  it('the colours list keeps its group headings and picking a row changes the look', async () => {
    const { engine } = await launch({ picker: true, appearance: { theme: 'nord', ui: 'default' } });
    document.body.innerHTML = '<turbo-themes-picker sections="theme"></turbo-themes-picker>';
    const p = document.querySelector('turbo-themes-picker')!;
    p.querySelector<HTMLButtonElement>('button.themed-select')!.click();
    expect(menu()!.querySelectorAll('.ts-heading').length).toBeGreaterThan(1);
    const dracula = rowsOf(menu()!).find((r) => r.textContent === 'Dracula')!;
    dracula.click();
    expect(engine.appearance().theme).toBe('dracula');
    expect(document.documentElement.dataset.theme).toBe('dracula');
  });

  it('the list opened from the floating picker sits above the picker (a class the stylesheet raises)', async () => {
    await launch({ picker: true, appearance: { theme: 'nord', ui: 'default' } });
    document.body.innerHTML = '<turbo-themes-picker floating></turbo-themes-picker>';
    const p = document.querySelector('turbo-themes-picker')!;
    p.querySelector<HTMLButtonElement>('button.themed-select')!.click();
    expect(menu()!.classList.contains('ts-in-picker')).toBe(true);
  });

  it('choosing a row in the list does not close the floating picker (the list is outside the element)', async () => {
    const { engine } = await launch({ picker: true, appearance: { theme: 'nord', ui: 'default' } });
    document.body.innerHTML = '<turbo-themes-picker floating></turbo-themes-picker>';
    const p = document.querySelector('turbo-themes-picker')!;
    p.querySelector<HTMLButtonElement>('.tt-float > button')!.click(); // open the panel
    expect(p.querySelector<HTMLElement>('.tt-pop')!.hidden).toBe(false);
    p.querySelectorAll<HTMLButtonElement>('button.themed-select')[1]!.click();
    const row = [...document.querySelectorAll<HTMLButtonElement>('.themed-select-menu .ts-option')].find((r) => r.textContent === 'Glass lens' || r.textContent?.includes('Liquid'))!;
    expect(row).toBeTruthy();
    // what the browser does first: a pointerdown on the row, which the picker watches in the capture phase
    row.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    row.click();
    expect(engine.appearance().ui).toBe('liquid');
    expect(p.querySelector<HTMLElement>('.tt-pop')!.hidden).toBe(false); // still open
  });
});
