import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

/**
 * Minimal app shell the layouts in src/layouts.css expect. Copy it and put your pages in `pages`; keep the hook classes
 * (bt-frame, bt-side, bt-brand, bt-nav, bt-label-text, bt-pane, bt-tabbar, bt-tab): the themes and the layouts style those names.
 * Utility classes on an element beat the layouts' variable-driven rules, so the side bar carries only what it needs (no rounded-*, border-*, shadow-*).
 */
export type Page = { to: string; label: string; icon: ReactNode };

export function AppShell({ name, logo, pages }: { name: string; logo: string; pages: Page[] }) {
  return (
    <div className="flex h-full flex-col">
      <div className="bt-frame flex min-h-0 flex-1">
        <aside className="bt-side hidden w-56 shrink-0 flex-col gap-1 p-3 md:flex">
          <div className="bt-brand mb-3 flex items-center gap-2.5 px-3 pt-1 text-lg font-bold tracking-tight">
            <img src={logo} alt="" width={26} height={26} className="shrink-0" draggable={false} />
            <span className="bt-label-text">{name}</span>
          </div>
          {pages.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} title={label} className="bt-nav flex items-center gap-3 px-3 py-2 text-sm font-medium">
              {icon}<span className="bt-label-text">{label}</span>
            </NavLink>
          ))}
        </aside>
        <main className="bt-pane min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6"><Outlet /></main>
      </div>
      {/* phone tabs; the "dock" layout shows them on wide windows too (layouts.css) */}
      <nav className="bt-tabbar flex md:hidden">
        {pages.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} className="bt-tab flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]">{icon}{label}</NavLink>
        ))}
      </nav>
    </div>
  );
}
