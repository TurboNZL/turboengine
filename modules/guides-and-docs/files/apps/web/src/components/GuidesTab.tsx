import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listGuides } from '../lib/guides.ts';
import { renderMarkdown } from '../lib/markdown.ts';
import { cn } from '../lib/cn.ts';
import { Select } from './Select.tsx';

/** Settings → Guides: every guide that ships with the project, readable here (also offline, and inside the Android app). */
export function GuidesTab() {
  const guides = useMemo(listGuides, []);
  const [params, setParams] = useSearchParams();
  const asked = params.get('doc');
  const current = guides.find((g) => g.name === asked) ?? guides[0];
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!current) return;
    let alive = true; setHtml(null); setError(null);
    current.load().then((md) => { if (alive) setHtml(renderMarkdown(md)); }, (e: Error) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [current]);
  if (!current) return <p className="text-sm text-muted">No guides in this build.</p>;
  const open = (name: string, hash?: string) => { setParams({ tab: 'guides', doc: name }, { replace: true }); if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView(), 80); };
  const groups = ['Start', 'Apps', 'Servers'] as const;
  return (
    <div className="grid gap-5 md:grid-cols-[14rem_minmax(0,1fr)]">
      <div className="md:hidden"><Select aria-label="Guide" value={current.name} onChange={(v) => open(v)} options={guides.map((g) => ({ value: g.name, label: g.title }))} /></div>
      <nav aria-label="Guides" className="hidden space-y-3 md:sticky md:top-16 md:block md:self-start">
        {groups.map((g) => { const items = guides.filter((x) => x.group === g); return items.length ? (
          <div key={g}><div className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{g}</div>
            {items.map((x) => <button key={x.name} onClick={() => open(x.name)} aria-current={x.name === current.name || undefined} className={cn('block w-full truncate rounded-theme px-2 py-1.5 text-left text-sm hover:bg-raised', x.name === current.name && 'bg-raised font-medium text-accent')}>{x.title}</button>)}</div>) : null; })}
      </nav>
      <article className="guide min-w-0 max-w-3xl" onClick={(e) => {
        const a = (e.target as HTMLElement).closest('a[data-doc]') as HTMLAnchorElement | null;
        if (a) { e.preventDefault(); open(a.dataset.doc!); }
      }}>
        {error && <div className="rounded-theme bg-bad/15 p-3 text-sm text-bad">{error}</div>}
        {!html && !error && <div className="text-sm text-muted">Loading…</div>}
        {html && <div dangerouslySetInnerHTML={{ __html: html }} />}
      </article>
    </div>
  );
}
