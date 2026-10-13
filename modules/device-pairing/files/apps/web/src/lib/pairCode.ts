/**
 * A pairing code carries what a new device needs to talk to the server: its address, the access token and the Cloudflare Access
 * service token (client id and secret) when there is one. It is made on a device that is already connected and entered (or opened as a link) on the new one.
 * The code IS the credentials: anyone who has it can read the library, so it should only be sent to yourself.
 */
export interface PairPayload { url: string; token: string; /** Cloudflare Access service token (client id and secret) */ access?: { id: string; secret: string } }

const PREFIX = 'CUR1-';

const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

export const encodePairCode = (p: PairPayload): string => PREFIX + b64(JSON.stringify({ u: p.url, t: p.token, ...(p.access?.id && p.access.secret ? { i: p.access.id, s: p.access.secret } : {}) }));

/** The payload of a code, or null when it is not one of ours or is damaged. Spaces and line breaks (from a messenger) are ignored. */
export function decodePairCode(raw: string): PairPayload | null {
  const code = raw.trim().replace(/\s+/g, '');
  if (!code.startsWith(PREFIX)) return null;
  try {
    const j = JSON.parse(unb64(code.slice(PREFIX.length))) as { u?: unknown; t?: unknown; i?: unknown; s?: unknown };
    if (typeof j.u !== 'string' || typeof j.t !== 'string' || !j.t) return null;
    const url = j.u.trim().replace(/\/+$/, '');
    if (url && !/^https?:\/\/[^\s/]+/i.test(url)) return null;
    return { url, token: j.t, ...(typeof j.i === 'string' && typeof j.s === 'string' && j.i && j.s ? { access: { id: j.i, secret: j.s } } : {}) };
  } catch { return null; }
}

/** A link that opens the web client at the server's address and applies the code (after asking). */
export const pairLink = (url: string, code: string) => `${url.replace(/\/+$/, '')}/?pair=${encodeURIComponent(code)}`;

/** The code in a page address (?pair=...), if any. */
export const pairFromSearch = (search: string): PairPayload | null => { const c = new URLSearchParams(search).get('pair'); return c ? decodePairCode(c) : null; };
