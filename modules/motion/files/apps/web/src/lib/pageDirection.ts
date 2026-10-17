import { useRef } from 'react';

/**
 * Which way a page should slide in: `tk-page-fwd` when the section you went to sits further along in the navigation than the one you left, `tk-page-back` when it sits before,
 * '' until the first change (and while you stay in the same section). Call it with the active section's position in the nav and put the result on the page wrapper:
 * `<div key={section} className={cn('tk-page', dir)}><Outlet /></div>`.
 * (From TurboKeep's Layout.tsx. The ref is written during render on purpose: the class must be right on the render that mounts the new page.)
 */
export function usePageDirection(index: number): string {
  const last = useRef({ index, dir: '' });
  if (last.current.index !== index) last.current = { index, dir: index > last.current.index ? 'tk-page-fwd' : 'tk-page-back' };
  return last.current.dir;
}
