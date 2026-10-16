import type { TagInfo } from './api.ts';

/** A tag as the tags column shows it: `total` counts the notes under it and under its sub-tags; a parent that no note carries by itself is `implied` (it exists as the front of `work.reports`). */
export interface RailTag extends TagInfo { total: number; implied: boolean }

const parts = (t: string) => t.split('.');
const byPath = (a: string, b: string) => {
  const x = parts(a.toLowerCase()), y = parts(b.toLowerCase());
  for (let i = 0; i < Math.min(x.length, y.length); i++) if (x[i] !== y[i]) return x[i]! < y[i]! ? -1 : 1;
  return x.length - y.length;
};

/**
 * Builds the tags column from the tags the server counts: every parent of a sub-tag is there even when no note is directly under it, a tag with nothing
 * under it or under its sub-tags (in this pile) is left out, and children follow their parent.
 */
export function railTags(tags: TagInfo[], looks: TagInfo[] = []): RailTag[] {
  const own = new Map(tags.map((t) => [t.title, t]));
  const titles = new Set<string>();
  for (const t of tags) { const p = parts(t.title); for (let i = 1; i <= p.length; i++) titles.add(p.slice(0, i).join('.')); }
  return [...titles].sort(byPath).map((title) => {
    const t = own.get(title);
    const total = tags.filter((x) => x.title === title || x.title.startsWith(`${title}.`)).reduce((n, x) => n + x.count, 0);
    const l = t ?? looks.find((x) => x.title === title); // a parent with no notes of its own in this pile still has its look
    return { title, emoji: l?.emoji ?? '', color: l?.color ?? '', count: t?.count ?? 0, total, implied: !t };
  }).filter((t) => t.total > 0);
}
