// The search language's parser (copied from TurboKeep's store.ts). The SQL it becomes is in MODULE.md.

const pad2 = (n: number) => String(n).padStart(2, '0');
/** "2019", "2019-06" or "2019-06-14" as the first and last day it covers, or null when it is not a date. */
export function dateRange(text: string): { from: string; to: string } | null {
  const m = /^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/.exec(text.trim());
  if (!m) return null;
  const y = Number(m[1]), mo = m[2] ? Number(m[2]) : 0, d = m[3] ? Number(m[3]) : 0, last = (yy: number, mm: number) => new Date(Date.UTC(yy, mm, 0)).getUTCDate();
  if (mo && (mo < 1 || mo > 12)) return null;
  if (d && (d < 1 || d > last(y, mo))) return null;
  if (!mo) return { from: `${y}-01-01`, to: `${y}-12-31` };
  if (!d) return { from: `${y}-${pad2(mo)}-01`, to: `${y}-${pad2(mo)}-${pad2(last(y, mo))}` };
  return { from: `${y}-${pad2(mo)}-${pad2(d)}`, to: `${y}-${pad2(mo)}-${pad2(d)}` };
}

export interface Search { words: string[]; tags: string[]; notTags: string[]; before: { from: string; to: string }[]; after: { from: string; to: string }[]; is: string[]; notIs: string[]; has: string[]; notHas: string[] }
/**
 * The search language, in the style of Discord's: words, `"a phrase"`, and filters `tag:work` (also finds `work.reports`), `-tag:old` (leaves them out),
 * (`exclude:work` and `include:work` mean the same as `-tag:work` and `tag:work`), `before:2019-06` / `after:2020` (when the note was made; a year or a month is the whole period), `is:task|note|pinned|markdown`, `has:date|tags|text`.
 * A `-` in front of any filter turns it round. Filters combine with AND, so `tag:a tag:b` finds notes with both. A filter that makes no sense is read as a word.
 */
export function parseSearch(q: string): Search {
  const out: Search = { words: [], tags: [], notTags: [], before: [], after: [], is: [], notIs: [], has: [], notHas: [] };
  const re = /(-?)(tags?|includes?|excludes?|not|before|after|is|has):(?:"([^"]*)"|(\S+))|"([^"]+)"|(\S+)/gi;
  for (const m of q.matchAll(re)) {
    if (m[2]) {
      let key = m[2].toLowerCase(), neg = m[1] === '-';
      const val = (m[3] ?? m[4] ?? '').trim();
      if (!val) continue;
      if (key === 'exclude' || key === 'excludes' || key === 'not') { key = 'tag'; neg = !neg; } else if (key === 'include' || key === 'includes' || key === 'tags') key = 'tag';
      if (key === 'tag') (neg ? out.notTags : out.tags).push(val);
      else if (key === 'is') (neg ? out.notIs : out.is).push(val.toLowerCase());
      else if (key === 'has') (neg ? out.notHas : out.has).push(val.toLowerCase());
      else { const r = dateRange(val); if (r) (key === 'before' ? out.before : out.after).push(r); else out.words.push(m[0]); }
    } else out.words.push(m[5] ?? m[6] ?? '');
  }
  out.words = out.words.filter(Boolean).slice(0, 8);
  return out;
}

