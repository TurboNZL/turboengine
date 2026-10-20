import { getEngine } from './index.ts';
import type { Picker } from './picker.ts';
import type { Appearance } from './types.ts';
import { enhanceSelects } from './select.ts';

/**
 * <turbo-themes-picker>: a ready-made settings control. One tag, no framework, wears the look it is choosing (it uses the hook classes).
 *
 *   <turbo-themes-picker></turbo-themes-picker>                 all the sections, as drop-downs
 *   <turbo-themes-picker variant="tiles"></turbo-themes-picker> palettes and styles as tiles that preview on hover
 *   <turbo-themes-picker floating></turbo-themes-picker>        a small button in the corner that opens it
 *   sections="theme,ui"                                         which sections to show: theme, ui, wallpaper, updates
 *
 * It is only one way to build a picker: everything it does is in createPicker() (picker.ts), so an app can draw its own.
 * Events: `tt-change` (detail: the new Appearance) after the user changes something. Property: `.picker` is the controller.
 */
const SECTIONS = ['theme', 'ui', 'wallpaper', 'updates'] as const;
type Section = (typeof SECTIONS)[number];

const STYLE_ID = 'turbothemes-picker-css';
const CSS = `
turbo-themes-picker { display: block; color: hsl(var(--fg)); font-size: 0.875rem; line-height: 1.35; }
turbo-themes-picker .tt-panel { display: grid; gap: 1rem; padding: 1rem; box-sizing: border-box; max-width: 100%; }
turbo-themes-picker .tt-sec { display: grid; gap: 0.4rem; min-width: 0; justify-items: start; }
turbo-themes-picker .tt-sec > select, turbo-themes-picker .tt-sec > .themed-select, turbo-themes-picker .tt-sec > .tt-tiles, turbo-themes-picker .tt-sec > .tt-group, turbo-themes-picker .tt-sec > label, turbo-themes-picker .tt-sec > .tt-hint, turbo-themes-picker .tt-sec > .tt-row { justify-self: stretch; }
turbo-themes-picker .tt-sec > h3 { margin: 0; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: hsl(var(--muted)); }
turbo-themes-picker .tt-row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
turbo-themes-picker .tt-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr)); gap: 0.35rem; }
turbo-themes-picker .tt-group { display: grid; gap: 0.3rem; }
turbo-themes-picker .tt-group > h4 { margin: 0.25rem 0 0; font-size: 0.7rem; font-weight: 600; color: hsl(var(--muted)); }
turbo-themes-picker .tt-tile { display: flex; align-items: center; gap: 0.45rem; min-width: 0; padding: 0.3rem 0.5rem; text-align: left; cursor: pointer; font: inherit; color: inherit;
  background: hsl(var(--raised) / 0.5); border: 1px solid hsl(var(--line)); border-radius: var(--radius, 8px); }
turbo-themes-picker .tt-tile:hover, turbo-themes-picker .tt-tile:focus-visible { border-color: hsl(var(--accent)); outline: none; }
turbo-themes-picker .tt-tile[aria-checked="true"] { border-color: hsl(var(--accent)); box-shadow: 0 0 0 1px hsl(var(--accent)); }
turbo-themes-picker .tt-tile > span.tt-name { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
turbo-themes-picker .tt-sw { display: flex; flex: none; width: 2.2rem; height: 1.2rem; overflow: hidden; border-radius: 3px; border: 1px solid hsl(var(--line) / 0.6); }
turbo-themes-picker .tt-sw > i { flex: 1; }
turbo-themes-picker .tt-hint { margin: 0; color: hsl(var(--muted)); font-size: 0.8rem; }
turbo-themes-picker label { display: grid; gap: 0.2rem; }
turbo-themes-picker label.tt-inline { display: flex; align-items: center; gap: 0.5rem; }
turbo-themes-picker select.input, turbo-themes-picker .themed-select { max-width: 100%; }
turbo-themes-picker input[type="range"] { width: 100%; }
turbo-themes-picker .tt-float { position: fixed; right: 1rem; bottom: 1rem; z-index: 2147483000; display: grid; justify-items: end; gap: 0.5rem; }
turbo-themes-picker .tt-float .tt-pop { width: min(26rem, calc(100vw - 2rem)); max-height: min(34rem, calc(100vh - 6rem)); overflow: auto; }
turbo-themes-picker .tt-float .tt-pop[hidden] { display: none; }
`;

