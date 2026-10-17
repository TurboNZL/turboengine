import { useEffect, useState } from 'react';

/** Milliseconds of a CSS time variable on <html> ("260ms", "0.3s"), so an exit animation lasts as long as the active UI style says. */
export function cssMs(name: string, fallback = 0): number {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return fallback;
  return v.endsWith('ms') ? n : v.endsWith('s') ? n * 1000 : n;
}

/**
 * Keeps something mounted while its exit animation runs. `leaving` is true during that time, so the element can
 * switch to the style's "out" animation; `mounted` is false once it is really gone.
 */
export function usePresence(show: boolean, msVar = '--pop-ms') {
  const [mounted, setMounted] = useState(show);
  useEffect(() => {
    if (show) { setMounted(true); return; }
    const t = setTimeout(() => setMounted(false), cssMs(msVar, 200));
    return () => clearTimeout(t);
  }, [show, msVar]);
  return { mounted: show || mounted, leaving: !show && mounted };
}
