import { WindowFrame } from './WindowFrame.tsx';
import { NavLink, Outlet, useLocation, useMatch, useNavigate, useNavigationType } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BarChart3, Compass, Stethoscope, Disc, Disc3, Download, FileAudio, Home, Layers, ListMusic, MoreHorizontal, Network, ListOrdered, Music2, Plus, Search, Settings, Swords, User, Users } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { effectiveUi } from 'turbothemes';
import { usePlayer } from '../lib/player.ts';
import { cn } from '../lib/cn.ts';
import { useStore } from '../lib/store.ts';
import { useEditor, type EditTarget } from '../lib/editor.ts';
import { EditorHost } from './EditorHost.tsx';
import { PlayerBar } from './PlayerBar.tsx';
import { VolumeButton } from './VolumeButton.tsx';
import { NowPlaying } from './NowPlaying.tsx';
import { DevicesMenu } from './Devices.tsx';

const NAV = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/albums', label: 'Albums', icon: Disc3 },
  { to: '/singles', label: 'Singles', icon: Disc },
  { to: '/eras', label: 'Eras', icon: Layers },
  { to: '/artists', label: 'Artists', icon: Users },
  { to: '/tracks', label: 'Tracks', icon: Music2 },
  { to: '/vote', label: 'Rank', icon: Swords },
  { to: '/playlists', label: 'Playlists', icon: ListMusic },
  { to: '/queue', label: 'Queue', icon: ListOrdered },
  { to: '/notes', label: 'Notes', icon: Network },
  { to: '/discover', label: 'Discover', icon: Compass },
  { to: '/stats', label: 'Stats', icon: BarChart3 },
  { to: '/health', label: 'Health', icon: Stethoscope },
  { to: '/settings', label: 'Settings', icon: Settings },
];

/**
 * Keeps the CSS variables --ind-x/-y/-w/-h at the active link's box, for the `.bt-ind` element that some UI styles slide
 * across (Liquid Glass: the lit pill; Windows 11: the accent bar). The first placement does not animate.
 */
function useIndicator<T extends HTMLElement>(key: string) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    const place = () => {
      const a = box.querySelector<HTMLElement>('[aria-current="page"]');
      box.style.setProperty('--ind-o', a ? '1' : '0');
      if (!a) return;
      box.style.setProperty('--ind-x', `${a.offsetLeft}px`); box.style.setProperty('--ind-y', `${a.offsetTop}px`);
      box.style.setProperty('--ind-w', `${a.offsetWidth}px`); box.style.setProperty('--ind-h', `${a.offsetHeight}px`);
    };
    place();
    const raf = requestAnimationFrame(() => box.setAttribute('data-ind-ready', ''));
    const ro = new ResizeObserver(place);
    ro.observe(box);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [key]);
  return ref;
}

/** The gradients the Marshmallow style strokes its navigation icons with (a glossy candy look): light lip, bright body, deeper base. Only drawn for that style. */
const CANDY = ['#ff7aa8', '#ffa24d', '#ffd23f', '#5fd08b', '#4cc9e8', '#6f8cff', '#b67cff'];
const shade = (hex: string, to: number) => { const n = parseInt(hex.slice(1), 16), m = (c: number) => Math.round(c + (to < 0 ? c * to : (255 - c) * to)); return `rgb(${m((n >> 16) & 255)} ${m((n >> 8) & 255)} ${m(n & 255)})`; };
function CandyDefs() {
  return (
    <svg width="0" height="0" aria-hidden focusable="false" style={{ position: 'absolute' }}>
      <defs>{CANDY.map((c, i) => (
        <linearGradient key={c} id={`mm-g${i + 1}`} gradientUnits="userSpaceOnUse" x1="0" y1="1" x2="0" y2="23">
          <stop offset="0" stopColor={shade(c, 0.7)} /><stop offset="0.34" stopColor={shade(c, 0.25)} /><stop offset="0.52" stopColor={c} /><stop offset="1" stopColor={shade(c, -0.28)} />
        </linearGradient>))}
      </defs>
    </svg>
  );
}

function SyncDot() {
  const { state, error } = useStore((s) => s.sync);
  const color = { idle: 'bg-good', syncing: 'bg-warn animate-pulse', offline: 'bg-muted', error: 'bg-bad', unconfigured: 'bg-muted' }[state];
  const text = { idle: 'Synced', syncing: 'Syncing…', offline: 'Offline', error: error ?? 'Sync error', unconfigured: 'Local only' }[state];
  return <div className="flex items-center gap-2 px-3 text-xs text-muted md:px-3" title={error ?? ""}><span className={cn('h-2 w-2 rounded-full', color)} /><span className="bt-label-text">{text}</span></div>;
}

/** Layout "toolbar" (the Toolbar UI style): these pages stay in the side bar, in this order; every other page becomes a text link in the top bar. */
const LIBRARY = ['/artists', '/albums', '/singles', '/eras', '/tracks', '/playlists'];
const TOOLBAR_LABEL: Record<string, string> = { '/': 'Journal' };

