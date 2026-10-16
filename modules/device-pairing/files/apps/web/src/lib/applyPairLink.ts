import type { PairCodec, PairPayload } from './pairCode.ts';

/**
 * A pairing link (`/?pair=CODE`) connects this device to a server, after asking. Call it once at start-up, before React renders:
 *
 *   consumePairLink({ codec, search: location.search, origin: location.origin, confirm: (m) => window.confirm(m),
 *     apply: (p) => useStore.getState().updateSettings({ serverUrl: p.url, token: p.token, ...(p.access ? { cfAccessId: p.access.id, cfAccessSecret: p.access.secret } : {}) }),
 *     strip: () => history.replaceState(null, '', location.pathname + location.hash) });
 *
 * The code is always removed from the address afterwards (a code left in the address ends up in history, bookmarks and shared screenshots), whether or
 * not it was applied. When the code's address is the page's own, `apply` gets an empty `url` (same origin: the page needs no address).
 */
export function consumePairLink(o: { codec: PairCodec; search: string; origin: string; confirm: (message: string) => boolean; apply: (p: PairPayload) => void; strip: () => void }): 'none' | 'applied' | 'refused' | 'invalid' {
  if (!o.codec.hasPair(o.search)) return 'none';
  const p = o.codec.fromSearch(o.search);
  o.strip();
  if (!p) return 'invalid';
  if (!o.confirm(`Connect this device to ${p.url || o.origin}?`)) return 'refused';
  o.apply({ ...p, url: p.url === o.origin ? '' : p.url });
  return 'applied';
}
