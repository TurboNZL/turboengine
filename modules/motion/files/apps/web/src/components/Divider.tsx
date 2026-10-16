import { useRef } from 'react';
import { cn } from '../lib/cn.ts';

/**
 * The strip between the list and the open note: drag it left or right to change the widths (the arrow keys do too). It is invisible until the pointer is over it,
 * unless `lit` (the open note is not under the tag the list shows): then it is drawn in grey, so you can see the two do not belong together. Under the pointer it is green (the accent).
 * `onSize(x, box)` gets the pointer's x position and the box of the column it sits in.
 */
export function Divider({ side, lit, label, onSize }: { side: 'left' | 'right'; lit?: boolean; label: string; onSize: (clientX: number, box: DOMRect) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const move = (x: number) => { const box = el.current?.parentElement?.getBoundingClientRect(); if (box) onSize(x, box); };
  return (
    <div ref={el} role="separator" aria-orientation="vertical" aria-label={label} title={label} tabIndex={0}
      className={cn('group absolute top-0 z-20 hidden h-full w-3 cursor-col-resize touch-none select-none md:block', side === 'left' ? '-left-3.5' : '-right-3.5')}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); move(e.clientX); }}
      onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e.clientX); }}
      onKeyDown={(e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); const r = el.current!.getBoundingClientRect(); move(r.left + r.width / 2 + (e.key === 'ArrowLeft' ? -16 : 16)); } }}>
      <span aria-hidden className={cn('absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full transition-colors', lit ? 'bg-muted/70 group-hover:bg-accent group-focus-visible:bg-accent' : 'bg-transparent group-hover:bg-accent group-focus-visible:bg-accent')} />
    </div>
  );
}
