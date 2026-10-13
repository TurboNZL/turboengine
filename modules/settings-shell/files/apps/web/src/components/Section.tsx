import type { ReactNode } from 'react';

/** A titled panel (Settings uses one per topic). */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="card bt-panel space-y-4 p-5"><h2 className="bt-panel-title font-semibold">{title}</h2>{children}</section>;
}
