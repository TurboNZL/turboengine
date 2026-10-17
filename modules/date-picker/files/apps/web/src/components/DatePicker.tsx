import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X } from 'lucide-react';
import { cn } from '../lib/cn.ts';
import { usePresence } from '../lib/presence.ts';

/** a day as `YYYY-MM-DD` (the same text an <input type="date"> holds) */
const p2 = (n: number) => String(n).padStart(2, '0');
export const dayKey = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const parse = (v: string): Date | null => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v); return m ? new Date(+m[1]!, +m[2]! - 1, +m[3]!) : null; };
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** the same day number in another month, held to that month's last day (31 Jan + 1 month = 28 Feb) */
const addMonths = (d: Date, n: number) => { const t = new Date(d.getFullYear(), d.getMonth() + n, 1); t.setDate(Math.min(d.getDate(), new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate())); return t; };
/** 0 = Sunday ... 6 = Saturday: the first day of the week where this device is (Monday when the browser does not say) */
function firstDay(): number {
  try { const l = new Intl.Locale(navigator.language) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } }; const f = (l.getWeekInfo?.() ?? l.weekInfo)?.firstDay; if (f) return f % 7; } catch { /* an old browser */ }
  return 1;
}

/**
 * A date field drawn by the UI style: a button that shows the day and opens a calendar (a native <input type="date"> opens the operating system's own picker, which no
 * theme can touch). The calendar is a `bt-menu bt-popover` in a portal, so it has the style's shape and motion and is never clipped by a window or the dock.
 * Keyboard: arrows move by a day or a week, PageUp/PageDown by a month (with Shift a year), Home/End to the start/end of the week, Enter or Space picks, T is today, Escape closes.
 * `value` and `onChange` use `YYYY-MM-DD` (empty is no date).
 */
