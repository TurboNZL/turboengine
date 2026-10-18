# Motion: one animation language

Arrive, swap, slide-in, pop, expand and the finish animation as plain CSS classes, the hook that gives only what is NEW the arrive class, a draggable divider and a text box that sizes itself.

Optional. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbokeep`, branch `claude/notes-ui-ux-improvements-lc6qs1` (where it runs).

## The rule
**Every change on screen uses the same few motions, and they are decided by what happened, not by which component it is.**
| Class | Use it when |
|---|---|
| `.tk-arrive` | something NEW slots into a list: a tag, an item that came in from the server after the page drew from its cached copy, a new item you just made |
| `.tk-page` + `-fwd` / `-back` | the user switched tab/page in the main navigation: the new page slides in from the side it sits on (right if it is further along in the nav, left if before). `const dir = usePageDirection(activeIndex)`, then `<div key={section} className={cn('tk-page', dir)}>`. Key by the SECTION (`/albums`), or key by the path and pass it as `usePageDirection(i, pathname)`: either way a detail opened inside a section does not slide. |
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

## Without React (TurboCut)
The class vocabulary is plain CSS, so a vanilla app uses `motion.css` alone: `TurboNZL/turbocut` has it as `src/app/motion.css` (plus a `tk-fade` for dialog backdrops) and applies the classes by hand: dialog and menu `tk-pop`, tab body and a different selection `tk-swap`, a folded section `tk-expand`. To replay an animation on an element that already has the class: `el.classList.remove(c); void el.offsetWidth; el.classList.add(c)`. Gotcha: a `ResizeObserver` callback that rebuilds DOM and so changes the observed element's own height logs "ResizeObserver loop completed with undelivered notifications"; compare the width and rebuild in `requestAnimationFrame`.

## Files
- `apps/web/src/motion.css`, `apps/web/src/item-motion.css` (import both from `index.css`)
- `apps/web/src/lib/pageDirection.ts`
- `apps/web/src/lib/arrivals.ts`, `lib/fresh.ts`, `lib/focus.ts`
- `apps/web/src/components/AutoText.tsx`, `components/Divider.tsx`

## TurboDocs' use (2026-10-17)
TurboDocs (Electron + React) took `motion.css` and `lib/arrivals.ts` unchanged and applied the rule by what happens: a page change keys `<main>` by the route and gets `tk-swap`; every dialog, menu, submenu and popover gets `tk-pop` (dialogs are portalled, so the "fill-forward" gotcha above does not bite); the document-tabs panel is `tk-slide-in`; notices that appear (restore backup, warnings) are `tk-expand`; recent files and new slides use `useArrivals` + `tk-arrive`; switching slides is `tk-swap` keyed by the slide. One class it had to add itself: `tk-fade` for a dialog's backdrop and for the slide show (`index.css`, two lines). An app-level "Animations" switch sets `data-motion="off"` on `<html>` and one CSS rule removes every `tk-*` animation; `prefers-reduced-motion` already does the same. Not used there: `item-motion.css`, `Divider`, `AutoText`, `focus.ts`, `fresh.ts`.