/** An <option>, built with createElement (the Option constructor is not available in every DOM). */
const opt = (label: string, value: string, selected: boolean) => { const o = document.createElement('option'); o.textContent = label; o.value = value; o.selected = selected; return o; };

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> & { class?: string } = {}, ...kids: (Node | string | null | false)[]): HTMLElementTagNameMap[K] => {
  const { class: cls, ...rest } = props as { class?: string };
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  Object.assign(n, rest);
  for (const k of kids) if (k) n.append(k);
  return n;
};

// no DOM on a server or in a plain Node test: importing the engine there must still work
const Base = (typeof HTMLElement !== 'undefined' ? HTMLElement : class {}) as typeof HTMLElement;

export class TurboThemesPicker extends Base {
  picker!: Picker;
  private off: (() => void)[] = [];
  private busy = false;
  private open = false;
  private message = '';
  private seen: { app: unknown; rev: number } | null = null;

  connectedCallback() {
    if (!document.getElementById(STYLE_ID)) { const s = el('style'); s.id = STYLE_ID; s.textContent = CSS; document.head.appendChild(s); }
    this.picker = getEngine().picker();
    // a preview (hover) changes the page but not what the picker shows: redrawing then would replace the tile under the pointer and start it again
    this.off.push(this.picker.subscribe(() => {
      const st = this.picker.getState();
      if (this.busy || (this.seen && this.seen.app === st.appearance && this.seen.rev === st.revision)) return;
      this.render();
    }));
    // a themed drop-down's list lives on <body> (select.ts), outside this element, but it belongs to the picker: choosing a row must not count as clicking away
    const close = (e: Event) => { if (this.open && this.hasAttribute('floating') && !this.contains(e.target as Node) && !(e.target as Element).closest?.('.themed-select-menu.ts-in-picker')) { this.open = false; this.render(); } };
    document.addEventListener('pointerdown', close, true);
    this.off.push(() => document.removeEventListener('pointerdown', close, true));
    this.render();
  }
  disconnectedCallback() { this.off.forEach((f) => f()); this.off = []; }
  static get observedAttributes() { return ['sections', 'variant', 'floating']; }
  attributeChangedCallback() { if (this.isConnected && this.picker) this.render(); }

  private sections(): Section[] {
    const a = this.getAttribute('sections');
    if (!a) return [...SECTIONS];
    return a.split(',').map((x) => x.trim()).filter((x): x is Section => (SECTIONS as readonly string[]).includes(x));
  }

  private changed(patch: Partial<Appearance>) {
    this.picker.set(patch);
    this.dispatchEvent(new CustomEvent('tt-change', { detail: this.picker.getState().appearance, bubbles: true }));
  }

  private render() {
    const st = this.picker.getState();
    this.seen = { app: st.appearance, rev: st.revision };
    const body = this.panel();
    this.replaceChildren();
    if (!this.hasAttribute('floating')) { this.append(body); enhanceSelects(this); return; }
    const pop = el('div', { class: 'card tt-pop' }, body);
    pop.hidden = !this.open;
    const btn = el('button', { class: 'btn', type: 'button', textContent: this.getAttribute('label') ?? 'Themes' });
    btn.setAttribute('aria-expanded', String(this.open));
    btn.addEventListener('click', () => { this.open = !this.open; this.render(); });
    this.append(el('div', { class: 'tt-float' }, pop, btn));
    enhanceSelects(this); // the drop-downs are drawn by the look, never by the operating system (select.ts)
  }

  private panel(): HTMLElement {
    const root = el('div', { class: 'tt-panel' });
    for (const s of this.sections()) {
      const sec = ({ theme: () => this.themeSection(), ui: () => this.styleSection(), wallpaper: () => this.wallpaperSection(), updates: () => this.updatesSection() })[s]();
      if (sec) root.append(sec);
    }
    return root;
  }

