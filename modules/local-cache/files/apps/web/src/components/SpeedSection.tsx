import { useState } from 'react';
import { Check, Zap } from 'lucide-react';
import { precacheEverything } from '../lib/precache.ts';
import { useStore } from '../lib/store.ts';
import { LEVELS, clearCache } from '../lib/cache.ts';
import { cn } from '../lib/cn.ts';
import { Section } from './Section.tsx';

/** Settings > Items > Speed: how much the page remembers so it opens faster (the levels are explained in lib/cache.ts). Saved on this device. */
export function SpeedSection() {
  const { settings, updateSettings } = useStore();
  const [cleared, setCleared] = useState(false);
  const [busy, setBusy] = useState('');
  const [done, setDone] = useState('');
  const cur = LEVELS.find((l) => l.id === settings.cacheLevel) ?? LEVELS[2]!;
  return (
    <Section title="Speed (caching)">
      <p className="text-sm text-muted">What the page remembers so it opens faster. It always checks with the server afterwards, so what you see is updated within a moment. Saved on this device.</p>
      <div role="radiogroup" aria-label="Caching level" className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-1.5">
        {LEVELS.map((l) => (
          <button key={l.id} type="button" role="radio" aria-checked={cur.id === l.id} title={l.text} onClick={() => { updateSettings({ cacheLevel: l.id }); setCleared(false); }}
            className={cn('rounded-theme border bg-raised/40 px-2.5 py-1.5 text-left transition-colors hover:border-accent', cur.id === l.id ? 'border-accent ring-1 ring-accent' : 'border-line')}>
            <span className="flex items-center justify-between gap-2"><span className="text-xs font-medium">{l.label}</span>{cur.id === l.id && <Check size={12} className="shrink-0 text-accent" />}</span>
          </button>))}
      </div>
      <p className="rounded-theme bg-raised/50 px-3 py-2 text-xs leading-snug text-muted"><span className="font-medium text-fg">{cur.label}: </span>{cur.text}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-accent text-xs" disabled={!!busy || settings.cacheLevel === 'off'} onClick={async () => {
          setBusy('Starting…'); setDone(''); setCleared(false);
          try { const r = await precacheEverything(settings.countTasks, setBusy); setDone(`Remembered ${r.lists} lists and ${r.notes} items.`); } catch (e) { setDone(`Could not finish: ${(e as Error).message}`); } finally { setBusy(''); }
        }}><Zap size={14} />Remember everything now</button>
        <button type="button" className="btn text-xs" onClick={() => { clearCache(); setCleared(true); setDone(''); }}>Forget what is remembered</button>
        <span className="text-xs text-muted" role="status">{busy || done || (cleared ? 'Cleared.' : settings.cacheLevel === 'off' ? 'Turn caching on first.' : settings.cacheLevel === 'high' ? 'Lists and items are kept on this device.' : 'Items are kept for this visit; set High to keep them on this device.')}</span>
      </div>
    </Section>
  );
}
