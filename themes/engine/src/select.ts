/**
 * Drop-downs drawn by the theme. A native `<select>` opens the operating system's own list, which no look can restyle (Liquid Glass
 * showed a plain grey one), so a TurboNZL app or site never ships one: every `select.input` is upgraded with `enhanceSelects()`.
 * The `<select>` stays in the page, hidden, as the one source of truth, so code that reads `.value`, sets `.value`, rebuilds the options or
 * listens for `change` keeps working untouched. A button in its place shows the choice and opens a `.bt-menu` list (keyboard, a search box
 * above 12 rows, a lit row, a check on the chosen one, `<optgroup>` labels as headings).
 *
 * Source: the vanilla twin of TurboKeep's `Select.tsx`, first written in TurboCut (`src/app/themedSelect.ts`, engine module `themed-select`),
 * moved into the engine so `<turbo-themes-picker>` and any plain page get it without copying a file. CSS: `base.css` (`.themed-select`, `.ts-*`).
 */
const SEARCH_FROM = 12;

interface Row {
  value: string;
  label: string;
  disabled: boolean;
  /** an <optgroup> heading: shown, never chosen */
  heading?: boolean;
}

const SVG = 'http://www.w3.org/2000/svg';
function icon(d: string): SVGElement {
  const s = document.createElementNS(SVG, 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '14'); s.setAttribute('height', '14'); s.setAttribute('class', 'ico');
  s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2.2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(SVG, 'path'); p.setAttribute('d', d); s.append(p);
  return s;
}
const chevron = () => icon('m6 9 6 6 6-6');
const check = () => icon('M20 6 9 17l-5-5');

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, string | boolean | undefined> = {}, ...kids: (Node | null)[]): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) { if (v === undefined || v === false) continue; if (v === true) n.setAttribute(k, ''); else n.setAttribute(k, v); }
  for (const k of kids) if (k) n.append(k);
  return n;
}

/** The rows of a select: options in order, with an <optgroup>'s label as a heading row before its options. */
function rows(sel: HTMLSelectElement): Row[] {
  const out: Row[] = [];
  const add = (o: HTMLOptionElement) => { if (!o.hidden) out.push({ value: o.value, label: o.textContent ?? o.value, disabled: o.disabled }); };
  for (const c of Array.from(sel.children)) {
    if (c instanceof HTMLOptGroupElement) { out.push({ value: '', label: c.label, disabled: true, heading: true }); Array.from(c.children).forEach((o) => add(o as HTMLOptionElement)); }
    else if (c instanceof HTMLOptionElement) add(c);
  }
  return out;
}

