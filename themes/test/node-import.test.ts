import { describe, expect, it } from 'vitest';

// environment: node (no window, no document, no HTMLElement)
describe('importing the engine without a DOM', () => {
  it('works, so server-side code and plain Node tests can import an app that uses it', async () => {
    const t = await import('../engine/src/index.ts');
    expect(typeof t.start).toBe('function');
    expect(() => t.definePicker()).not.toThrow();
  });
});