const MOBILE_HIDDEN = ['/discover', '/singles', '/eras', '/playlists', '/stats', '/queue', '/notes', '/health', '/settings'];

const ADD: { label: string; icon: typeof Plus; target: EditTarget }[] = [
  { label: 'Import from YouTube', icon: Download, target: { kind: 'import', id: '' } },
  { label: 'Import from Spotify', icon: ListMusic, target: { kind: 'import-spotify', id: '' } },
  { label: 'Find YouTube Music albums', icon: Search, target: { kind: 'match-links', id: '' } },
  { label: 'Add audio files', icon: FileAudio, target: { kind: 'upload', id: '' } },
  { label: 'New album', icon: Disc3, target: { kind: 'new-album', id: '' } },
  { label: 'New track', icon: Music2, target: { kind: 'new-track', id: '' } },
  { label: 'New artist', icon: User, target: { kind: 'new-artist', id: '' } },
  { label: 'New playlist', icon: ListMusic, target: { kind: 'new-playlist', id: '' } },
];

/** One place to add anything, reachable on every page and on a phone. */
function AddMenu() {
  const [open, setOpen] = useState(false);
  const edit = useEditor((s) => s.open);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open]);
  return (
    <div className="relative">
      <button type="button" className="btn btn-accent bt-add" aria-label="Add" title="Add" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}><Plus size={16} /><span className="hidden sm:inline">Add</span></button>
      {open && <>
        <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
        <div role="menu" className="bt-menu absolute right-0 z-30 mt-2 w-64 origin-top-right overflow-hidden py-1">
          {ADD.map(({ label, icon: Icon, target }) => (
            <button key={label} role="menuitem" className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm" onClick={() => { setOpen(false); edit(target); }}><Icon size={16} />{label}</button>))}
        </div></>}
    </div>
  );
}

/** Phone-only: the pages that do not fit in the bottom bar. */
function MoreMenu({ dock }: { dock: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn('relative flex flex-1', dock && 'md:hidden')}>
      <button type="button" className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] text-muted" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}><MoreHorizontal size={20} />More</button>
      {open && <>
        <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
        <div role="menu" className="bt-menu absolute bottom-full right-0 z-30 mb-2 w-48 origin-bottom-right overflow-hidden py-1">
          {NAV.filter((n) => MOBILE_HIDDEN.includes(n.to) && !(dock && n.to === '/settings')).map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} role="menuitem" onClick={() => setOpen(false)} className="flex items-center gap-3 px-3 py-2.5 text-sm"><Icon size={16} />{label}</NavLink>))}
        </div></>}
    </div>
  );
}