export function enhanceSelect(sel: HTMLSelectElement): void {
  if (sel.dataset.themed || sel.multiple || sel.size > 1) return;
  sel.dataset.themed = '1';
  const label = el('span', { class: 'ts-label' });
  const btn = el('button', { type: 'button', class: `${sel.className} bt-select themed-select`.trim(), 'aria-haspopup': 'listbox', 'aria-expanded': 'false' }, label, chevron());
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
  Object.defineProperty(sel, 'value', { configurable: true, get: () => valueProp.get!.call(sel), set: (v: string) => { valueProp.set!.call(sel, v); sync(); } });
  const indexProp = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex')!;
  Object.defineProperty(sel, 'selectedIndex', { configurable: true, get: () => indexProp.get!.call(sel), set: (v: number) => { indexProp.set!.call(sel, v); sync(); } });
  new MutationObserver(sync).observe(sel, { childList: true, subtree: true, attributes: true, characterData: true });
  sel.addEventListener('change', sync);
  sync();

  let menu: HTMLElement | null = null;
  let list: Row[] = [];
  let shown: Row[] = [];
  let hi = 0;
  let query = '';
  let search: HTMLInputElement | null = null;
  const choosable = () => shown.map((r, i) => (r.heading || r.disabled ? -1 : i)).filter((i) => i >= 0);

  const close = (refocus = false) => {
    menu?.remove();
    menu = null;
    btn.setAttribute('aria-expanded', 'false');
    window.removeEventListener('pointerdown', away, true);
    window.removeEventListener('resize', place);
    window.removeEventListener('scroll', place, true);
    if (refocus) btn.focus();
  };
  const away = (e: Event) => { if (!menu?.contains(e.target as Node) && !btn.contains(e.target as Node)) close(); };

  const choose = (r: Row | undefined) => {
    if (!r || r.disabled || r.heading) return;
    if (sel.value !== r.value) {
      sel.value = r.value;
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    close(true);
  };

  function place(): void {
    if (!menu) return;
    const r = btn.getBoundingClientRect();
    const dock = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dock-h')) || 0; // a bottom dock covers the end of the window
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
    const ok = choosable();
    if (!ok.length) return;
    hi = ok.includes(i) ? i : ok.reduce((best, c) => (Math.abs(c - i) < Math.abs(best - i) ? c : best), ok[0]!);
    // headings are children of the list too, so `hi` indexes the children, not `.ts-option`
    const kids = Array.from(menu?.querySelector('.ts-list')?.children ?? []);
    kids.forEach((n, k) => n.classList.toggle('bt-select-hi', k === hi && n.classList.contains('ts-option')));
    if (scroll) kids[hi]?.scrollIntoView({ block: 'nearest' });
  };

  const draw = () => {
    if (!menu) return;
    const q = query.trim().toLowerCase();
    shown = q ? list.filter((r) => !r.heading && r.label.toLowerCase().includes(q)) : list;
    const body = menu.querySelector('.ts-list')!;
    body.replaceChildren(
      ...(shown.length
        ? shown.map((r, i) => {
            if (r.heading) return el('div', { class: 'ts-heading', role: 'presentation' }, document.createTextNode(r.label));
            const chosen = r.value === sel.value;
            const row = el('button', { type: 'button', class: 'ts-option', role: 'option', 'aria-selected': String(chosen), disabled: r.disabled }, el('span', { class: 'ts-text' }, document.createTextNode(r.label)), chosen ? check() : null);
            row.addEventListener('pointerenter', () => mark(i, false));
            row.addEventListener('click', () => choose(r));
            return row;
          })
        : [el('div', { class: 'ts-none hint' }, document.createTextNode('Nothing matches'))]),
    );
    mark(Math.max(0, shown.findIndex((r) => !r.heading && r.value === sel.value)));
    place();
  };

  const key = (e: KeyboardEvent) => {
    const ok = choosable(), at = ok.indexOf(hi);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); mark(ok[Math.min(ok.length - 1, at + 1)] ?? hi); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); mark(ok[Math.max(0, at - 1)] ?? hi); }
    else if (e.key === 'Home') { e.preventDefault(); mark(ok[0] ?? 0); }
    else if (e.key === 'End') { e.preventDefault(); mark(ok[ok.length - 1] ?? 0); }
    else if (e.key === 'Enter' || (e.key === ' ' && !search)) { e.preventDefault(); choose(shown[hi]); }
    else if (e.key === 'Tab') close();
    else if (!search && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      const k = e.key.toLowerCase();
      const next = ok.find((i) => i > hi && shown[i]!.label.toLowerCase().startsWith(k));
      const any = next ?? ok.find((i) => shown[i]!.label.toLowerCase().startsWith(k));
      if (any !== undefined) mark(any);
    }
  };

  const open = () => {
    if (menu || btn.disabled) return;
    list = rows(sel);
    query = '';
    search = list.filter((r) => !r.heading).length > SEARCH_FROM ? el('input', { class: 'input ts-search', type: 'text', placeholder: 'Search…', 'aria-label': 'Search the list', autocomplete: 'off', spellcheck: 'false' }) : null;
    // inside the floating picker the list must sit above the picker's own panel
    menu = el('div', { class: `bt-menu themed-select-menu tk-pop${sel.closest('turbo-themes-picker') ? ' ts-in-picker' : ''}`, role: 'listbox', 'aria-label': sel.getAttribute('aria-label') ?? undefined }, search ? el('div', { class: 'ts-searchbox' }, search) : null, el('div', { class: 'ts-list' }));
    menu.addEventListener('keydown', key);
    search?.addEventListener('input', () => { query = search!.value; draw(); });
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
  btn.addEventListener('keydown', (e) => { if (!menu && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); open(); } });
  // a field's focus() should land on the visible button
  sel.focus = () => btn.focus();
}

/** Upgrade every `select.input` under `root` and keep upgrading the ones that appear later. Safe to call again. */
export function enhanceSelects(root: ParentNode = document): void {
  const all = () => root.querySelectorAll<HTMLSelectElement>('select.input:not([data-themed])').forEach(enhanceSelect);
  all();
  const r = root as unknown as { __selectWatch?: boolean };
  if (r.__selectWatch) return;
  r.__selectWatch = true;
  new MutationObserver(all).observe(root === document ? document.documentElement : (root as Element), { childList: true, subtree: true });
}
