import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';

const { Share, isLocalAddress, safeName, broadcastAddresses } = createRequire(import.meta.url)('../electron/share.cjs');

const made: any[] = [];
async function device(name: string) {
  const s = new Share({ dir: mkdtempSync(join(tmpdir(), 'tcshare-')), name, version: '1.0.0', port: 0 });
  made.push(s);
  // port 0: a free port; start() listens, the discovery socket is left out (no network in tests)
  s.startDiscovery = async () => {};
  await s.start();
  return s;
}
afterEach(() => {
  while (made.length) made.pop().stop();
});

/** A sees B exactly as an announcement on the network would make it. */
const introduce = (a: any, b: any) => a.hear(Buffer.from(JSON.stringify({ app: 'turbocut', v: 1, id: b.id, name: b.name, port: b.port, version: b.version })), '127.0.0.1');

async function send(a: any, b: any, parts: { kind: string; name: string; data: Buffer }[], bytes?: number) {
  const { dev, transfer } = await a.offer(b.id, { project: 'My short', media: 1, fonts: 0, bytes: bytes ?? parts.reduce((n, p) => n + p.data.length, 0) });
  for (const p of parts) {
    const w = a.openPart(dev, transfer, p.kind, p.name);
    for (let i = 0; i < p.data.length; i += 4096) await w.write(p.data.subarray(i, i + 4096));
    await w.end();
  }
  await a.finish(dev, transfer);
}

describe('finding devices', () => {
  it('only addresses on the local network count', () => {
    for (const ok of ['192.168.1.20', '10.0.0.5', '172.16.4.4', '172.31.255.1', '127.0.0.1', '169.254.1.1', '::1', 'fe80::1', '::ffff:192.168.0.9']) expect(isLocalAddress(ok), ok).toBe(true);
    for (const bad of ['8.8.8.8', '172.32.0.1', '172.15.0.1', '1.1.1.1', '', undefined]) expect(isLocalAddress(bad), String(bad)).toBe(false);
  });

  it('lists announcements from others, ignores itself, strangers and public addresses, and forgets silent devices', async () => {
    const a = await device('Desktop');
    const b = await device('Laptop');
    let changes = 0;
    a.on('devices', () => changes++);
    introduce(a, b);
    introduce(a, a); // itself
    a.hear(Buffer.from('{"app":"other","id":"x","port":1}'), '192.168.1.5');
    a.hear(Buffer.from('not json'), '192.168.1.5');
    a.hear(Buffer.from(JSON.stringify({ app: 'turbocut', id: 'far', name: 'Far', port: 47903 })), '8.8.8.8');
    expect(a.devices().map((d: any) => d.name)).toEqual(['Laptop']);
    introduce(a, b); // the same device again: not a change
    expect(changes).toBe(1);
    a.expire(Date.now() + 11_000);
    expect(a.devices()).toEqual([]);
  });

  it('works out the broadcast address of each network', () => {
    const list = broadcastAddresses({ eth0: [{ family: 'IPv4', address: '192.168.1.23', netmask: '255.255.255.0', internal: false }], lo: [{ family: 'IPv4', address: '127.0.0.1', netmask: '255.0.0.0', internal: true }] });
    expect(list).toContain('192.168.1.255');
    expect(list).toContain('255.255.255.255');
    expect(list).not.toContain('127.255.255.255');
  });
});

describe('sending a project', () => {
  it('nothing is stored until the other person accepts; then everything arrives, byte for byte', async () => {
    const a = await device('Desktop');
    const b = await device('Laptop');
    introduce(a, b);
    let seen: any;
    b.on('offer', (o: any) => {
      seen = o;
      expect(readdirSync(b.dir)).toEqual([]); // nothing written yet
      b.answer(o.offerId, true);
    });
    const got = new Promise<any>((r) => b.on('received', r));
    const video = Buffer.from(Array.from({ length: 100_000 }, (_, i) => i % 256));
    await send(a, b, [
      { kind: 'project', name: 'project.turbocut', data: Buffer.from('{"project":1}') },
      { kind: 'media', name: 'clip.mp4', data: video },
      { kind: 'font', name: 'Squad.ttf', data: Buffer.from('FONT') },
    ]);
    const r = await got;
    expect(seen.from.name).toBe('Desktop');
    expect(seen.summary).toMatchObject({ project: 'My short', media: 1, bytes: 100_000 + 13 + 4 });
    expect(r.project).toBe('{"project":1}');
    expect(r.media.map((m: any) => m.name)).toEqual(['clip.mp4']);
    expect(Buffer.compare(readFileSync(r.media[0].path), video)).toBe(0);
    expect(r.fonts.map((f: any) => f.name)).toEqual(['Squad.ttf']);
  });

  it('a declined offer sends nothing and says so', async () => {
    const a = await device('Desktop');
    const b = await device('Laptop');
    introduce(a, b);
    b.on('offer', (o: any) => b.answer(o.offerId, false));
    await expect(send(a, b, [{ kind: 'project', name: 'p', data: Buffer.from('{}') }])).rejects.toThrow(/Laptop did not accept/);
    expect(readdirSync(b.dir)).toEqual([]);
  });

  it('a device with nobody to ask declines at once, and an unknown device is an error', async () => {
    const a = await device('Desktop');
    const b = await device('Laptop');
    introduce(a, b);
    await expect(send(a, b, [{ kind: 'project', name: 'p', data: Buffer.from('{}') }])).rejects.toThrow(/did not accept/);
    await expect(a.offer('nope', { project: 'x', media: 0, fonts: 0, bytes: 0 })).rejects.toThrow(/no longer on the network/);
  });

  it('a part larger than the offer is refused, and a file name cannot escape its folder', async () => {
    const a = await device('Desktop');
    const b = await device('Laptop');
    introduce(a, b);
    b.on('offer', (o: any) => b.answer(o.offerId, true));
    await expect(send(a, b, [{ kind: 'media', name: 'big.bin', data: Buffer.alloc(3 * 1024 * 1024) }], 10)).rejects.toThrow();
    expect(safeName('../../etc/passwd')).toBe('passwd');
    expect(safeName('..\\..\\win.ini')).toBe('_.._win.ini');
    expect(safeName('')).toBe('file');
    expect(safeName('.hidden')).toBe('hidden');
    const c = await device('Third');
    introduce(a, c);
    c.on('offer', (o: any) => c.answer(o.offerId, true));
    const got = new Promise<any>((r) => c.on('received', r));
    await send(a, c, [{ kind: 'project', name: '../../../escape.turbocut', data: Buffer.from('{}') }, { kind: 'media', name: '../../x.mp4', data: Buffer.from('x') }]);
    const r = await got;
    expect(r.media[0].path.startsWith(c.dir)).toBe(true);
    expect(r.media[0].name).toBe('x.mp4');
  });

  it('closing a transfer without the project is an error', async () => {
    const a = await device('Desktop');
    const b = await device('Laptop');
    introduce(a, b);
    b.on('offer', (o: any) => b.answer(o.offerId, true));
    await expect(send(a, b, [{ kind: 'media', name: 'x.mp4', data: Buffer.from('x') }])).rejects.toThrow(/project itself did not arrive/);
  });
});
