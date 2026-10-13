import type { DeviceCond, DeviceInfo, DeviceLook, DeviceRule } from './types.ts';
import { config } from './catalog.ts';

const re = (pattern: string, value: string) => new RegExp(pattern, 'i').test(value);

function matches(c: DeviceCond, d: DeviceInfo): boolean {
  if (c.ua !== undefined && !re(c.ua, d.ua ?? '')) return false;
  if (c.platform !== undefined && !re(c.platform, d.platform ?? '')) return false;
  if (c.env !== undefined && !re(c.env, d.desktopEnv ?? '')) return false;
  if (c.minTouchPoints !== undefined && (d.touchPoints ?? 0) < c.minTouchPoints) return false;
  if (c.all && !c.all.every((x) => matches(x, d))) return false;
  if (c.any && !c.any.some((x) => matches(x, d))) return false;
  return true;
}

/**
 * The look that matches the device: the "Match this device" choice resolves to this. Browsers only reveal the operating system, so which
 * look an OS gets is decided by the rules in themes/config.json (first match wins). Pure, so it can be tested.
 */
export function detectLook(d: DeviceInfo, rules: DeviceRule[] = config().devices): DeviceLook {
  for (const r of rules) if (matches(r.when, d)) return { ui: r.ui, light: r.light, dark: r.dark, name: r.name };
  return { ...config().fallbackDevice };
}

let cached: DeviceLook | null = null;
let hostInfo: Partial<DeviceInfo> = {};

/** Apps that know more than the browser (the Linux desktop environment, say) can tell the engine. */
export function setHostInfo(info: Partial<DeviceInfo>) { hostInfo = info; cached = null; }

/** The look of the device this page runs on. */
export function deviceLook(): DeviceLook {
  if (cached) return cached;
  if (typeof navigator === 'undefined') return detectLook({ ua: '' });
  cached = detectLook({ ua: navigator.userAgent, platform: navigator.platform, touchPoints: navigator.maxTouchPoints, ...hostInfo });
  return cached;
}
export const resetDeviceLook = () => { cached = null; };

export const prefersDark = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;

/** Resolves "auto" in the style setting to a real style. */
export const effectiveUi = (ui: string): string => (ui === 'auto' ? deviceLook().ui : ui);
/** Resolves "auto" in the colour setting to a real palette (light or dark by the device's setting). */
export const effectiveTheme = (theme: string): string => { if (theme !== 'auto') return theme; const l = deviceLook(); return prefersDark() ? l.dark : l.light; };
