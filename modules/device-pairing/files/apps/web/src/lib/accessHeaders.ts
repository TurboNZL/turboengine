/**
 * The two headers a server behind Cloudflare Access wants on every request: the service token's client id and secret. Put them on every API call
 * the page makes (and on the few `fetch`es of server links); same-origin, Access answers a headered request with a `CF_Authorization` cookie that
 * `<img>`/`<audio>` then send by themselves. See `cloudflare-access` for the clients that cannot send headers (another origin, desktop, Android).
 * The server's CORS must allow them: `cors({ allowHeaders: ['Authorization', 'Content-Type', 'CF-Access-Client-Id', 'CF-Access-Client-Secret'] })`.
 */
export interface AccessSettings { cfAccessId?: string; cfAccessSecret?: string }

export const accessHeaders = (s: AccessSettings): Record<string, string> =>
  s.cfAccessId?.trim() && s.cfAccessSecret?.trim() ? { 'CF-Access-Client-Id': s.cfAccessId.trim(), 'CF-Access-Client-Secret': s.cfAccessSecret.trim() } : {};

/** `fetch` options with the service token's headers added (the caller's own headers win). */
export const withAccess = (s: AccessSettings, init: RequestInit = {}): RequestInit => ({ ...init, headers: { ...accessHeaders(s), ...(init.headers as Record<string, string> | undefined) } });
