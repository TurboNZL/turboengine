import { getStyle } from '../catalog.ts';

/**
 * Material "ink" ripple: a circle grows from the touch point over buttons, tabs and menu entries. It runs for the styles that list
 * the "ripple" effect, judged per element so a preview of such a style inside another still ripples. Done in script because the
 * point of touch cannot be known to CSS.
 */
const TARGET = '.btn, .bt-nav, .bt-tab, .bt-toplink';

const FLAG = '__turbothemesRipple';

export function startRipple() {
  if (typeof document === 'undefined') return;
  const doc = document as unknown as Record<string, boolean>;
  if (doc[FLAG]) return; // once per page, even if the module is loaded twice (hot reload)
  doc[FLAG] = true;
  document.addEventListener('pointerdown', (e) => {
    if (!(e.target instanceof Element)) return;
    const host = e.target.closest<HTMLElement>(TARGET);
    if (!host || (host as HTMLButtonElement).disabled) return;
    const ui = host.closest('[data-ui]')?.getAttribute('data-ui');
    if (!ui || !getStyle(ui)?.effects?.includes('ripple')) return;
    const r = host.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2.2;
    const dot = document.createElement('span');
    dot.className = 'bt-ripple';
    dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    host.appendChild(dot);
    dot.addEventListener('animationend', () => dot.remove(), { once: true });
  }, { capture: true, passive: true });
}