  private section(title: string, ...kids: (Node | null)[]) {
    const s = el('div', { class: 'tt-sec' }, el('h3', { textContent: title }));
    for (const k of kids) if (k) s.append(k);
    return s;
  }

  private select(label: string, items: { id: string; label: string }[], value: string, onChange: (v: string) => void) {
    const sel = el('select', { class: 'input' });
    for (const i of items) sel.append(opt(i.label, i.id, i.id === value));
    sel.value = value;
    sel.setAttribute('aria-label', label);
    sel.addEventListener('change', () => onChange(sel.value));
    return sel;
  }

  private themeSection() {
    const p = this.picker, cur = p.getState().appearance;
    const groups = p.themes();
    if (this.getAttribute('variant') !== 'tiles') {
      const sel = el('select', { class: 'input' });
      for (const g of groups) { const og = el('optgroup'); og.label = g.label; for (const t of g.items) og.append(opt(t.label, t.id, t.id === cur.theme)); sel.append(og); }
      sel.value = cur.theme;
      sel.setAttribute('aria-label', 'Colours');
      sel.addEventListener('change', () => this.changed({ theme: sel.value }));
      return this.section('Colours', sel, this.matchingButton());
    }
    const wrap = el('div', { class: 'tt-sec' });
    wrap.addEventListener('mouseleave', () => p.preview(null));
    for (const g of groups) {
      const grid = el('div', { class: 'tt-tiles', role: 'radiogroup' });
      grid.setAttribute('aria-label', g.label);
      for (const t of g.items) {
        const tile = el('button', { class: 'tt-tile', type: 'button', title: t.note ? `${t.label}: ${t.note}` : t.label });
        tile.setAttribute('role', 'radio'); tile.setAttribute('aria-checked', String(t.id === cur.theme));
        if (t.colors) { const sw = el('span', { class: 'tt-sw' }); for (const c of [t.colors.bg, t.colors.surface, t.colors.accent, t.colors.text]) { const i = el('i'); i.style.background = c; sw.append(i); } tile.append(sw); }
        tile.append(el('span', { class: 'tt-name', textContent: t.label }));
        tile.addEventListener('click', () => this.changed({ theme: t.id }));
        tile.addEventListener('mouseenter', () => p.preview({ theme: t.id }));
        tile.addEventListener('focus', () => p.preview({ theme: t.id }));
        tile.addEventListener('blur', () => p.preview(null));
        grid.append(tile);
      }
      wrap.append(el('div', { class: 'tt-group' }, el('h4', { textContent: g.label }), grid));
    }
    return this.section('Colours', wrap, this.matchingButton());
  }

  private matchingButton() {
    const m = this.picker.matchingTheme();
    if (!m || m === this.picker.getState().appearance.theme) return null;
    const label = this.picker.themes().flatMap((g) => g.items).find((t) => t.id === m)?.label ?? m;
    const b = el('button', { class: 'btn', type: 'button', textContent: `Use matching colours (${label})` });
    b.addEventListener('click', () => { this.picker.useMatchingTheme(); this.dispatchEvent(new CustomEvent('tt-change', { detail: this.picker.getState().appearance, bubbles: true })); });
    b.addEventListener('mouseenter', () => this.picker.preview({ theme: m }));
    b.addEventListener('mouseleave', () => this.picker.preview(null));
    return b;
  }

  private styleSection() {
    const p = this.picker, cur = p.getState().appearance, styles = p.styles();
    const hint = el('p', { class: 'tt-hint' });
    const describe = (id: string) => { const s = styles.find((x) => x.id === id); hint.textContent = s ? `${s.description}${s.isAuto ? ` On this device that is ${p.device().name}.` : ''}` : ''; };
    describe(cur.ui);
    let control: Node;
    if (this.getAttribute('variant') === 'tiles') {
      const grid = el('div', { class: 'tt-tiles', role: 'radiogroup' });
      grid.setAttribute('aria-label', 'UI style');
      grid.addEventListener('mouseleave', () => { p.preview(null); describe(cur.ui); });
      for (const s of styles) {
        const tile = el('button', { class: 'tt-tile', type: 'button', title: s.description }, el('span', { class: 'tt-name', textContent: s.label }));
        tile.setAttribute('role', 'radio'); tile.setAttribute('aria-checked', String(s.id === cur.ui));
        tile.addEventListener('click', () => this.changed({ ui: s.id }));
        const show = () => { p.preview({ ui: s.id }); describe(s.id); };
        tile.addEventListener('mouseenter', show); tile.addEventListener('focus', show);
        tile.addEventListener('blur', () => { p.preview(null); describe(cur.ui); });
        grid.append(tile);
      }
      control = grid;
    } else {
      const sel = this.select('UI style', styles, cur.ui, (v) => this.changed({ ui: v }));
      sel.addEventListener('change', () => describe(sel.value));
      control = sel;
    }
    const glass = cur.ui === 'liquid' ? this.glassRow(cur.glass ?? 'regular') : null;
    return this.section('UI style', control, hint, glass);
  }

