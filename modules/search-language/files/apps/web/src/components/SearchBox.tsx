import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { useStore } from '../lib/store.ts';
import { cn } from '../lib/cn.ts';
import { HAS_VALUES, IS_VALUES, FILTERS, buildQuery, chipText, parseQuery, typedFilter, type Chip } from '../lib/searchQuery.ts';

interface Suggestion { id: string; label: string; hint?: string; run: () => void }

/**
 * The search box, after Discord's: type words and press Enter, or type a filter name (`tag:`, `-tag:`, `before:`, `after:`, `is:`, `has:`) to pick one from a list that
 * narrows as you type. Tab (or the arrows) walks down the list, Enter takes the lit one and it becomes a chip; chips combine. Backspace on an empty box takes the last
 * chip off. A search looks through the page you are on (Home, the Archive or the Bin); the page offers the others when they hold results too.
 */
export function SearchBox({ query, onSearch, where }: { query: string; onSearch: (q: string) => void; where: string }) {
  const tags = useStore((s) => s.tags);
  const parsed = useMemo(() => parseQuery(query), [query]);
  const [text, setText] = useState(parsed.text);
  const [focus, setFocus] = useState(false);
  const [hi, setHi] = useState(0);
  const [pos, setPos] = useState<React.CSSProperties>({});
  const box = useRef<HTMLDivElement>(null), input = useRef<HTMLInputElement>(null);
  const walked = useRef(false);
  const [lastQuery, setLastQuery] = useState(query);
  if (lastQuery !== query) { setLastQuery(query); setText(parsed.text); } // the address changed (a link, Back, clearing)
  const { chips } = parsed;

  const apply = (c: Chip[], t: string) => onSearch(buildQuery(c, t));
  const add = (c: Chip) => { if (!chips.some((x) => x.key === c.key && x.neg === c.neg && x.value === c.value)) apply([...chips, c], ''); setText(''); walked.current = false; input.current?.focus(); };
  const typed = typedFilter(text);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const t of tags) { const p = t.title.split('.'); for (let i = 1; i <= p.length; i++) set.add(p.slice(0, i).join('.')); }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [tags]);

  const suggestions: Suggestion[] = useMemo(() => {
    const out: Suggestion[] = [];
    if (!typed) {
      const t = text.trim().toLowerCase();
      const neg = t.startsWith('-'), bare = t.replace(/^-/, '');
      for (const f of FILTERS) {
        if (neg && !f.negatable) continue;
        if (bare && !f.name.startsWith(bare)) continue;
        out.push({ id: f.name, label: `${neg ? '-' : ''}${f.name}:`, hint: f.hint, run: () => { setText(`${neg ? '-' : ''}${f.name}:`); input.current?.focus(); } });
      }
      return out;
    }
    const { key, neg, rest } = typed, r = rest.trim().toLowerCase();
    const chip = (value: string): Chip => ({ key, neg, value });
    if (key === 'tag') out.push(...allTags.filter((t) => !r || t.toLowerCase().includes(r)).slice(0, 8).map((t) => ({ id: t, label: t, run: () => add(chip(t)) })));
    else if (key === 'is' || key === 'has') out.push(...(key === 'is' ? IS_VALUES : HAS_VALUES).filter((v) => !r || v.startsWith(r)).map((v) => ({ id: v, label: v, run: () => add(chip(v)) })));
    else if (r) out.push({ id: 'typed', label: `${key}: ${rest.trim()}`, hint: 'A year (2024), a month (2024-06) or a day (2024-06-14)', run: () => add(chip(rest.trim())) });
    else { const y = new Date().getFullYear(); for (const v of [String(y), String(y - 1), `${y}-${String(new Date().getMonth() + 1).padStart(2, '0')}`]) out.push({ id: v, label: v, run: () => add(chip(v)) }); }
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, allTags, chips]);

  const open = focus && suggestions.length > 0;
  useLayoutEffect(() => {
    if (!open || !box.current) return;
    const place = () => { const r = box.current!.getBoundingClientRect(); setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - 296)), top: r.bottom + 6, width: Math.max(r.width, 280) }); };
    place();
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !text && chips.length) { e.preventDefault(); apply(chips.slice(0, -1), ''); return; }
    if (e.key === 'Escape') { input.current?.blur(); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      // a filter being typed (`tag:wo`) takes the lit suggestion; plain words search, unless you walked down the list of filters with Tab first
      if (open && suggestions[hi] && (typed || walked.current)) suggestions[hi]!.run(); else apply(chips, text);
      walked.current = false;
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey && hi < suggestions.length - 1)) { e.preventDefault(); walked.current = true; setHi((h) => Math.min(suggestions.length - 1, h + 1)); }
    else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey && hi > 0)) { e.preventDefault(); walked.current = true; setHi((h) => Math.max(0, h - 1)); }
  };

  return (
    <>
      <div ref={box} role="search" className={cn('input flex min-h-[2.25rem] min-w-0 flex-1 cursor-text flex-wrap items-center gap-1.5 !py-1 pl-9', focus && 'bt-focus')} onClick={() => input.current?.focus()}>
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted" />
        {chips.map((c, i) => (
          <span key={`${c.key}${c.neg}${c.value}`} className={cn('chip gap-1', c.neg ? '!bg-bad/15' : '!bg-accent/15', '!text-fg')}>
            <span className="text-muted">{c.neg ? 'not ' : ''}{c.key}:</span>{c.value}
            <button type="button" aria-label={`Remove filter ${chipText(c)}`} className="text-muted hover:text-fg" onClick={(e) => { e.stopPropagation(); apply(chips.filter((_, j) => j !== i), text); }}><X size={12} /></button>
          </span>))}
        <input ref={input} className="min-w-[6rem] flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-muted" type="text" enterKeyHint="search" autoComplete="off" aria-label={`Search ${where}`} placeholder={chips.length ? 'Add a filter…' : `Search ${where}, or filter: tag, before…`}
          value={text} onChange={(e) => { setText(e.target.value); setHi(0); walked.current = false; }} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 120)} onKeyDown={onKey} />
        {(chips.length > 0 || text) && <button type="button" aria-label="Clear the search" className="shrink-0 text-xs text-muted hover:text-fg" onClick={(e) => { e.stopPropagation(); setText(''); onSearch(''); }}><X size={14} /></button>}
      </div>
      {open && createPortal(
        <div role="listbox" style={pos} className="bt-menu bt-popover fixed z-[70] max-h-80 overflow-y-auto py-1" onMouseDown={(e) => e.preventDefault()}>
          <div className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted">{typed ? `${typed.neg ? 'not ' : ''}${typed.key}` : 'Filters'}</div>
          {suggestions.map((s, i) => (
            <button key={s.id} type="button" role="option" aria-selected={i === hi} className={cn('flex w-full items-baseline gap-3 px-3 py-1.5 text-left text-sm', i === hi && 'bt-select-hi')} onMouseEnter={() => setHi(i)} onClick={s.run}>
              <span className="font-medium">{s.label}</span>{s.hint && <span className="ml-auto truncate text-xs text-muted">{s.hint}</span>}
            </button>))}
        </div>, document.body)}
    </>
  );
}
