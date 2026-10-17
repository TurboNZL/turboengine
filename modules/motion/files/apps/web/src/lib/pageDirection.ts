import { useRef } from 'react';

/**
 * Which way a page should slide in: `tk-page-fwd` when the section you went to sits further along in the navigation than the one you left, `tk-page-back` when it sits before,
 * '' until the first change. Call it with the active section's position in the nav and put the result on the page wrapper:
 * `<div key={section} className={cn('tk-page', dir)}><Outlet /></div>`.
 * An app that keys the wrapper by the whole path (so detail pages animate too) passes that path as `key`: the direction then applies only to the page you
 * landed on, and opening a detail inside the same section gets no slide.
 * (From TurboKeep's Layout.tsx. The ref is written during render on purpose: the class must be right on the render that mounts the new page.)
 */
export function usePageDirection(index: number, key = ''): string {
  const last = useRef({ index, dir: '', key });
  if (last.current.index !== index) last.current = { index, dir: index > last.current.index ? 'tk-page-fwd' : 'tk-page-back', key };
  return last.current.key === key ? last.current.dir : '';
}