  private glassRow(v: 'regular' | 'clear') {
    const row = el('div', { class: 'tt-row' }, el('span', { textContent: 'Glass' }));
    for (const g of ['regular', 'clear'] as const) {
      const b = el('button', { class: 'btn', type: 'button', textContent: g });
      b.setAttribute('aria-pressed', String(v === g));
      b.addEventListener('click', () => this.changed({ glass: g }));
      row.append(b);
    }
    return row;
  }

  private wallpaperSection() {
    const p = this.picker, a = p.getState().appearance;
    const on = el('input', { type: 'checkbox', checked: !!a.wallpaper });
    on.addEventListener('change', () => this.changed({ wallpaper: on.checked }));
    const check = el('label', { class: 'tt-inline' }, on, 'Show a wallpaper');
    const dark = el('input', { type: 'range', min: '0', max: '90', value: String(Math.round((a.wallpaperDarkness ?? 0.3) * 100)) });
    dark.setAttribute('aria-label', 'Wallpaper darkness');
    dark.addEventListener('input', () => { this.busy = true; this.changed({ wallpaperDarkness: Number(dark.value) / 100 }); this.busy = false; });
    const file = el('input', { type: 'file', accept: 'image/*', hidden: true });
    file.addEventListener('change', async () => {
      const f = file.files?.[0]; if (!f) return;
      try { await p.wallpaper.setCustom(f); this.message = ''; } catch (e) { this.message = e instanceof Error ? e.message : 'Could not load that image'; this.render(); }
    });
    const load = el('label', { class: 'btn' }, p.wallpaper.hasCustom() ? 'Choose another picture' : 'Use my own picture', file);
    const row = el('div', { class: 'tt-row' }, load);
    if (p.wallpaper.hasCustom()) {
      const own = el('button', { class: 'btn', type: 'button', textContent: a.wallpaperCustom ? 'Use the theme wallpaper' : 'Use my picture' });
      own.addEventListener('click', () => this.changed({ wallpaperCustom: !a.wallpaperCustom }));
      const rm = el('button', { class: 'btn', type: 'button', textContent: 'Remove my picture' });
      rm.addEventListener('click', () => p.wallpaper.clearCustom());
      row.append(own, rm);
    }
    return this.section('Wallpaper', check, a.wallpaper ? el('label', {}, 'Darkness', dark) : null, a.wallpaper ? row : null, this.message ? el('p', { class: 'tt-hint', textContent: this.message }) : null);
  }

  private updatesSection() {
    const p = this.picker, v = p.version();
    const status = el('span', { class: 'tt-hint', textContent: `${v.origin === 'downloaded' ? 'Downloaded' : 'Built-in'} themes ${v.hash}` });
    const btn = el('button', { class: 'btn', type: 'button', textContent: 'Check for newer themes' });
    btn.addEventListener('click', async () => { btn.disabled = true; status.textContent = 'Checking…'; const r = await p.checkForUpdates(); status.textContent = r.message; btn.disabled = false; });
    return this.section('Themes', el('div', { class: 'tt-row' }, btn, status));
  }
}

/** Registers <turbo-themes-picker>. Safe to call more than once. start({ picker: true }) does it. */
export function definePicker() {
  if (typeof customElements === 'undefined' || customElements.get('turbo-themes-picker')) return;
  customElements.define('turbo-themes-picker', TurboThemesPicker);
}
