/**
 * A pairing code carries what a new device needs to talk to the server: its address, an access token and, when the server sits behind Cloudflare
 * Access, the service token's client id and secret (they become the CF-Access-Client-Id / -Secret headers on the new device). It is made on a device
 * that is already connected and entered (or opened as a link) on the new one.
 * The code IS the credentials: anyone who has it can read the library, so it should only be sent to yourself.
 *
 * `createPairCodec('XXX1-')` makes the codec for an app (its own prefix, so one app's code is never taken for another's). TurboMusic's `CUR1-` codec
 * is exported under the old names so the first app's files did not have to change.
 */
export interface PairPayload { url: string; token: string; /** Cloudflare Access service token (client id and secret) */ access?: { id: string; secret: string } }

const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

export interface PairCodec {
  prefix: string;
  encode(p: PairPayload): string;
  /** The payload of a code, or null when it is not one of ours or is damaged. Spaces and line breaks (from a messenger) are ignored. */
  decode(raw: string): PairPayload | null;
  /** A link that opens the web client at the server's address and applies the code (after asking). */
  link(url: string, code: string): string;
  /** The code in a page address (?pair=...), if any. */
  fromSearch(search: string): PairPayload | null;
  /** Is there a ?pair= in the address at all (valid or not)? */
  hasPair(search: string): boolean;
}

export function createPairCodec(prefix: string): PairCodec {
  const decode = (raw: string): PairPayload | null => {
    const code = raw.trim().replace(/\s+/g, '');
    if (!code.startsWith(prefix)) return null;
    try {
      const j = JSON.parse(unb64(code.slice(prefix.length))) as { u?: unknown; t?: unknown; i?: unknown; s?: unknown };
      if (typeof j.u !== 'string' || typeof j.t !== 'string' || !j.t) return null;
      const url = j.u.trim().replace(/\/+$/, '');
      if (url && !/^https?:\/\/[^\s/]+/i.test(url)) return null;
      return { url, token: j.t, ...(typeof j.i === 'string' && typeof j.s === 'string' && j.i && j.s ? { access: { id: j.i, secret: j.s } } : {}) };
    } catch { return null; }
  };
  return {
    prefix,
    encode: (p) => prefix + b64(JSON.stringify({ u: p.url, t: p.token, ...(p.access?.id && p.access.secret ? { i: p.access.id, s: p.access.secret } : {}) })),
    decode,
    link: (url, code) => `${url.replace(/\/+$/, '')}/?pair=${encodeURIComponent(code)}`,
    fromSearch: (search) => { const c = new URLSearchParams(search).get('pair'); return c ? decode(c) : null; },
    hasPair: (search) => new URLSearchParams(search).has('pair'),
  };
}

// TurboMusic's own codec, under the names it always had
export const curatorCodec = createPairCodec('CUR1-');
export const encodePairCode = curatorCodec.encode;
export const decodePairCode = curatorCodec.decode;
export const pairLink = curatorCodec.link;
export const pairFromSearch = curatorCodec.fromSearch;
