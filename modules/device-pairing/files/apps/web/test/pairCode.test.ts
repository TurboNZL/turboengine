import { describe, expect, it } from 'vitest';
import { createPairCodec, decodePairCode, encodePairCode, pairFromSearch, pairLink } from '../src/lib/pairCode.ts';
import { consumePairLink } from '../src/lib/applyPairLink.ts';
import { accessHeaders, withAccess } from '../src/lib/accessHeaders.ts';

describe('pairing code', () => {
  it('round-trips, also with non-ASCII', () => {
    const p = { url: 'https://music.example.com', token: 'tok/+=é' };
    expect(decodePairCode(encodePairCode(p))).toEqual(p);
    expect(decodePairCode(encodePairCode({ url: '', token: 'x' }))).toEqual({ url: '', token: 'x' });
  });
  it('carries a Cloudflare Access service token when there is one', () => {
    const p = { url: 'https://m.example.com', token: 't', access: { id: 'abc.access', secret: 'shh' } };
    expect(decodePairCode(encodePairCode(p))).toEqual(p);
    expect(decodePairCode(encodePairCode({ url: '', token: 't', access: { id: '', secret: 'x' } }))).toEqual({ url: '', token: 't' });
  });
  it('survives line breaks and spaces added by a messenger, and a trailing slash', () => {
    const c = encodePairCode({ url: 'http://pi:47813/', token: 'abc' });
    expect(decodePairCode(` ${c.slice(0, 12)}\n${c.slice(12)} `)).toEqual({ url: 'http://pi:47813', token: 'abc' });
  });
  it('rejects anything else', () => {
    for (const bad of ['', 'hello', 'CUR1-', 'CUR1-###', 'CUR1-' + btoa('{"u":"ftp://x","t":"a"}'), 'CUR1-' + btoa('{"u":"http://x"}'), 'CUR1-' + btoa('{"u":"javascript:1","t":"a"}')]) expect(decodePairCode(bad)).toBeNull();
  });
  it('a link carries the code and is read back from the query', () => {
    const c = encodePairCode({ url: 'https://m.example.com', token: 't' });
    const link = pairLink('https://m.example.com/', c);
    expect(link.startsWith('https://m.example.com/?pair=')).toBe(true);
    expect(pairFromSearch(new URL(link).search)).toEqual({ url: 'https://m.example.com', token: 't' });
    expect(pairFromSearch('?x=1')).toBeNull();
  });
  it('each app has its own prefix: one app\'s code is never taken for another\'s', () => {
    const keep = createPairCodec('KEEP1-');
    const code = keep.encode({ url: 'https://k.example.com', token: 't', access: { id: 'i', secret: 's' } });
    expect(code.startsWith('KEEP1-')).toBe(true);
    expect(keep.decode(code)).toEqual({ url: 'https://k.example.com', token: 't', access: { id: 'i', secret: 's' } });
    expect(decodePairCode(code)).toBeNull();
    expect(keep.decode(encodePairCode({ url: '', token: 'x' }))).toBeNull();
  });
});

describe('opening a pairing link', () => {
  const codec = createPairCodec('KEEP1-');
  const run = (search: string, answer: boolean, origin = 'https://k.example.com') => {
    const log: { applied: unknown[]; stripped: number; asked: string[] } = { applied: [], stripped: 0, asked: [] };
    const r = consumePairLink({ codec, search, origin, confirm: (m) => { log.asked.push(m); return answer; }, apply: (p) => log.applied.push(p), strip: () => { log.stripped++; } });
    return { r, log };
  };
  const q = (code: string) => `?pair=${encodeURIComponent(code)}&x=1`;
  it('does nothing when there is no code', () => expect(run('?x=1', true)).toEqual({ r: 'none', log: { applied: [], stripped: 0, asked: [] } }));
  it('asks, applies, and always removes the code from the address', () => {
    const a = run(q(codec.encode({ url: 'https://other.example.com', token: 't' })), true);
    expect(a.r).toBe('applied'); expect(a.log.asked[0]).toContain('https://other.example.com'); expect(a.log.applied).toEqual([{ url: 'https://other.example.com', token: 't' }]); expect(a.log.stripped).toBe(1);
    const b = run(q(codec.encode({ url: 'https://other.example.com', token: 't' })), false);
    expect(b.r).toBe('refused'); expect(b.log.applied).toEqual([]); expect(b.log.stripped).toBe(1);
    const c = run(q('nonsense'), true);
    expect(c.r).toBe('invalid'); expect(c.log.asked).toEqual([]); expect(c.log.stripped).toBe(1);
  });
  it('a code for the page\'s own address is applied without an address (same origin needs none)', () => {
    expect(run(q(codec.encode({ url: 'https://k.example.com', token: 't', access: { id: 'i', secret: 's' } })), true).log.applied).toEqual([{ url: '', token: 't', access: { id: 'i', secret: 's' } }]);
  });
});

describe('Cloudflare Access headers', () => {
  it('only when both parts are set, trimmed', () => {
    expect(accessHeaders({ cfAccessId: ' a ', cfAccessSecret: ' b ' })).toEqual({ 'CF-Access-Client-Id': 'a', 'CF-Access-Client-Secret': 'b' });
    expect(accessHeaders({ cfAccessId: 'a' })).toEqual({});
    expect(accessHeaders({})).toEqual({});
  });
  it('are added to a request without overriding the caller\'s own headers', () => {
    const init = withAccess({ cfAccessId: 'a', cfAccessSecret: 'b' }, { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Access-Client-Id': 'mine' } });
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({ 'CF-Access-Client-Id': 'mine', 'CF-Access-Client-Secret': 'b', 'Content-Type': 'application/json' });
  });
});
