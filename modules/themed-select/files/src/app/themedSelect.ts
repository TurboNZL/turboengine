import { h } from './dom.ts';
import { icon } from './icons.ts';

/**
 * Drop-downs drawn by the theme. A native `<select>` opens the operating system's own list, which no look can restyle
 * (Liquid Glass showed a plain grey list). `enhanceSelects()` upgrades every `select.input` in the page, now and when new
 * ones appear: the `<select>` stays in the page, hidden, as the one source of truth, so existing code that reads `.value`,
 * sets `.value`, rebuilds the options or listens for `change` keeps working untouched. A button in its place shows the choice
 * and opens a `bt-menu` list (TurboKeep's `Select`: keyboard, search for long lists, a lit row, a check on the chosen one).
 */
const SEARCH_FROM = 12;

interface Entry {
  value: string;
  label: string;
  disabled: boolean;
}

function entries(sel: HTMLSelectElement): Entry[] {
  return [...sel.options].filter((o) => !o.hidden).map((o) => ({ value: o.value, label: o.textContent ?? o.value, disabled: o.disabled }));
}

function upgrade(sel: HTMLSelectElement): void {
  if (sel.dataset.themed || sel.multiple || sel.size > 1) return;
  sel.dataset.themed = '1';
  const label = h('span', { class: 'ts-label' });
  const btn = h('button', { type: 'button', class: `${sel.className} bt-select themed-select`.trim(), 'aria-haspopup': 'listbox', 'aria-expanded': 'false' }, label, icon('chevron', 14));
  sel.classList.add('ts-native');
  sel.tabIndex = -1;
  sel.setAttribute('aria-hidden', 'true');
  sel.after(btn);

  const sync = () => {
    const opt = sel.options[sel.selectedIndex];
    label.textContent = opt?.textContent ?? '';
    label.classList.toggle('hint', !opt);
    btn.disabled = sel.disabled;
    btn.hidden = sel.hidden;
    const name = sel.getAttribute('aria-label');
    if (name) btn.setAttribute('aria-label', name);
    btn.className = `${sel.className.replace('ts-native', '')} bt-select themed-select`.replace(/\s+/g, ' ').trim();
  };

  // Code that sets the value or the options from script does not fire `change`: watch for it.
  const valueProp = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!;
  Object.defineProperty(sel, 'value', { configurable: true, get: () => valueProp.get!.call(sel), set: (v: string) => (valueProp.set!.call(sel, v), sync()) });
  const indexProp = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex')!;
  Object.defineProperty(sel, 'selectedIndex', { configurable: true, get: () => indexProp.get!.call(sel), set: (v: number) => (indexProp.set!.call(sel, v), sync()) });
  new MutationObserver(sync).observe(sel, { childList: true, subtree: true, attributes: true, characterData: true });
  sel.addEventListener('change', sync);
  sync();

  let menu: HTMLElement | null = null;
  let list: Entry[] = [];
  let shown: Entry[] = [];
  let hi = 0;
  let query = '';
  let search: HTMLInputElement | null = null;

  const close = (refocus = false) => {
    menu?.remove();
    menu = null;
    btn.setAttribute('aria-expanded', 'false');
    window.removeEventListener('pointerdown', away, true);
    window.removeEventListener('resize', place);
    window.removeEventListener('scroll', place, true);
    if (refocus) btn.focus();
  };
  const away = (e: Event) => {
    if (!menu?.contains(e.target as Node) && !btn.contains(e.target as Node)) close();
  };

  const choose = (e: Entry | undefined) => {
    if (!e || e.disabled) return;
    if (sel.value !== e.value) {
      sel.value = e.value;
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    close(true);
  };

  function place(): void {
    if (!menu) return;
    const r = btn.getBoundingClientRect();
    const dock = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dock-h')) || 0; // the dock covers the end of the window
    const below = window.innerHeight - dock - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 200 && above > below;
    const w = Math.max(r.width, 176);
    menu.style.minWidth = `${w}px`;
    menu.style.maxHeight = `${Math.max(140, Math.min(340, up ? above : below))}px`;
    menu.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - w - 8))}px`;
    // measured with offsetHeight: the opening animation scales the box, getBoundingClientRect would report it too small
    menu.style.top = up ? `${Math.max(8, r.top - menu.offsetHeight - 6)}px` : `${r.bottom + 6}px`;
  }

  const mark = (i: number, scroll = true) => {
    hi = Math.max(0, Math.min(shown.length - 1, i));
    menu?.querySelectorAll('.ts-option').forEach((n, k) => n.classList.toggle('bt-select-hi', k === hi));
    if (scroll) menu?.querySelectorAll('.ts-option')[hi]?.scrollIntoView({ block: 'nearest' });
  };

  const draw = () => {
    if (!menu) return;
    const q = query.trim().toLowerCase();
    shown = q ? list.filter((e) => e.label.toLowerCase().includes(q)) : list;
    const body = menu.querySelector('.ts-list')!;
    body.replaceChildren(
      ...(shown.length
        ? shown.map((e, i) => {
            const chosen = e.value === sel.value;
            const row = h('button', { type: 'button', class: 'ts-option', role: 'option', 'aria-selected': String(chosen), disabled: e.disabled }, h('span', { class: 'ts-text' }, e.label), chosen ? icon('check', 14) : null);
            row.addEventListener('pointerenter', () => mark(i, false));
            row.addEventListener('click', () => choose(e));
            return row;
          })
        : [h('div', { class: 'ts-none hint' }, 'Nothing matches')]),
    );
    mark(Math.max(0, shown.findIndex((e) => e.value === sel.value)) * (q ? 0 : 1));
    place();
  };

  const key = (e: KeyboardEvent) => {
    if (e.key === 'Escape') (e.preventDefault(), e.stopPropagation(), close(true));
    else if (e.key === 'ArrowDown') (e.preventDefault(), mark(hi + 1));
    else if (e.key === 'ArrowUp') (e.preventDefault(), mark(hi - 1));
    else if (e.key === 'Home') (e.preventDefault(), mark(0));
    else if (e.key === 'End') (e.preventDefault(), mark(shown.length - 1));
    else if (e.key === 'Enter' || (e.key === ' ' && !search)) (e.preventDefault(), choose(shown[hi]));
    else if (e.key === 'Tab') close();
    else if (!search && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      const k = e.key.toLowerCase();
      const next = shown.findIndex((x, i) => i > hi && x.label.toLowerCase().startsWith(k));
      const any = next >= 0 ? next : shown.findIndex((x) => x.label.toLowerCase().startsWith(k));
      if (any >= 0) mark(any);
    }
  };

  const open = () => {
    if (menu || btn.disabled) return;
    list = entries(sel);
    query = '';
    search = list.length > SEARCH_FROM ? h('input', { class: 'input ts-search', type: 'text', placeholder: 'Search…', 'aria-label': 'Search the list', autocomplete: 'off', spellcheck: false }) : null;
    menu = h('div', { class: 'bt-menu themed-select-menu tk-pop', role: 'listbox', 'aria-label': sel.getAttribute('aria-label') ?? undefined }, search ? h('div', { class: 'ts-searchbox' }, search) : null, h('div', { class: 'ts-list' }));
    menu.addEventListener('keydown', key);
    search?.addEventListener('input', () => ((query = search!.value), draw()));
    document.body.append(menu);
    btn.setAttribute('aria-expanded', 'true');
    draw();
    window.addEventListener('pointerdown', away, true);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    menu.tabIndex = -1;
    (search ?? menu).focus({ preventScroll: true });
  };

  btn.addEventListener('click', () => (menu ? close() : open()));
  btn.addEventListener('keydown', (e) => {
    if (!menu && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) (e.preventDefault(), open());
  });
  // A label for the select (<label> wrapping it) should open the list too, and a form field's focus() should land on the button.
  sel.focus = () => btn.focus();
}

/** Upgrade every `select.input` in the page and keep upgrading the ones that appear later. Safe to call again. */
export function enhanceSelects(root: ParentNode = document): void {
  const all = () => root.querySelectorAll<HTMLSelectElement>('select.input:not([data-themed])').forEach(upgrade);
  all();
  if ((root as any).__selectWatch) return;
  (root as any).__selectWatch = true;
  new MutationObserver(all).observe(root === document ? document.documentElement : (root as Element), { childList: true, subtree: true });
}
