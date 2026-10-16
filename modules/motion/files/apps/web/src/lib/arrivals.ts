import { useRef } from 'react';

/**
 * The keys that appeared since the list was last drawn: a tag or an item that shows up after the page first drew (the server's answer came in, another device added
 * one) is given the `tk-arrive` class, so it slides into place instead of snapping in. Nothing animates for the first list drawn, and a key keeps counting as new for
 * 900 ms (so a re-render during the animation does not cut it short). One rule for the whole app: see `.tk-arrive` in index.css.
 */
export function useArrivals(keys: string[]): ReadonlySet<string> {
  const seen = useRef<Set<string> | null>(null);
  const fresh = useRef(new Map<string, number>());
  const now = Date.now();
  if (seen.current) { for (const k of keys) if (!seen.current.has(k)) fresh.current.set(k, now + 900); }
  if (keys.length) seen.current = new Set(keys);
  for (const [k, until] of fresh.current) if (until < now) fresh.current.delete(k);
  return new Set(fresh.current.keys());
}
