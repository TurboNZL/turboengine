import { api } from './store.ts';

/**
 * A server behind Cloudflare Access wants the service token as a header, and `<img src>` / `<audio src>` cannot send headers.
 * On the server's own address Access answers the first headered request with a cookie that the elements then send by themselves.
 * From another origin (the Android app's page, a desktop app) there is no such cookie, so the file is fetched with the headers
 * and handed to the element as a blob URL. Kept in a small memory cache so a cover is fetched once.
 */
const made = new Map<string, Promise<string>>();
const ORDER: string[] = [];
const LIMIT = 150;

/** An uncached copy (audio: big, and the caller revokes the URL when it is done). */
export async function freshBlobUrlViaHeaders(hash: string): Promise<string> {
  const res = await api().fetchLink(api().fileUrl(hash));
  if (!res.ok) throw new Error(`Server said ${res.status}`);
  return URL.createObjectURL(await res.blob());
}

export function blobUrlViaHeaders(hash: string, keep = LIMIT): Promise<string> {
  const hit = made.get(hash);
  if (hit) return hit;
  const p = (async () => {
    const res = await api().fetchLink(api().fileUrl(hash));
    if (!res.ok) throw new Error(`Server said ${res.status}`);
    return URL.createObjectURL(await res.blob());
  })();
  made.set(hash, p);
  ORDER.push(hash);
  p.catch(() => made.delete(hash));
  while (ORDER.length > keep) { const old = ORDER.shift()!; const q = made.get(old); made.delete(old); void q?.then((u) => URL.revokeObjectURL(u), () => undefined); }
  return p;
}
