import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Search, Trash2 } from 'lucide-react';
import { api } from '../lib/api.ts';
import { Emoji, resizeToEmoji } from '../lib/emoji.tsx';
import { useStore } from '../lib/store.ts';
import { cn } from '../lib/cn.ts';

interface E { g: number; l: string; t: string; u: string }
const GROUPS: { id: number; icon: string; label: string }[] = [
  { id: -1, icon: '🕘', label: 'Recent' }, { id: 0, icon: '😀', label: 'Smileys' }, { id: 1, icon: '👋', label: 'People' }, { id: 3, icon: '🐻', label: 'Animals and nature' },
  { id: 4, icon: '🍔', label: 'Food and drink' }, { id: 5, icon: '✈️', label: 'Travel and places' }, { id: 6, icon: '⚽', label: 'Activities' },
  { id: 7, icon: '💡', label: 'Objects' }, { id: 8, icon: '❤️', label: 'Symbols' }, { id: 9, icon: '🏳️', label: 'Flags' },
];
const RECENT_KEY = 'turbokeep.recentEmoji';
const readRecent = (): string[] => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; } };

let cache: E[] | null = null;
/** The emoji list (about 1,900 with names and keywords, 84 kB compressed) is its own file, fetched when a picker first opens. */
async function load(): Promise<E[]> {
  if (cache) return cache;
  const raw = (await import('emojibase-data/en/compact.json')).default as unknown as { group?: number; label: string; tags?: string[]; unicode: string; order?: number }[];
  cache = raw.filter((e) => e.group !== undefined && e.group !== 2).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((e) => ({ g: e.group!, l: e.label, t: (e.tags ?? []).join(' '), u: e.unicode }));
  return cache;
}

/**
 * Pick an emoji: search by name or keyword ("cart", "home"), browse by group, recently used first. Large buttons, so a finger can hit them.
 * Each one is labelled with its name for a screen reader.
 */
export function EmojiPicker({ value, onPick }: { value: string; onPick: (emoji: string) => void }) {
  const [list, setList] = useState<E[] | null>(cache);
  const [q, setQ] = useState('');
  const [group, setGroup] = useState(() => (readRecent().length ? -1 : 0));
  const [recent, setRecent] = useState(readRecent);
  const [mine, setMine] = useState<{ id: string; name: string }[]>([]);
  const [manage, setManage] = useState(false);
  const [note, setNote] = useState('');
  const file = useRef<HTMLInputElement>(null);
  const toast = useStore((st) => st.toast);
  useEffect(() => { void api.emoji().then(setMine, () => {}); }, []);
  /** a picture from your device: shrunk to emoji size here (a 4k image is small before it is sent), then kept on the server */
  async function importFiles(files: FileList | null) {
    if (!files?.length) return;
    setNote('Shrinking…');
    try {
      for (const f of [...files].slice(0, 20)) {
        const e = await api.addEmoji(f.name.replace(/\.[^.]+$/, ''), await resizeToEmoji(f));
        setMine((m) => [...m, e]); setGroup(-2);
      }
      setNote('');
    } catch (e) { setNote(''); toast((e as Error).message || 'Could not import that picture', { tone: 'bad' }); }
    if (file.current) file.current.value = '';
  }
  const grid = useRef<HTMLDivElement>(null);
  useEffect(() => { let on = true; void load().then((l) => on && setList(l)); return () => { on = false; }; }, []);
  useEffect(() => { grid.current?.scrollTo({ top: 0 }); }, [group, q]);
  const shown = useMemo<{ u: string; l: string }[]>(() => {
    if (!list) return [];
    const s = q.trim().toLowerCase();
    if (s) return [...mine.filter((m) => m.name.toLowerCase().includes(s)).map((m) => ({ u: `:${m.id}:`, l: m.name })), ...list.filter((e) => e.l.toLowerCase().includes(s) || e.t.toLowerCase().includes(s))].slice(0, 240);
    if (group === -2) return mine.map((m) => ({ u: `:${m.id}:`, l: m.name || 'Imported emoji' }));
    if (group === -1) return recent.map((u) => list.find((e) => e.u === u)).filter((e): e is E => !!e);
    return list.filter((e) => e.g === group);
  }, [list, q, group, recent, mine]);
  const pick = (u: string) => {
    const next = [u, ...recent.filter((x) => x !== u)].slice(0, 24);
    setRecent(next); try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* private window */ }
    onPick(u);
  };
  return (
    <div className="space-y-2" aria-label="Emoji picker">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input className="input !pl-9" type="text" autoFocus aria-label="Search emoji" placeholder="Search emoji: home, cart, heart…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {!q && <div className="flex gap-0.5 overflow-x-auto pb-1" role="tablist" aria-label="Emoji groups">
        {[...GROUPS, { id: -2, icon: '🖼️', label: 'Your own' }].filter((g) => g.id !== -1 || recent.length).map((g) => (
          <button key={g.id} type="button" role="tab" aria-selected={group === g.id} title={g.label} aria-label={g.label} onClick={() => setGroup(g.id)}
            className={cn('h-10 w-10 shrink-0 rounded-theme text-xl hover:bg-raised', group === g.id && 'bg-raised ring-1 ring-accent')}>{g.icon}</button>))}
      </div>}
      <div ref={grid} className="grid max-h-60 grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-0.5 overflow-y-auto" role="listbox" aria-label="Emoji">
        {!list && <p className="col-span-full p-3 text-sm text-muted">Loading emoji…</p>}
        {list && !shown.length && <p className="col-span-full p-3 text-sm text-muted">{q ? 'No emoji matches that.' : 'Nothing here yet.'}</p>}
        {shown.map((e) => (
          <button key={e.u} type="button" role="option" aria-selected={value === e.u} aria-label={e.l} title={e.l} onClick={() => pick(e.u)}
            className={cn('relative grid h-10 place-items-center rounded-theme text-2xl leading-none hover:bg-raised', value === e.u && 'bg-raised ring-1 ring-accent')}>
            <Emoji value={e.u} className="!h-7 !w-7 !align-baseline" />
            {manage && e.u.startsWith(':') && <span role="button" aria-label={`Remove ${e.l}`} className="absolute -right-0.5 -top-0.5 grid h-5 w-5 place-items-center rounded-full bg-bad text-white"
              onClick={(ev) => { ev.stopPropagation(); const id = e.u.slice(1, -1); void api.deleteEmoji(id).then(() => setMine((m) => m.filter((x) => x.id !== id))); }}><Trash2 size={11} /></span>}
          </button>))}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line/60 pt-2">
        <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => void importFiles(e.target.files)} />
        <button type="button" className="btn text-xs" onClick={() => file.current?.click()}><ImagePlus size={14} />Import a picture</button>
        {mine.length > 0 && <button type="button" className="btn btn-ghost text-xs" aria-pressed={manage} onClick={() => { setManage(!manage); setGroup(-2); }}>{manage ? 'Done removing' : 'Remove…'}</button>}
        <span className="text-xs text-muted">{note || 'Any picture is shrunk to emoji size.'}</span>
      </div>
    </div>
  );
}
