/**
 * The search box's language (the server reads the same words, see parseSearch in apps/server/src/store.ts). Filters are chips: `tag:work` (also finds `work.reports`),
 * `-tag:old` (leaves them out), `before:2024-06` / `after:2023` (when the item was made), `is:task|note|pinned|markdown`, `has:date|tags|text`. A `-` in front
 * of any of them turns it round. Everything else is words. This file turns the text in the address into chips and back.
 */
export type FilterKey = 'tag' | 'before' | 'after' | 'is' | 'has';
export interface Chip { key: FilterKey; neg: boolean; value: string }

export const FILTERS: { name: string; key: FilterKey; neg?: boolean; hint: string; example: string; negatable: boolean }[] = [
  { name: 'tag', key: 'tag', hint: 'In this tag (and the tags under it). Add several to need all of them', example: 'tag:work', negatable: true },
  { name: 'excludes', key: 'tag', neg: true, hint: 'Leave out this tag (and the tags under it)', example: 'excludes:old', negatable: false },
  { name: 'before', key: 'before', hint: 'Made before a year, month or day', example: 'before:2024-06', negatable: false },
  { name: 'after', key: 'after', hint: 'Made after a year, month or day', example: 'after:2023', negatable: false },
  { name: 'is', key: 'is', hint: 'task, note, pinned or markdown', example: 'is:task', negatable: true },
  { name: 'has', key: 'has', hint: 'date, tags or text', example: 'has:date', negatable: true },
];
export const IS_VALUES = ['task', 'note', 'pinned', 'markdown'];
export const HAS_VALUES = ['date', 'tags', 'text'];

const KEYS = FILTERS.map((f) => f.key);
const re = /(-?)(tags?|includes?|excludes?|not|before|after|is|has):(?:"([^"]*)"|(\S+))|(\S+)/gi;
/** `excludes:x` and `not:x` mean `-tag:x`; `includes:x` and `tags:x` mean `tag:x` */
const canon = (word: string, neg: boolean): { key: FilterKey; neg: boolean } => {
  const w = word.toLowerCase();
  if (w === 'exclude' || w === 'excludes' || w === 'not') return { key: 'tag', neg: !neg };
  if (w === 'include' || w === 'includes' || w === 'tags') return { key: 'tag', neg };
  return { key: w as FilterKey, neg };
};

export function parseQuery(q: string): { chips: Chip[]; text: string } {
  const chips: Chip[] = [], words: string[] = [];
  for (const m of q.matchAll(re)) {
    if (m[2]) {
      const value = (m[3] ?? m[4] ?? '').trim();
      if (value) chips.push({ ...canon(m[2], m[1] === '-'), value });
    } else if (m[5]) words.push(m[5]);
  }
  return { chips, text: words.join(' ') };
}

const quote = (v: string) => (/\s/.test(v) ? `"${v}"` : v);
export const chipText = (c: Chip) => `${c.neg ? '-' : ''}${c.key}:${quote(c.value)}`;
export const buildQuery = (chips: Chip[], text: string) => [...chips.map(chipText), text.trim()].filter(Boolean).join(' ');

/** What the user is typing as a filter: `tag:wo` -> { key: 'tag', neg: false, rest: 'wo' }; `-tag:` too; anything else is plain words (null). */
export function typedFilter(text: string): { key: FilterKey; neg: boolean; rest: string } | null {
  const m = /^(-?)(tags?|includes?|excludes?|not|before|after|is|has):\s*(.*)$/i.exec(text.trimStart());
  return m ? { ...canon(m[2]!, m[1] === '-'), rest: m[3]!.replace(/^"/, '') } : null;
}
export { KEYS };
