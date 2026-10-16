import { CalendarClock, CheckSquare, FileText, Pencil, Tag } from 'lucide-react';
import { Emoji } from '../lib/emoji.tsx';
import { cn } from '../lib/cn.ts';
import { useStore } from '../lib/store.ts';
import { useArrivals } from '../lib/arrivals.ts';
import { barColorOf } from '../lib/tagLook.ts';
import type { TagInfo } from '../lib/api.ts';
import type { RailTag } from '../lib/tagTree.ts';
import type { HomeFilter, Scope } from '../lib/views.ts';

/**
 * The left column of Home: the Tasks list (what has a checkbox), every note, what is due soon, then your tags (with their emoji and colour).
 * One click switches what Home shows. On a phone it lies down into a strip of chips above the list. A tag also matches the tags nested under it
 * ("work" shows "work.reports"). Its height stops above the dock, so the last tags can always be reached.
 */
export function TagRail({ tags, filter, onScope, onTag, onEditTag, counts, archive }: {
  tags: RailTag[]; filter: HomeFilter; /** the Archive: no "Due soon" (finished things are not due) */ archive?: boolean; onScope: (s: Scope) => void; onTag: (t: string) => void; onEditTag: (t: TagInfo) => void; counts: { list: number | null };
}) {
  const all = useStore((s) => s.tags);
  const arrived = useArrivals(tags.map((t) => t.title));
  const chip = 'flex min-h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-theme px-2.5 py-1.5 text-left text-sm hover:bg-raised max-lg:border max-lg:border-line max-lg:py-1 lg:w-full';
  const on = (s: Scope) => !filter.tag && filter.scope === s;
  const every: { id: Scope; label: string; icon: typeof Tag; n?: number | null }[] = [
    { id: 'list', label: archive ? 'Old Tasks' : 'Tasks', icon: CheckSquare, n: counts.list }, { id: 'all', label: 'All notes', icon: FileText }, { id: 'due', label: 'Due soon', icon: CalendarClock },
  ];
  const scopes = every.filter((s) => !(archive && s.id === 'due'));
  return (
    <nav aria-label="Tasks and tags" className="flex min-w-0 gap-1.5 overflow-x-auto pb-1 lg:sticky lg:top-20 lg:flex-col lg:gap-0.5 lg:self-start lg:overflow-y-auto lg:overflow-x-hidden lg:pb-0"
      style={{ maxHeight: 'calc(100dvh - 6.5rem - var(--dock-h, 0px))' }}>
      {scopes.map((s) => (
        <button key={s.id} onClick={() => onScope(s.id)} aria-current={on(s.id) || undefined} className={cn(chip, on(s.id) && 'bg-raised font-medium text-accent')}>
          <s.icon size={15} className="shrink-0" /><span className="min-w-0 flex-1 truncate">{s.label}</span>{s.n ? <span className="text-xs text-muted">{s.n}</span> : null}
        </button>))}
      <div className="mb-0.5 mt-3 hidden items-center gap-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted lg:flex"><Tag size={12} />Tags</div>
      {tags.map((t) => {
        const depth = t.title.split('.').length - 1, sel = filter.tag === t.title, bar = barColorOf(all, t.title) || t.color;
        return (
          <div key={t.title} className={cn('group relative flex shrink-0 items-center lg:w-full', arrived.has(t.title) && 'tk-arrive')}>
            <button onClick={() => onTag(sel ? '' : t.title)} aria-current={sel || undefined} title={t.title} className={cn(chip, 'lg:pr-9', sel && 'bg-raised pr-7 font-medium text-accent')}
              style={{ ...(bar ? { boxShadow: `inset 4px 0 0 #${bar}`, paddingLeft: '0.9rem' } : null), fontSize: 'var(--rail-text, 0.875rem)' }}>
              {t.emoji && <span className="inline-flex shrink-0 items-center" style={{ fontSize: 'var(--rail-emoji, 1.25rem)', lineHeight: 1 }}><Emoji value={t.emoji} /></span>}
              <span className="min-w-0 flex-1 truncate" style={{ paddingLeft: `${depth * 0.75}rem` }}>{depth > 0 && <span aria-hidden className="text-muted">– </span>}{t.title.split('.').pop()}</span><span className="text-xs text-muted">{t.total}</span>
            </button>
            <button className={cn('absolute right-1 rounded p-1.5 text-muted hover:text-fg', sel ? 'block' : 'hidden lg:group-hover:block lg:group-focus-within:block')} onClick={() => onEditTag(t)} aria-label={`Edit tag ${t.title}`} title="Emoji, colour, name"><Pencil size={13} /></button>
          </div>);
      })}
      {!tags.length && <p className="hidden px-2.5 text-xs text-muted lg:block">{archive ? 'Nothing archived is filed under a tag.' : 'Notes you send to tags show up here.'}</p>}
    </nav>
  );
}
