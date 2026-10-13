import { beforeAll, describe, expect, it } from 'vitest';
import builtin from 'virtual:builtin';
import { setCatalog } from '../engine/src/catalog.ts';
import { detectLook } from '../engine/src/device.ts';

const ua = {
  win: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
  samsung: 'Mozilla/5.0 (Linux; Android 15; SM-S938B) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36',
  pixel: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36',
  linux: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130 Safari/537.36',
  cros: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 Chrome/130 Safari/537.36',
};

beforeAll(() => setCatalog(builtin.catalog));

describe('the look that matches a device', () => {
  it('maps each operating system to its look', () => {
    expect(detectLook({ ua: ua.win, platform: 'Win32' })).toMatchObject({ ui: 'win11', dark: 'win11-dark' });
    expect(detectLook({ ua: ua.mac, platform: 'MacIntel', touchPoints: 0 })).toMatchObject({ ui: 'macos', light: 'macos' });
    expect(detectLook({ ua: ua.iphone, platform: 'iPhone' })).toMatchObject({ light: 'ios', dark: 'ios-dark' });
    expect(detectLook({ ua: ua.mac, platform: 'MacIntel', touchPoints: 5 })).toMatchObject({ light: 'ios' }); // an iPad asking for the desktop site
    expect(detectLook({ ua: ua.samsung, platform: 'Linux armv81' })).toMatchObject({ ui: 'oneui' });
    expect(detectLook({ ua: ua.pixel, platform: 'Linux armv81' })).toMatchObject({ ui: 'material' });
    expect(detectLook({ ua: ua.cros, platform: 'Linux x86_64' })).toMatchObject({ ui: 'material' });
  });
  it('tells Linux desktops apart when the app knows them', () => {
    expect(detectLook({ ua: ua.linux, platform: 'Linux x86_64' })).toMatchObject({ ui: 'gtk4', light: 'adwaita' });
    expect(detectLook({ ua: ua.linux, platform: 'Linux x86_64', desktopEnv: 'ubuntu:GNOME' })).toMatchObject({ ui: 'yaru' });
    expect(detectLook({ ua: ua.linux, platform: 'Linux x86_64', desktopEnv: 'KDE' })).toMatchObject({ ui: 'breeze', dark: 'breeze-dark' });
  });
  it('falls back to Standard v2', () => { expect(detectLook({ ua: '' })).toMatchObject({ ui: 'default' }); });
  it('follows the rules in the catalog, in order', () => {
    const rules = [
      { name: 'first', when: { ua: 'Foo' }, ui: 'a', light: 'b', dark: 'c' },
      { name: 'second', when: { all: [{ ua: 'Foo' }, { env: 'bar' }] }, ui: 'x', light: 'y', dark: 'z' },
    ];
    expect(detectLook({ ua: 'FooBrowser', desktopEnv: 'bar' }, rules).name).toBe('first');
    expect(detectLook({ ua: 'Baz' }, rules).name).toBe('Standard v2');
  });
});
