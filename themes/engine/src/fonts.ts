import { getStyle } from './catalog.ts';
import { options } from './options.ts';

const loaded = new Set<string>();

/**
 * Loads the @fontsource fonts a style's font stack names, from a CDN, the first time the style is used or previewed.
 * Apps that bundle their own fonts (so they work offline) start the engine with fonts: 'none'.
 */
export function ensureFonts(styleId: string) {
  const o = options();
  if (o.fonts !== 'cdn' || typeof document === 'undefined') return;
  for (const need of getStyle(styleId)?.fonts ?? []) {
    const files = [...need.weights.map((w) => `${w}`), ...(need.italic ?? []).map((w) => `${w}-italic`)];
    for (const f of files) {
      const href = `${o.fontsCdn}/@fontsource/${need.package}@5/${f}.css`;
      if (loaded.has(href)) continue;
      loaded.add(href);
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.turbothemesFont = need.package;
      document.head.appendChild(link);
    }
  }
}
