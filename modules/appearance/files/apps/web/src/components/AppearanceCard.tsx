import { useState } from 'react';
import { create } from 'zustand';
import { Section } from './Section.tsx';
import { Check, Eye, ImageIcon, ImageOff, Search, Upload, Wand2 } from 'lucide-react';
import { useStore } from '../lib/store.ts';
import { cn } from '../lib/cn.ts';
import { clearCustomWallpaper, deviceLook, effectiveUi, getCustomImage, isUiStyle, listStyles, listThemes, resolveTheme, saveCustomWallpaper, themeStyle, themeWallpaper } from 'turbothemes';
import { useCatalog } from '../lib/useCatalog.ts';
import { LAYOUTS } from '../lib/layout.ts';
import { ThemeUpdates } from './ThemeUpdates.tsx';

type ThemeId = string;
type UiStyleId = string;
type ThemeChoice = ReturnType<typeof listThemes>[number];

const BARS = ['#6d28d9', '#0e7490', '#b45309'];

/**
 * A small mock of the app drawn with the real classes, coloured by the given colour theme and shaped by the
 * given UI style (not the page's), so every combination can be seen before choosing it.
 */
export function PreviewApp({ theme, ui }: { theme: ThemeId; ui: UiStyleId }) {
  const def = resolveTheme(theme);
  return (
    <div data-theme={def.id} data-ui={ui} data-mode={def.dark ? 'dark' : 'light'} style={themeStyle(theme)}
      className="pointer-events-none select-none overflow-hidden rounded-theme border border-line bg-bg text-fg" role="img" aria-label="Preview of the selected colour theme and UI style">
      <div className="bt-top flex items-center gap-2 p-2.5">
        <span className="text-sm font-bold">TurboMusic</span>
        <div className="relative flex-1"><Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" /><div className="input !py-1 pl-8 text-xs text-muted">Search tracks, albums…</div></div>
        <span className="btn btn-accent !px-2.5 !py-1 text-xs">Add</span>
      </div>
      <div className="flex">
        <div className="bt-side hidden w-24 shrink-0 flex-col gap-0.5 p-1.5 text-[11px] sm:flex">
          {['Albums', 'Tracks', 'Rank'].map((n, i) => <span key={n} className="bt-nav px-2 py-1 font-medium" aria-current={i === 1 ? 'page' : undefined}>{n}</span>)}
        </div>
        <div className="min-w-0 flex-1 space-y-2.5 p-3">
          <div className="grid grid-cols-3 gap-2">
            {BARS.map((c, i) => (
              <div key={c} className="min-w-0">
                <div className="aspect-square" style={{ background: `linear-gradient(135deg, ${c}, ${BARS[(i + 1) % 3]}88)`, borderRadius: 'var(--radius)' }} />
                <div className="mt-1 truncate text-[11px] font-medium">{['Night Drive', 'Blue Hour', 'Slow Burn'][i]}</div>
              </div>
            ))}
          </div>
          <div className="card overflow-hidden">
            {[['Midnight City', 'M83', '9.4'], ['Nightcall', 'Kavinsky', '8.7'], ['Resonance', 'HOME', '8.1']].map(([t, a, r], i) => (
              <div key={t} className={cn('bt-row flex items-center gap-2 px-2.5 py-1.5', i === 0 && 'bt-row-current')}>
                <div className="min-w-0 flex-1"><div className="truncate text-xs font-medium">{t}</div><div className="truncate text-[10px] text-muted">{a}</div></div>
                <span className="chip">Synth</span><span className="text-xs font-bold tabular-nums text-top">{r}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5"><div className="input flex-1 !py-1 text-xs">Title</div><span className="btn !px-2.5 !py-1 text-xs">Cancel</span><span className="btn btn-accent !px-2.5 !py-1 text-xs">Save</span><span className="btn btn-ghost !px-2.5 !py-1 text-xs">More</span></div>
          <input type="range" className="bt-range h-1 w-full" style={{ '--p': '62%' } as React.CSSProperties} readOnly value={62} min={0} max={100} tabIndex={-1} aria-hidden />
          <div className="bt-window pointer-events-none">
            <div className="bt-titlebar flex items-center justify-between px-3 py-1.5"><h2 className="text-xs font-semibold">Edit track</h2><span className="bt-close text-xs leading-none">×</span></div>
            <div className="bt-body flex items-center justify-between gap-2 p-2.5 text-[11px] text-muted"><span>Dialogs and menus follow the style too.</span><span className="bt-menu w-20 py-0.5 text-[11px]"><span className="block px-2 py-0.5">Play</span><span role="menuitem" className="block px-2 py-0.5" style={{ background: 'var(--menu-hi-bg)', color: 'var(--menu-hi-fg)' }}>Edit…</span></span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

type Tone = 'all' | 'dark' | 'light';

/** What the preview shows: the option under the pointer, else the current choice. Shared by the two sections and the preview column. */
const usePreview = create<{ theme: ThemeId | null; ui: UiStyleId | null; setTheme(t: ThemeId | null): void; setUi(u: UiStyleId | null): void }>((set) => ({
  theme: null, ui: null, setTheme: (theme) => set({ theme }), setUi: (ui) => set({ ui }),
}));

const label = (id: ThemeId) => listThemes().find((t) => t.id === id)?.label;
const currentUi = (s: string): UiStyleId => (isUiStyle(s) ? s : 'default');

/** A compact swatch: four stripes of the theme's own colours and its name. */
function ThemeTile({ t }: { t: ThemeChoice }) {
  const { settings, updateSettings } = useStore();
  const setHover = usePreview((s) => s.setTheme);
  const selected = settings.theme === t.id;
  const d = resolveTheme(t.id);
  return (
    <button type="button" role="radio" aria-checked={selected} title={t.note ? `${t.label}: ${t.note}` : t.label}
      onClick={() => updateSettings({ theme: t.id })}
      onMouseEnter={() => setHover(t.id)} onFocus={() => setHover(t.id)} onBlur={() => setHover(null)}
      className={cn('flex min-w-0 items-center gap-2 rounded-theme border bg-raised/40 px-1.5 py-1 text-left transition-colors hover:border-accent', selected ? 'border-accent ring-1 ring-accent' : 'border-line')}>
      <span data-theme={d.id} style={themeStyle(t.id)} className="flex h-5 w-9 shrink-0 overflow-hidden rounded border border-line/60 bg-bg" aria-hidden>
        <span className="h-full flex-1 bg-bg" /><span className="h-full flex-1 bg-surface" /><span className="h-full flex-1 bg-accent" /><span className="h-full flex-1 bg-top" />
      </span>
      <span className="min-w-0 flex-1 truncate text-xs font-medium">{t.label}</span>
      {selected && <Check size={12} className="shrink-0 text-accent" />}
    </button>
  );
}

const TILE_GRID = 'grid grid-cols-[repeat(auto-fill,minmax(8.25rem,1fr))] gap-1.5';

/** Colour themes: three groups in one panel that grows with its content (no inner scrolling), dark/light filter on top. */
export function ColourThemeSection() {
  const [tone, setTone] = useState<Tone>('all');
  const setHover = usePreview((s) => s.setTheme);
  useCatalog();
  const THEMES = listThemes();
  const tonal = (t: ThemeChoice) => tone === 'all' || t.dark === null || (tone === 'dark') === t.dark;
  const groups = [
    { title: 'TurboMusic', note: 'The app\'s own looks; System follows your device.', list: THEMES.filter((t) => (t.id === 'system' || t.group === 'own') && tonal(t)) },
    { title: 'Colour themes', note: null, list: THEMES.filter((t) => t.id !== 'system' && (t.group === 'colour' || t.group === undefined) && tonal(t)) },
    { title: 'Games, apps & devices', note: 'Pair with the matching UI style of the same name.', list: THEMES.filter((t) => t.group === 'inspired' && tonal(t)) },
    { title: 'Platform palettes', note: 'Copied from a desktop or OS; they pair with the matching UI style.', list: THEMES.filter((t) => t.group === 'platform' && tonal(t)) },
  ];
  return (
    <Section title="Colour theme">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto text-sm text-muted">Colours only: the accent comes from the theme. Any theme works with any UI style.</p>
        <div role="group" aria-label="Show" className="flex gap-1 text-xs">
          {(['all', 'dark', 'light'] as Tone[]).map((t) => <button key={t} aria-pressed={tone === t} onClick={() => setTone(t)} className={cn('rounded-full border px-2.5 py-0.5 capitalize', tone === t ? 'border-accent text-accent' : 'border-line text-muted hover:text-fg')}>{t}</button>)}
        </div>
      </div>
      {groups.filter((g) => g.list.length).map((g) => (
        <div key={g.title} className="space-y-1.5">
          <div className="flex items-baseline gap-2"><h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{g.title}</h3>{g.note && <span className="truncate text-[11px] text-muted">{g.note}</span>}</div>
          <div role="radiogroup" aria-label={g.title} className={TILE_GRID} onMouseLeave={() => setHover(null)}>{g.list.map((t) => <ThemeTile key={t.id} t={t} />)}</div>
        </div>))}
    </Section>
  );
}

/** UI styles: shape, type and motion. Every style is visible at once; hovering one previews it. */
export function UiStyleSection() {
  useCatalog();
  const UI_STYLES = listStyles();
  const { settings, updateSettings } = useStore();
  const ui = currentUi(settings.ui);
  const def = resolveTheme(settings.theme);
  const hoverUi = usePreview((s) => s.ui);
  const setHoverUi = usePreview((s) => s.setUi);
  const setHoverTheme = usePreview((s) => s.setTheme);
  // the platform's own palette for a UI style, in the light or dark variant matching the current theme
  const m = UI_STYLES.find((s) => s.id === ui)?.matching;
  const matching = m ? (def.dark ? m.dark ?? m.light : m.light) : null;
  return (
    <Section title="UI style">
      <p className="text-sm text-muted">Shape, type, depth and motion: how buttons, menus, dialogs and the bars look and move. Colours stay as chosen above.</p>
      {matching && matching !== settings.theme && (
        <button type="button" className="btn text-xs" onClick={() => updateSettings({ theme: matching })} onMouseEnter={() => setHoverTheme(matching)} onMouseLeave={() => setHoverTheme(null)}>
          <Wand2 size={14} />Use matching colours ({label(matching)})</button>)}
      <div role="radiogroup" aria-label="UI style" className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-1.5" onMouseLeave={() => setHoverUi(null)}>
        {UI_STYLES.map((s) => {
          const selected = ui === s.id;
          return (
            <button key={s.id} type="button" role="radio" aria-checked={selected} title={s.description} onClick={() => updateSettings({ ui: s.id })}
              onMouseEnter={() => setHoverUi(s.id)} onFocus={() => setHoverUi(s.id)} onBlur={() => setHoverUi(null)}
              className={cn('rounded-theme border bg-raised/40 px-2.5 py-1.5 text-left transition-colors hover:border-accent', selected ? 'border-accent ring-1 ring-accent' : 'border-line')}>
              <span className="flex items-center justify-between gap-2"><span className="min-w-0 truncate text-xs font-medium">{s.label}</span>{selected && <Check size={12} className="shrink-0 text-accent" />}</span>
            </button>
          );
        })}
      </div>
      <p className="min-h-[2.5rem] rounded-theme bg-raised/50 px-3 py-2 text-xs leading-snug text-muted" aria-live="polite">
        <span className="font-medium text-fg">{UI_STYLES.find((x) => x.id === (hoverUi ?? ui))?.label}: </span>{UI_STYLES.find((x) => x.id === (hoverUi ?? ui))?.description}{(hoverUi ?? ui) === 'auto' ? ` On this device that is ${deviceLook().name}.` : ''}</p>
      {ui === 'liquid' && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="font-medium">Glass</span>
          <div role="radiogroup" aria-label="Glass variant" className="flex rounded-theme bg-raised p-0.5">
            {(['regular', 'clear'] as const).map((g) => (
              <button key={g} role="radio" aria-checked={settings.glass === g} onClick={() => updateSettings({ glass: g })}
                className={cn('rounded-[calc(var(--radius)-3px)] px-3 py-1 text-xs font-medium capitalize', settings.glass === g ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg')}>{g}</button>))}
          </div>
          <span className="text-xs text-muted">{settings.glass === 'clear' ? 'Clear: more see-through, with a dimming layer for legibility. Best over bold artwork.' : 'Regular: adapts to what is behind it. The default.'}</span>
        </div>)}
    </Section>
  );
}

/** Layouts: where the pages are listed. Independent of the colours and the UI style, so any look can have any of them. */
export function LayoutSection() {
  const { settings, updateSettings } = useStore();
  const cur = LAYOUTS.find((l) => l.id === settings.layout) ?? LAYOUTS[0];
  return (
    <Section title="Layout">
      <p className="text-sm text-muted">Where the pages are listed. This works with every colour theme and UI style.</p>
      <div role="radiogroup" aria-label="Layout" className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-1.5">
        {LAYOUTS.map((l) => {
          const selected = cur.id === l.id;
          return (
            <button key={l.id} type="button" role="radio" aria-checked={selected} title={l.description} onClick={() => updateSettings({ layout: l.id })}
              className={cn('rounded-theme border bg-raised/40 px-2.5 py-1.5 text-left transition-colors hover:border-accent', selected ? 'border-accent ring-1 ring-accent' : 'border-line')}>
              <span className="flex items-center justify-between gap-2"><span className="min-w-0 truncate text-xs font-medium">{l.label}</span>{selected && <Check size={12} className="shrink-0 text-accent" />}</span>
            </button>);
        })}
      </div>
      <p className="rounded-theme bg-raised/50 px-3 py-2 text-xs leading-snug text-muted"><span className="font-medium text-fg">{cur.label}: </span>{cur.description}</p>
    </Section>
  );
}

/** The framed preview that stays in view beside the two sections. */
export function AppearancePreview() {
  useCatalog();
  const UI_STYLES = listStyles();
  const { settings } = useStore();
  const hoverTheme = usePreview((s) => s.theme);
  const hoverUi = usePreview((s) => s.ui);
  const theme = hoverTheme ?? settings.theme;
  const ui = hoverUi ?? currentUi(settings.ui);
  return (
    <div className="lg:sticky lg:top-20">
      <div className="rounded-theme border-2 border-dashed border-accent bg-accent/10 p-2">
        <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-2.5 py-0.5 font-bold uppercase tracking-wider text-accent-fg"><Eye size={12} />Preview</span>
          <span className="truncate font-medium">{label(theme)} + {UI_STYLES.find((s) => s.id === ui)?.label}</span>
        </div>
        <PreviewApp theme={theme} ui={effectiveUi(ui) as UiStyleId} />
        <p className="mt-1.5 text-center text-[11px] text-muted">Not your real page. Hover an option to try it, click to apply.</p>
      </div>
      <p className="mt-2 text-xs text-muted">Now: <span className="font-medium text-fg">{label(settings.theme)}</span> + <span className="font-medium text-fg">{UI_STYLES.find((x) => x.id === currentUi(settings.ui))?.label}</span></p>
    </div>
  );
}

/** Colour theme and UI style as two separate sections, with one preview beside them. */
export function AppearanceLayout() {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="min-w-0 space-y-5"><LayoutSection /><ColourThemeSection /><UiStyleSection /><ThemeUpdates /></div>
      <AppearancePreview />
    </div>
  );
}

export function WallpaperCard() {
  const { settings, updateSettings } = useStore();
  const [hasCustom, setHasCustom] = useState(() => getCustomImage() !== null);
  const [error, setError] = useState<string | null>(null);
  const custom = settings.wallpaperCustom && hasCustom ? getCustomImage() : null;

  async function upload(f: File | undefined, input: HTMLInputElement) {
    if (!f) return;
    try { await saveCustomWallpaper(f); setHasCustom(true); setError(null); updateSettings({ wallpaperCustom: true, wallpaper: true }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not load that image'); }
    finally { input.value = ''; }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Off by default. Each colour theme has its own wallpaper, or load your own picture. Panels turn slightly see-through so it shows around them. Saved on this device only.</p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.wallpaper} onChange={(e) => updateSettings({ wallpaper: e.target.checked })} />Show wallpaper</label>
      <div className={cn('space-y-4', !settings.wallpaper && 'pointer-events-none opacity-50')} aria-disabled={!settings.wallpaper}>
        <div className="relative h-32 overflow-hidden rounded-theme border border-line" style={{ background: custom ? `center / cover no-repeat url("${custom}")` : themeWallpaper(settings.theme) }}>
          <div className="absolute inset-0 bg-black" style={{ opacity: settings.wallpaperDarkness }} />
          <span className="absolute bottom-2 left-2 rounded bg-black/40 px-1.5 py-0.5 text-xs text-white/90">{custom ? 'Your picture' : 'Theme wallpaper'}</span>
        </div>
        <label className="block text-sm"><span className="mb-1 flex justify-between"><span className="font-medium">Darkness</span><span className="tabular-nums text-muted">{Math.round(settings.wallpaperDarkness * 100)}%</span></span>
          <input type="range" min={0} max={90} step={1} className="bt-range bt-hit w-full" style={{ '--p': `${(settings.wallpaperDarkness / 0.9) * 100}%` } as React.CSSProperties} value={Math.round(settings.wallpaperDarkness * 100)} onChange={(e) => updateSettings({ wallpaperDarkness: Number(e.target.value) / 100 })} aria-label="Wallpaper darkness" />
          <span className="text-xs text-muted">Raises the opacity of a black layer over the wallpaper.</span></label>
        <div className="flex flex-wrap gap-2">
          <label className="btn cursor-pointer"><Upload size={15} />{hasCustom ? 'Choose another picture' : 'Load a picture'}<input type="file" accept="image/*" hidden onChange={(e) => void upload(e.target.files?.[0], e.target)} /></label>
          {hasCustom && <>
            <button className="btn" disabled={settings.wallpaperCustom} onClick={() => updateSettings({ wallpaperCustom: true })}><ImageIcon size={15} />Use my picture</button>
            <button className="btn" disabled={!settings.wallpaperCustom} onClick={() => updateSettings({ wallpaperCustom: false })}><ImageIcon size={15} />Use the theme wallpaper</button>
            <button className="btn" onClick={() => { clearCustomWallpaper(); setHasCustom(false); updateSettings({ wallpaperCustom: false }); }}><ImageOff size={15} />Remove my picture</button></>}
        </div>
        {error && <div className="text-sm text-bad">{error}</div>}
      </div>
    </div>
  );
}
