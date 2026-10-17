import { describe, expect, it } from 'vitest';
import { addClip, createClip, createProject } from '../src/core/timeline.ts';
import { ago, describeProject, hasContent, newestFirst, recentKey, MAX_RECENT } from '../src/app/recent.ts';
import { fontFamiliesUsed } from '../src/app/share.ts';

describe('recent projects', () => {
  it('an empty project is not worth listing; one with media or a clip is', () => {
    const p = createProject({ name: 'A', fps: 30 });
    expect(hasContent(p)).toBe(false);
    p.assets.a1 = { id: 'a1', name: 'x.mp4', ref: 'x.mp4', hasVideo: true, hasAudio: true, duration: 90, width: 1080, height: 1920 } as any;
    expect(hasContent(p)).toBe(true);
  });

  it('describes a project for the list: size, length in seconds, counts', () => {
    const p = createProject({ name: 'My short', fps: 30, width: 1920, height: 1080 });
    p.assets.a1 = { id: 'a1', name: 'x.mp4', ref: 'x.mp4', hasVideo: true, hasAudio: false, duration: 150, width: 1920, height: 1080 } as any;
    addClip(p, p.tracks[0]!.id, createClip('a1', 0, 150));
    const d = describeProject(p, 1234);
    expect(d).toMatchObject({ key: 'my short', name: 'My short', at: 1234, width: 1920, height: 1080, fps: 30, seconds: 5, clips: 1, media: 1 });
  });

  it('names match without regard to case, and a blank name is "untitled"', () => {
    expect(recentKey('  My Short ')).toBe('my short');
    expect(recentKey('   ')).toBe('untitled');
  });

  it('lists the newest first and keeps at most twelve', () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({ key: `k${i}`, name: `k${i}`, at: i, width: 1, height: 1, fps: 30, seconds: 1, clips: 0, media: 0 }));
    const out = newestFirst(rows);
    expect(out).toHaveLength(MAX_RECENT);
    expect(out[0]!.key).toBe('k19');
  });

  it('says how long ago in plain words', () => {
    const now = 10_000_000_000;
    expect(ago(now - 5_000, now)).toBe('just now');
    expect(ago(now - 5 * 60_000, now)).toBe('5 min ago');
    expect(ago(now - 3 * 3600_000, now)).toBe('3 hours ago');
    expect(ago(now - 26 * 3600_000, now)).toBe('yesterday');
    expect(ago(now - 5 * 24 * 3600_000, now)).toBe('5 days ago');
  });
});

describe('what a project needs when it is sent', () => {
  it('lists the fonts of the text layers, the caption style and the default font once each', () => {
    const p = createProject({ fps: 30 });
    const c = createClip('', 0, 30);
    c.text = { content: 'hi', style: { fontname: 'Squad' } as any, animation: {} as any };
    addClip(p, p.tracks[0]!.id, c);
    expect(fontFamiliesUsed(p, [{ fontname: 'Arial Black' }, { fontname: 'Squad' }], 'Arial Black').sort()).toEqual(['Arial Black', 'Squad']);
  });
});
