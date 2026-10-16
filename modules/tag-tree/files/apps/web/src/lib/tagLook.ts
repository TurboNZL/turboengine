import type { CSSProperties } from 'react';
import type { TagInfo } from './api.ts';

/** The colours (and first emoji) of the tags a note carries, in tag order. Colour is what makes a tag readable at a glance, so it is used loudly. */
/** The colour of the nearest parent that has one (`work` for `work.reports.q3`), or ''. */
export function parentColor(all: TagInfo[], title: string): string {
  const p = title.split('.');
  for (let i = p.length - 1; i >= 1; i--) { const c = all.find((x) => x.title === p.slice(0, i).join('.'))?.color; if (c) return c; }
  return '';
}
/** What a tag shows: its own colour, else its parent's. */
export const colorOf = (all: TagInfo[], title: string) => all.find((x) => x.title === title)?.color || parentColor(all, title);
/** The colour of the bar: a tag whose colour differs from its parent's gets the parent's bar (the glow and the chip keep the tag's own); otherwise the tag's colour. */
export function barColorOf(all: TagInfo[], title: string): string {
  const own = all.find((x) => x.title === title)?.color ?? '', up = parentColor(all, title);
  return own && up && own !== up ? up : own || up;
}

export function looksOf(all: TagInfo[], titles: string[]): { colors: string[]; bars: string[]; emojis: string[] } {
  const colors: string[] = [], bars: string[] = [], emojis: string[] = [];
  for (const t of titles) {
    const c = colorOf(all, t), b = barColorOf(all, t);
    if (c && !colors.includes(c)) colors.push(c);
    if (b && !bars.includes(b)) bars.push(b);
    const e = all.find((x) => x.title === t)?.emoji;
    if (e) emojis.push(e);
  }
  return { colors: colors.slice(0, 4), bars: bars.slice(0, 4), emojis };
}

/** A bar down the left edge: one colour, or the colours stacked when there are several. */
export function stripe(colors: string[]): CSSProperties | undefined {
  if (!colors.length) return undefined;
  const step = 100 / colors.length;
  return { background: colors.length === 1 ? `#${colors[0]}` : `linear-gradient(to bottom, ${colors.map((c, i) => `#${c} ${i * step}% ${(i + 1) * step}%`).join(', ')})` };
}
/** A soft wash across the row in the tag's colour (the first colour leads, the others follow). */
export function wash(colors: string[]): CSSProperties | undefined {
  if (!colors.length) return undefined;
  const c = colors.map((x) => `color-mix(in srgb, #${x} 20%, transparent)`);
  return { background: `linear-gradient(100deg, ${c.join(', ')}${c.length === 1 ? ', ' : ', '}transparent 78%)` };
}
