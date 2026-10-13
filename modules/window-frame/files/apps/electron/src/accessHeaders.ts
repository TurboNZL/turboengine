/**
 * Cloudflare Access service token for the server this app syncs with. `<audio>`, `<img>` and the event stream cannot send headers, so
 * without this the page had to download every track whole (fetch + blob) before it could play: ~5 s for a normal song over a tunnel.
 * The main process adds the two headers to every request to that server's address instead, so the browser streams with Range requests.
 */
export interface AccessRule { origin: string; id: string; secret: string }

/** The rule for a server address and token, or null when either is missing or the address is not an http(s) URL. */
export function makeRule(serverUrl: unknown, id: unknown, secret: unknown): AccessRule | null {
  if (typeof serverUrl !== 'string' || typeof id !== 'string' || typeof secret !== 'string') return null;
  if (!id.trim() || !secret.trim()) return null;
  try { const u = new URL(serverUrl); return /^https?:$/.test(u.protocol) ? { origin: u.origin, id: id.trim(), secret: secret.trim() } : null; } catch { return null; }
}

/** The request headers with the service token added when `url` is on the rule's origin (and the request carries none of its own). */
export function withAccess(rule: AccessRule | null, url: string, headers: Record<string, string | string[]>): Record<string, string | string[]> {
  if (!rule) return headers;
  let origin: string;
  try { origin = new URL(url).origin; } catch { return headers; }
  if (origin !== rule.origin) return headers;
  const has = (n: string) => Object.keys(headers).some((k) => k.toLowerCase() === n);
  return { ...headers, ...(has('cf-access-client-id') ? {} : { 'CF-Access-Client-Id': rule.id }), ...(has('cf-access-client-secret') ? {} : { 'CF-Access-Client-Secret': rule.secret }) };
}
