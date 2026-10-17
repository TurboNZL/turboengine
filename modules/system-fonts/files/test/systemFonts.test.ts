import { describe, expect, it } from 'vitest';
import { COMMON_FONTS, detectedFonts, detectSystemFonts, groupFonts, onFontsDetected, probeFonts } from '../src/app/systemFonts.ts';

describe('groupFonts', () => {
  it('makes one family of many faces, ignoring case, sorted by name', () => {
    const out = groupFonts([
      { family: 'Roboto', style: 'Bold' },
      { family: 'arial', style: 'Regular' },
      { family: 'Arial', style: 'Bold' },
      { family: 'Roboto', style: 'Regular' },
      { family: 'Roboto', style: 'Bold' },
      { family: ' ', style: 'x' },
    ]);
    expect(out).toEqual([
      { family: 'arial', styles: ['Regular', 'Bold'] },
      { family: 'Roboto', styles: ['Bold', 'Regular'] },
    ]);
  });
});

describe('detectSystemFonts', () => {
  it('uses the real list when the system can be asked', async () => {
    const seen: string[] = [];
    const stop = onFontsDetected((d) => seen.push(d.source));
    const d = await detectSystemFonts({ query: async () => [{ family: 'Caladea', style: 'Bold' }, { family: 'Carlito', style: 'Regular' }] });
    stop();
    expect(d.source).toBe('local-fonts');
    expect(d.fonts.map((f) => f.family)).toEqual(['Caladea', 'Carlito']);
    expect(detectedFonts()).toBe(d);
    expect(seen).toEqual(['local-fonts']);
  });

  it('falls back to well-known names, and says why, when the person refuses', async () => {
    const refuse = Object.assign(new Error('denied'), { name: 'NotAllowedError' });
    const d = await detectSystemFonts({ query: () => Promise.reject(refuse), available: (n) => n === 'Arial' || n === 'Verdana' });
    expect(d.source).toBe('probe');
    expect(d.fonts.map((f) => f.family)).toEqual(['Arial', 'Verdana']);
    expect(d.note).toMatch(/refused/);
  });

  it('does the same when the system answers with nothing', async () => {
    const d = await detectSystemFonts({ query: async () => [], available: (n) => n === 'Georgia' });
    expect(d.source).toBe('probe');
    expect(d.fonts.map((f) => f.family)).toEqual(['Georgia']);
  });

  it('never throws', async () => {
    const d = await detectSystemFonts({ query: () => Promise.reject(new Error('boom')), available: () => false });
    expect(d.fonts).toEqual([]);
    expect(d.note).toMatch(/boom/);
  });
});

describe('probeFonts', () => {
  it('lists only the names the test accepts, and the list has no duplicates', () => {
    expect(probeFonts(['A', 'B', 'a'], (n) => n.toLowerCase() === 'a').map((f) => f.family)).toEqual(['A']);
    expect(new Set(COMMON_FONTS.map((n) => n.toLowerCase())).size).toBe(COMMON_FONTS.length);
  });
});
