import { api } from './store.ts';

/**
 * Covers inside the Android app. An answer that AccessProxy produces is not stored by Chromium's HTTP cache, so every cover was fetched
 * again on each screen (about a second for a full grid). Images never change under their hash, so the bytes are kept in Cache Storage
 * and shown from there; a cover is fetched once per device. Only used where the proxy is in the way: browsers and the desktop app
 * already cache the server's immutable answers.
 */
const NAME = 'turbomusic-covers';
const LIMIT = 3000;
const key = (hash: string) => `https://covers.invalid/${hash}`;
const urls = new Map<string, Promise<string | null>>();
let trimmed = false;

async function trim(cache: Cache): Promise<void> {
  if (trimmed) return;
  trimmed = true;
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - LIMIT))) await cache.delete(k);
}

/** An object URL for the image, from this device's cache or fetched once (null on any failure: the caller shows the plain link). */
export function cachedImageUrl(hash: string): Promise<string | null> {
  const hit = urls.get(hash);
  if (hit) return hit;
  const p = (async () => {
    try {
      if (typeof caches === 'undefined') return null;
      const cache = await caches.open(NAME);
      let res = await cache.match(key(hash));
      if (!res) {
        const a = api();
        const fresh = await a.fetchLink(a.fileUrl(hash));
        if (!fresh.ok) return null;
        await cache.put(key(hash), fresh.clone());
        void trim(cache);
        res = fresh;
      }
      return URL.createObjectURL(await res.blob());
    } catch { return null; }
  })();
  urls.set(hash, p);
  void p.then((u) => { if (!u) urls.delete(hash); });
  return p;
}
