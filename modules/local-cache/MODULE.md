# Local cache: show the copy first, then update

Four caching levels, a prefetch that starts the first requests with the sign-in check, a button that remembers everything, and the Settings card for it.

Optional. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbokeep`, branch `claude/notes-ui-ux-improvements-lc6qs1` (where it runs).

## The idea
Draw from a copy at once, ask the server anyway, and let what changed slide in (`motion`'s `useArrivals`). A copy is never the last word.
| Level | What is kept |
|---|---|
| Off | nothing |
| Low | lists, tags and opened items, in memory, for this visit (going back to a page is instant) |
| Medium | as Low, and lists and tags in `localStorage`: after a reload or opening the app the list is there before the network answers |
| High | as Medium, plus the page asks ahead (the archive, the first items) and keeps up to 400 opened items on the device (`rememberNote`, oldest dropped first) |
`remember(key, value)` / `recall(key)` for lists and tags; `rememberNote` / `recallNote` for single items. `ownCache(userId)` clears the copies when another account signs in; `clearCache()` on sign-out and from the Settings button.

## Gotchas
- **Update the copy whenever you change the thing**: when a patch or an editor save succeeds, `rememberNote(saved)`, or reopening shows the old text and the editor reports a false "changed elsewhere".
- A copy of an item shown in the editor is NOT replaced when the server's answer differs (the user may already be typing); the editor's conflict check (`base` = `updatedAt`) turns a difference into a choice, never a silent overwrite.
- Keep keys equal to the request: TurboKeep's list key is the JSON of the request parameters, so the prefetch and "remember everything" fill exactly what the pages read.
- Cache the archive's tag column too; an uncached column snaps in after the page.
- `localStorage` is small: refuse values over 2 MB (lists) or 150 kB (one item); everything is wrapped in try/catch and works without it (private windows).
- The first requests can start before React renders (`prefetch.ts`), in parallel with the "who am I" call: two round trips saved on a slow link. A 401 there just means nobody is signed in.
- `precache.ts` is TurboKeep's list of what its pages show; rewrite that list for your app, keep the shape.

## Files
- `apps/web/src/lib/cache.ts`, `lib/precache.ts`, `lib/prefetch.ts`, `components/SpeedSection.tsx`
