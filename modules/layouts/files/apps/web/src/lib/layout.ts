/**
 * Layouts decide where the app's pages are listed, independent of the colour theme and the UI style.
 * Applied as <html data-layout> (call applyLayout at start-up and whenever the setting changes); the CSS is src/layouts.css.
 * Optional: an app that wants one fixed layout needs none of this. The first entry is the default and needs no CSS.
 */
export type LayoutId = 'side' | 'floating' | 'rail' | 'floating-rail' | 'topbar' | 'dock';

export const LAYOUTS: { id: LayoutId; label: string; description: string }[] = [
  { id: 'side', label: 'Side bar', description: 'A full-height bar down the left edge.' },
  { id: 'floating', label: 'Floating side bar', description: 'The same side bar as a rounded panel that floats beside the page.' },
  { id: 'rail', label: 'Icon rail', description: 'A narrow bar of icons only.' },
  { id: 'floating-rail', label: 'Floating rail', description: 'A rounded pill of icons floating beside the page.' },
  { id: 'topbar', label: 'Top tabs', description: 'No side bar: every page is a tab along the top.' },
  { id: 'dock', label: 'Bottom dock', description: 'No side bar: the pages sit in a dock at the bottom, like on a phone.' },
];

export const isLayout = (id: unknown): id is LayoutId => LAYOUTS.some((l) => l.id === id);

export function applyLayout(id: unknown): LayoutId {
  const layout: LayoutId = isLayout(id) ? id : 'side';
  document.documentElement.dataset.layout = layout;
  return layout;
}
