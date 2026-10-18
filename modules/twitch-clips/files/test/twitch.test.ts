import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { clipFileName, clipRequestBody, downloadClip, parseClipResponse, parseClipSlug, resolveClip, TWITCH_SHARE_HASH } from '../src/twitch/clip.ts';

const cjs = createRequire(import.meta.url)('../electron/twitch.cjs');

// The shape yt-dlp reads from Twitch's `ShareClipRenderStatus` answer: assets[0] is landscape, assets[1] the portrait version.
const answer = () => [
  {
    data: {
      clip: {
        id: 'abc',
        title: 'Clutch: 1v4 / wow?',
        durationSeconds: 28,
        playbackAccessToken: { signature: 'SIG123', value: '{"a":1}' },
        assets: [
          { aspectRatio: 1.7778, videoQualities: [{ quality: '360', frameRate: 30, sourceURL: 'https://cdn.example/clip-360.mp4' }, { quality: '1080', frameRate: 60, sourceURL: 'https://cdn.example/clip-1080.mp4' }, { quality: '720', frameRate: 60, sourceURL: 'https://cdn.example/clip-720.mp4' }] },
          { aspectRatio: 0.5625, videoQualities: [{ quality: '1080', frameRate: 30, sourceURL: 'https://cdn.example/portrait-1080.mp4' }] },
        ],
      },
    },
  },
];

describe('twitch clips', () => {
  it('reads clip links in every shape', () => {
    expect(parseClipSlug('https://clips.twitch.tv/FunnyClipSlug-abc123')).toBe('FunnyClipSlug-abc123');
    expect(parseClipSlug('https://www.twitch.tv/somebody/clip/FunnyClipSlug-abc123?filter=clips')).toBe('FunnyClipSlug-abc123');
    expect(parseClipSlug('not a link at all!')).toBeNull();
  });

  it('asks for the persisted query the web player uses', () => {
    const body = JSON.parse(clipRequestBody('slug1234'));
    expect(body[0].operationName).toBe('ShareClipRenderStatus');
    expect(body[0].variables).toEqual({ slug: 'slug1234' });
    expect(body[0].extensions.persistedQuery.sha256Hash).toBe(TWITCH_SHARE_HASH);
  });

  for (const [name, parse] of [['page', parseClipResponse], ['desktop shell', cjs.parseClipResponse]] as const) {
    it(`${name}: picks the best LANDSCAPE rendition and signs its address`, () => {
      const c = parse('slug1234', answer());
      const u = new URL(c.url);
      expect(u.origin + u.pathname).toBe('https://cdn.example/clip-1080.mp4'); // not the portrait asset, not 720
      expect(u.searchParams.get('sig')).toBe('SIG123');
      expect(u.searchParams.get('token')).toBe('{"a":1}');
      expect([c.width, c.height, c.fps, c.durationSec]).toEqual([1920, 1080, 60, 28]);
      expect(c.title).toBe('Clutch: 1v4 / wow?');
    });
    it(`${name}: says what went wrong in plain words`, () => {
      expect(() => parse('x', [{ data: { clip: null } }])).toThrow(/no clip with that link/);
      expect(() => parse('x', [{ errors: [{ message: 'PersistedQueryNotFound' }] }])).toThrow(/Twitch refused/);
      const noToken = answer();
      noToken[0]!.data.clip.playbackAccessToken = null as any;
      expect(() => parse('x', noToken)).toThrow(/try again shortly/);
      const noFiles = answer();
      noFiles[0]!.data.clip.assets = [];
      expect(() => parse('x', noFiles)).toThrow(/no video file/);
    });
  }

  it('names the file after the clip without characters a file system refuses', () => {
    expect(clipFileName({ title: 'Clutch: 1v4 / wow?', slug: 's' })).toBe('Clutch 1v4 wow.mp4');
    expect(clipFileName({ title: '???', slug: 'FunnySlug' })).toBe('FunnySlug.mp4');
    expect(cjs.clipFileName({ title: 'a/b', slug: 's' })).toBe('a b.mp4');
  });

  it('resolves and downloads through fetch, with progress, in the page and the shell', async () => {
    const bytes = new Uint8Array(1000).map((_, i) => i % 251);
    const fake = (async (url: string, init?: RequestInit) => {
      if (String(url).includes('gql.twitch.tv')) {
        expect((init?.headers as Record<string, string>)['Client-ID']).toBeTruthy();
        return new Response(JSON.stringify(answer()), { status: 200 });
      }
      expect(String(url)).toContain('sig=SIG123');
      return new Response(new Blob([bytes]).stream(), { status: 200, headers: { 'content-length': '1000' } });
    }) as unknown as typeof fetch;
    const clip = await resolveClip('slug1234', fake);
    const seen: (number | undefined)[] = [];
    const file = await downloadClip(clip, (f) => seen.push(f), fake);
    expect(file.name).toBe('Clutch 1v4 wow.mp4');
    expect(file.size).toBe(1000);
    expect(seen.at(-1)).toBe(1);
    const shell = await cjs.downloadClip('slug1234', { fetchImpl: fake });
    expect(shell.bytes.length).toBe(1000);
    expect(shell.name).toBe('Clutch 1v4 wow.mp4');
  });

  it('a blocked or failed request becomes a sentence, and a cancel stays a cancel', async () => {
    await expect(resolveClip('slug1234', (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch)).rejects.toThrow(/desktop app/);
    await expect(resolveClip('slug1234', (async () => new Response('', { status: 429 })) as unknown as typeof fetch)).rejects.toThrow(/429/);
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(resolveClip('slug1234', (async () => { throw new DOMException('x', 'AbortError'); }) as unknown as typeof fetch, ctrl.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });
});