export function DatePicker({ value, onChange, placeholder = 'No date', className, 'aria-label': ariaLabel, clearable = true, autoOpen }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string; 'aria-label'?: string; clearable?: boolean; autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!autoOpen);
  const { mounted, leaving } = usePresence(open);
  const btn = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<React.CSSProperties>({});
  const id = useId();
  const picked = parse(value);
  const [hi, setHi] = useState<Date>(() => picked ?? new Date()); // the day the keyboard is on; its month is the one shown
  const today = dayKey(new Date());

  useLayoutEffect(() => {
    if (!mounted || !btn.current) return;
    const place = () => {
      const r = btn.current!.getBoundingClientRect();
      const dock = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dock-h')) || 0;
      const w = Math.min(296, window.innerWidth - 16), h = 340;
      const below = window.innerHeight - dock - r.bottom - 12, above = r.top - 12;
      const up = below < h && above > below;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
      setPos(up ? { left, width: w, bottom: window.innerHeight - r.top + 6, transformOrigin: '50% 100%' } : { left, width: w, top: Math.max(8, Math.min(r.bottom + 6, window.innerHeight - dock - h - 8)), transformOrigin: '50% 0' });
    };
    place();
    window.addEventListener('resize', place); window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [mounted]);

  useEffect(() => {
    if (!open) return;
    setHi(parse(value) ?? new Date());
    const down = (e: MouseEvent) => { const t = e.target as Node; if (!box.current?.contains(t) && !btn.current?.contains(t)) setOpen(false); };
    window.addEventListener('mousedown', down);
    return () => window.removeEventListener('mousedown', down);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (mounted && !leaving) box.current?.querySelector<HTMLElement>('[data-hi="true"]')?.focus({ preventScroll: true }); }, [hi, mounted, leaving]);

  const first = firstDay();
  const weeks = useMemo(() => {
    const start = new Date(hi.getFullYear(), hi.getMonth(), 1);
    const lead = (start.getDay() - first + 7) % 7;
    return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d - lead)));
  }, [hi.getFullYear(), hi.getMonth(), first]); // eslint-disable-line react-hooks/exhaustive-deps
  const heads = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(2023, 0, 1 + ((first + i) % 7)).toLocaleDateString([], { weekday: 'short' }).slice(0, 2)), [first]);

  const choose = (d: Date) => { onChange(dayKey(d)); setOpen(false); btn.current?.focus(); };
  const key = (e: React.KeyboardEvent) => {
    const move = (d: Date) => { e.preventDefault(); setHi(d); };
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); btn.current?.focus(); }
    else if (e.key === 'ArrowLeft') move(addDays(hi, -1));
    else if (e.key === 'ArrowRight') move(addDays(hi, 1));
    else if (e.key === 'ArrowUp') move(addDays(hi, -7));
    else if (e.key === 'ArrowDown') move(addDays(hi, 7));
    else if (e.key === 'PageUp') move(addMonths(hi, e.shiftKey ? -12 : -1));
    else if (e.key === 'PageDown') move(addMonths(hi, e.shiftKey ? 12 : 1));
    else if (e.key === 'Home') move(addDays(hi, -((hi.getDay() - first + 7) % 7)));
    else if (e.key === 'End') move(addDays(hi, 6 - ((hi.getDay() - first + 7) % 7)));
    else if (e.key === 't' || e.key === 'T') { e.preventDefault(); choose(new Date()); }
  };

  const label = picked ? picked.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : placeholder;
  const nav = 'grid h-8 w-8 place-items-center rounded text-muted hover:bg-hover hover:text-fg';
  return (
    <>
      <button ref={btn} type="button" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined} aria-label={ariaLabel ? `${ariaLabel}: ${label}` : undefined}
        className={cn('input bt-select flex !w-auto items-center gap-2 text-left', className)} onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); setOpen(true); } }}>
        <CalendarIcon size={14} className="shrink-0 text-muted" /><span className={cn('min-w-0 flex-1 truncate', !picked && 'text-muted')}>{label}</span>
      </button>
      {mounted && createPortal(
        <div ref={box} id={id} role="dialog" aria-label="Choose a date" data-leaving={leaving || undefined} style={pos} onKeyDown={key} className="bt-menu bt-popover fixed z-[95] select-none p-2">
          <div className="mb-1 flex items-center gap-0.5">
            <button type="button" className={nav} aria-label="Previous year" onClick={() => setHi(addMonths(hi, -12))}><ChevronsLeft size={15} /></button>
            <button type="button" className={nav} aria-label="Previous month" onClick={() => setHi(addMonths(hi, -1))}><ChevronLeft size={15} /></button>
            <div className="min-w-0 flex-1 text-center text-sm font-semibold" aria-live="polite">{hi.toLocaleDateString([], { month: 'long', year: 'numeric' })}</div>
            <button type="button" className={nav} aria-label="Next month" onClick={() => setHi(addMonths(hi, 1))}><ChevronRight size={15} /></button>
            <button type="button" className={nav} aria-label="Next year" onClick={() => setHi(addMonths(hi, 12))}><ChevronsRight size={15} /></button>
          </div>
          <div role="grid" className="grid grid-cols-7 gap-0.5 text-center">
            {heads.map((h, i) => <div key={i} role="columnheader" className="py-1 text-[11px] font-medium uppercase text-muted">{h}</div>)}
            {weeks.flat().map((d) => {
              const k = dayKey(d), here = d.getMonth() === hi.getMonth(), on = k === value, cursor = k === dayKey(hi);
              return (
                <button key={k} type="button" role="gridcell" tabIndex={cursor ? 0 : -1} data-hi={cursor} aria-selected={on} aria-label={d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} onClick={() => choose(d)}
                  className={cn('grid h-9 place-items-center rounded text-sm tabular-nums outline-none hover:bg-hover focus-visible:ring-2 focus-visible:ring-accent', !here && 'text-muted/50', k === today && !on && 'font-bold text-accent ring-1 ring-accent/60', on && 'bg-accent font-semibold text-accent-fg hover:bg-accent')}>
                  {d.getDate()}
                </button>);
            })}
          </div>
          <div className="mt-1 flex items-center justify-between gap-2 border-t border-line pt-1.5">
            <button type="button" className="rounded px-2 py-1 text-sm text-accent hover:bg-hover" onClick={() => choose(new Date())}>Today</button>
            {clearable && value && <button type="button" className="flex items-center gap-1 rounded px-2 py-1 text-sm text-muted hover:bg-hover hover:text-fg" onClick={() => { onChange(''); setOpen(false); btn.current?.focus(); }}><X size={13} />Clear</button>}
          </div>
        </div>, document.body)}
    </>
  );
}
