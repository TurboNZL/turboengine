# Motion: one animation language

Arrive, swap, slide-in, pop, expand and the finish animation as plain CSS classes, the hook that gives only what is NEW the arrive class, a draggable divider and a text box that sizes itself.

Optional. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbokeep`, branch `claude/notes-ui-ux-improvements-lc6qs1` (where it runs).

## The rule
**Every change on screen uses the same few motions, and they are decided by what happened, not by which component it is.**
| Class | Use it when |
|---|---|
| `.tk-arrive` | something NEW slots into a list: a tag, an item that came in from the server after the page drew from its cached copy, a new item you just made |
| `.tk-page` + `-fwd` / `-back` | the user switched tab/page in the main navigation: the new page slides in from the side it sits on (right if it is further along in the nav, left if before). `const dir = usePageDirection(activeIndex)`, then `<div key={section} className={cn('tk-page', dir)}>`. Key by the SECTION (`/albums`), not the whole path, so opening a detail inside a section does not slide. |
| `.tk-swap` | a list was replaced by another (another tag, tab, page): wrap the list in `<div key={filterKey} className="tk-swap">`, but not for the first list drawn |
| `.tk-slide-in` | a panel comes in from the side (the editor beside the list): `key` it by the thing shown |
| `.tk-pop` | a window opens (put it on the `.bt-window` of the dialog) |
| `.tk-expand` | something opens up in place (an item's details) |
| `data-arming` | a single click is waiting to see whether it becomes a double click: a soft ring on the card, then the thing opens |
`useArrivals(keys)` returns the keys that appeared since the list was last drawn (nothing for the first list, and a key counts as new for 900 ms so a re-render cannot cut the animation short); give those the class. `markFresh(id)` / `takeFresh(id)` (`fresh.ts`) do the same for an item you just made, before it is rendered. All of it is switched off by `prefers-reduced-motion`.

## Gotchas
- The page slide is `backwards` for the same containing-block reason (found on TurboKeep's Android: the floating add bar stuck to the page after the first tab change). TurboMusic (Layout.tsx) adopted it on 2026-10-17; its themes set `--page-in` per UI style, so there the class overrides it only when the section changes.
- **Never fill-forward an animation that changes `transform` or `max-height`** (`both`/`forwards`): the filling animation keeps a containing block alive, so a `position: fixed` window inside the page is sized to the page (TurboKeep's "grey box over half the screen"), and `max-height` stays as a cap. Use `backwards`. Render dialogs in a portal (`createPortal(…, document.body)`) in any case.
- A click that waits for a double click must wait only for a mouse (`e.detail === 1`); the keyboard (`detail === 0`) acts at once, and `detail >= 2` cancels the wait and does the double-click thing.
- The finish animation (`item-motion.css`) has a plain version and a Liquid Glass one (glint, ring of light, dissolve); the row is removed by the list when the server has the change, so the animation only has to look finished.
- `Divider` is invisible until hovered (green), unless told it is "lit" (grey): TurboKeep lights it when the open note is not under the tag the list shows. Drag with pointer capture; the arrow keys move it too. It reports the pointer's x and the column's box; the app turns that into a width.
- `AutoText` uses CSS `field-sizing: content` where the browser has it and measures otherwise, restoring the scroll position it disturbs.

## Files
- `apps/web/src/motion.css`, `apps/web/src/item-motion.css` (import both from `index.css`)
- `apps/web/src/lib/pageDirection.ts`
- `apps/web/src/lib/arrivals.ts`, `lib/fresh.ts`, `lib/focus.ts`
- `apps/web/src/components/AutoText.tsx`, `components/Divider.tsx`