export function Layout() {
  const nav = useNavigate();
  // the router keeps its position in the history entry; Back is only possible above the first one, Forward after going back (tracked as the furthest position reached)
  const histIdx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
  const furthest = useRef(0);
  const typeNow = useNavigationType();
  furthest.current = typeNow === 'POP' ? Math.max(furthest.current, histIdx) : histIdx; // a new page drops everything that was ahead
  const canBack = histIdx > 0, canForward = histIdx < furthest.current;
  const { pathname } = useLocation();
  const navType = useNavigationType();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const scrolls = useRef(new Map<string, number>());
  // <main> is the scroller, so the router's own scroll handling never sees it: a new page opened at whatever depth the last one was at.
  // New pages start at the top (a link to ?track=… scrolls to its row itself); going Back returns to where that page was.
  useLayoutEffect(() => {
    const m = mainRef.current, saved = scrolls.current;
    if (!m) return;
    const key = location.key;
    m.scrollTop = navType === 'POP' ? saved.get(key) ?? 0 : 0;
    return () => { saved.set(key, m.scrollTop); };
  }, [location.key, navType]);
  const sideRef = useIndicator<HTMLElement>(pathname);
  const tabRef = useIndicator<HTMLElement>(pathname);
  // album, artist and era pages put their side panels beside the content, so they get more width
  const matches = [useMatch('/albums/:id'), useMatch('/artists/:id'), useMatch('/eras/:id')];
  const wide = matches.some(Boolean);
  const [q, setQ] = useState('');
  const ui = useStore((s) => s.settings.ui);
  const layout = useStore((s) => s.settings.layout);
  const toolbar = layout === 'toolbar', topbar = layout === 'topbar', dock = layout === 'dock';
  const noSide = topbar || dock; // these layouts have no side bar at all
  const logo = ui === 'lgux' ? '/icon-lg.svg' : '/icon.svg'; // LG UX 5.0 has its own (candy) logo
  const sideNav = toolbar ? LIBRARY.map((to) => NAV.find((n) => n.to === to)!) : NAV;
  const topNav = toolbar ? NAV.filter((n) => !LIBRARY.includes(n.to) && n.to !== '/settings') : topbar ? NAV : [];
  const toggle = usePlayer((s) => s.toggle);
  const hasPlayer = usePlayer((s) => !!s.queue.currentId);
  // space = play/pause, unless typing in a field or pressing a button
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.code !== 'Space' || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(el.tagName) || el.isContentEditable) return;
      e.preventDefault(); toggle();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [toggle]);
  return (
    <div className="flex h-full flex-col">
      <WindowFrame />
      {effectiveUi(ui) === 'lgux' && <CandyDefs />}
      <div className="bt-scrim" aria-hidden />
      <div className="flex min-h-0 flex-1">
        {!noSide && <aside ref={sideRef} className="bt-side bt-shell relative hidden w-56 shrink-0 flex-col gap-1 p-3 md:flex">
          <span className="bt-ind" aria-hidden />
          <div className="bt-brand mb-3 flex items-center gap-2.5 px-3 pt-1 text-lg font-bold tracking-tight"><img src={logo} alt="" width={26} height={26} className="h-[26px] w-[26px] shrink-0" draggable={false} /><span className="bt-label-text">Curator</span></div>
          {sideNav.map(({ to, label, icon: Icon, ...rest }) => (
            <NavLink key={to} to={to} end={'end' in rest} title={label} className="bt-nav flex items-center gap-3 px-3 py-2 text-sm font-medium">
              <Icon size={18} className="shrink-0" /><span className="bt-label-text">{label}</span>
            </NavLink>
          ))}
          <div className="mt-auto"><SyncDot /></div>
        </aside>}
        <main ref={mainRef} className={cn('min-w-0 flex-1 overflow-y-auto overflow-x-hidden', hasPlayer && 'has-player')}>
          <form className="bt-top bt-shell sticky top-0 z-10 p-3 backdrop-blur" onSubmit={(e) => { e.preventDefault(); if (q.trim()) nav(`/search?q=${encodeURIComponent(q.trim())}`); }}>
            <div className="bt-topin relative mx-auto flex max-w-3xl items-center gap-3">
              <div className={cn('flex shrink-0 items-center gap-2 font-bold', !noSide && 'md:hidden')}><img src={logo} alt="Curator" width={28} height={28} className="h-7 w-7 shrink-0" draggable={false} />{topbar && <span className="hidden md:inline">Curator</span>}</div>
              <div className={cn(!noSide && 'md:hidden')}><SyncDot /></div>
              {(toolbar || topbar) && <nav className="bt-toplinks hidden min-w-0 items-center gap-6 overflow-x-auto md:flex" aria-label="Pages">
                {topNav.map(({ to, label, ...rest }) => <NavLink key={to} to={to} end={'end' in rest} className="bt-toplink whitespace-nowrap">{toolbar ? TOOLBAR_LABEL[to] ?? label : label}</NavLink>)}
              </nav>}
              <div className="hidden shrink-0 items-center min-[480px]:flex">
                <button type="button" className="btn btn-ghost !p-1.5 disabled:opacity-30" aria-label="Back" title="Back" disabled={!canBack} onClick={() => nav(-1)}><ArrowLeft size={17} /></button>
                <button type="button" className="btn btn-ghost !p-1.5 disabled:opacity-30" aria-label="Forward" title="Forward" disabled={!canForward} onClick={() => nav(1)}><ArrowRight size={17} /></button>
              </div>
              <div className="bt-search relative flex-1">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted" />
              <input className="input pl-9" placeholder="Search tracks, albums, artists" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              {!hasPlayer && <VolumeButton />}
              <DevicesMenu />
              <AddMenu />
              {toolbar && <NavLink to="/settings" className="btn btn-ghost bt-add hidden !p-2 md:inline-flex" aria-label="Settings" title="Settings"><Settings size={18} /></NavLink>}
            </div>
          </form>
          <div className={cn('bt-content mx-auto p-4 md:p-6', wide ? 'max-w-[96rem]' : 'max-w-6xl')}><div key={pathname} className="bt-page"><Outlet /></div></div>
        </main>
      </div>
      <PlayerBar />
      <EditorHost />
      <NowPlaying />
      <nav ref={tabRef} className={cn('bt-tabbar bt-shell relative flex', !dock && 'md:hidden')}>
        <span className="bt-ind" aria-hidden />
        {NAV.filter((n) => dock || !MOBILE_HIDDEN.includes(n.to)).map(({ to, label, icon: Icon, ...rest }) => (
          // the dock lists every page on a wide window; on a phone only the usual tabs plus Settings (the rest sit under More)
          <NavLink key={to} to={to} end={'end' in rest} className={cn('bt-tab flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]', dock && MOBILE_HIDDEN.includes(to) && to !== '/settings' && 'max-md:hidden')}>
            <Icon size={20} />{label}
          </NavLink>
        ))}
        <MoreMenu dock={dock} />
      </nav>
    </div>
  );
}
