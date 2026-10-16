import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react';

/** Browsers that can size a text box to its text by themselves (Chrome, Edge, Safari 26); the others are measured below. */
const native = typeof CSS !== 'undefined' && CSS.supports?.('field-sizing', 'content');

/**
 * A text box that is as tall as its text (one line when empty, as many as the text needs when it is not) instead of a fixed height. Used for titles,
 * which may have several lines, and for descriptions, which should not be huge until you type more.
 */
export const AutoText = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }>(function AutoText({ value, className, style, ...rest }, ref) {
  const el = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => el.current!);
  useLayoutEffect(() => {
    const t = el.current;
    if (!t || native) return;
    const fit = () => {
      // shrinking to measure would scroll the page when the box is at its bottom: put the scroll back
      const scroller = t.closest('main'), top = scroller?.scrollTop ?? 0;
      t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`;
      if (scroller) scroller.scrollTop = top;
    };
    fit();
    const ro = new ResizeObserver(() => { if (t.clientWidth !== Number(t.dataset.w)) { t.dataset.w = String(t.clientWidth); fit(); } }); // wrapping changes with the width
    ro.observe(t);
    return () => ro.disconnect();
  }, [value]);
  return <textarea ref={el} rows={1} value={value} className={className} style={{ ...style, fieldSizing: 'content' } as never} {...rest} />;
});
