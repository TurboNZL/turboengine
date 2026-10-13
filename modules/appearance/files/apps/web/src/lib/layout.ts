/**
 * Layouts decide where the app's pages are listed, independent of the colour theme and the UI style: any layout works with any look.
 * The layout is applied as <html data-layout> by lib/appearance.ts; the CSS is src/layouts.css and components/Layout.tsx reads it. Layouts belong to the app, not to turbothemes.
 */
export type LayoutId = 'side' | 'toolbar' | 'rail' | 'topbar' | 'dock';

export const LAYOUTS: { id: LayoutId; label: string; description: string }[] = [
  { id: 'side', label: 'Standard v2', description: 'Every page in a side bar, the search and Add in the bar above the page.' },
  { id: 'toolbar', label: 'Standard v1', description: 'The first version\'s arrangement: the library pages in the side bar, the rest (Journal, Rank, Queue, Stats…) as text links in a full-width toolbar with the search beside them, Settings as an icon.' },
  { id: 'rail', label: 'Icon rail', description: 'A narrow side bar of icons only (names show on hover) that leaves the page more width.' },
  { id: 'topbar', label: 'Top tabs', description: 'No side bar: every page is a tab along the top, next to the search. The page gets the full width.' },
  { id: 'dock', label: 'Bottom dock', description: 'No side bar: the pages sit in a floating dock at the bottom of the window, like on a phone.' },
];

export const isLayout = (id: unknown): id is LayoutId => LAYOUTS.some((l) => l.id === id);
