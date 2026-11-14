import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, describe, expect, it } from 'vitest';
import { parseLink, pullShelf } from '../src/app/pull.ts';

const { Share } = createRequire(import.meta.url)('../electron/share.cjs');
const made: any[] = [];
afterEach(() => {
  while (made.length) made.pop().stop();
});
async function computer() {
  const s = new Share({ dir: mkdtempSync(join(tmpdir(), 'tcpull-')), name: 'Studio PC', version: '1', port: 0 });
  made.push(s);
  s.startDiscovery = async () => {};
  await s.start();
  return s;
}
async function put(s: any, parts: [string, string, Buffer][]) {
  const { id } = s.shelfOpen({ project: 'p', media: 0, fonts: 0, links: 2, bytes: 0 });
  for (const [kind, name, data] of parts) {
    const w = s.shelfPart(id, kind, name);
    await w.write(data);
    await w.end();
  }
  return s.shelfReady(id);
}

const T = 'abcdefghijklmnopqrstuv'; // a 22-character token

describe('the link pasted on a phone', () => {
  it('reads the address and token from the link, with a port or without, and from text around it', () => {
    expect(parseLink(`http://192.168.1.20:47903/shelf/${T}`)).toEqual({ base: 'http://192.168.1.20:47903', token: T });
    expect(parseLink(` http://192.168.1.20:5000/shelf/${T}/ `)).toEqual({ base: 'http://192.168.1.20:5000', token: T });
    expect(parseLink(`Here you go: http://studio.local/shelf/${T}\nthanks`)).toEqual({ base: 'http://studio.local:47903', token: T });
    for (const bad of ['', '192.168.1.20', `http://x:99999/shelf/${T}`, 'http://x/shelf/short', `http://x/other/${T}`, `ftp://x/shelf/${T}`]) expect(parseLink(bad), bad).toBeNull();
  });
});

describe('pulling a shelf', () => {
  it('brings the project, style, fonts and media across with progress', async () => {
    const pc = await computer();
    const video = Buffer.alloc(200_000, 3);
    const info = await put(pc, [['project', 'project.turbocut', Buffer.from('{"project":true}')], ['preset', 'style.json', Buffer.from('{"p":1}')], ['font', 'Squad.ttf', Buffer.from('FONT')], ['media', 'clip.mp4', video]]);
    const steps: number[] = [];
    const got = await pullShelf(`http://127.0.0.1:${info.port}/shelf/${info.token}`, { onProgress: (d, t) => steps.push(d / t) });
    expect(got.from).toBe('Studio PC');
    expect(got.project).toBe('{"project":true}');
    expect(got.preset).toBe('{"p":1}');
    expect(got.links).toBe(2);
    expect(got.fonts.map((f) => [f.name, f.size])).toEqual([['Squad.ttf', 4]]);
    expect(got.media.map((f) => [f.name, f.size])).toEqual([['clip.mp4', 200_000]]);
    expect(Buffer.from(await got.media[0]!.arrayBuffer()).equals(video)).toBe(true);
    expect(steps.at(-1)).toBe(1);
    // fetching tells the computer it is done, which closes the shelf
    expect(pc.shelves.size).toBe(0);
  });

  it('says what is wrong in words: a used link, a bad link, a computer that is not there', async () => {
    const pc = await computer();
    const info = await put(pc, [['project', 'p', Buffer.from('{}')]]);
    const wrong = info.token.replace(/^./, info.token[0] === 'a' ? 'b' : 'a');
    await expect(pullShelf(`http://127.0.0.1:${info.port}/shelf/${wrong}`)).rejects.toThrow(/already been used or has closed/);
    await expect(pullShelf('not a link')).rejects.toThrow(/not a TurboCut link/);
    await expect(pullShelf(`http://127.0.0.1:9/shelf/${T}`)).rejects.toThrow(/Could not reach/);
  });
});
