# Backup bundle: everything in one zip, safe to import twice

One JSON file in a zip with a format name and version, refused when newer, idempotent by id, with a dry run, tag looks that only fill gaps and the pictures the data refers to.

Optional. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbokeep`, branch `claude/notes-ui-ux-improvements-lc6qs1` (where it runs).

## The rules (TurboKeep's `formats/turbokeep.ts` and `io.ts`)
1. **One file, `<app>.json`, in a zip** (a bare JSON is read too): `{ format, version, exportedAt, appVersion, notes[], tagStyles[], customEmoji[] }`.
2. **A newer `version` is refused with a message** ("update first"), never half-read; **older versions are still read** (version 1 tasks become items, projects become tags, what is no longer kept is counted in a warning).
3. **Idempotent by id**: importing twice adds nothing; an id that another account on the same server owns gets a new id (and anything that referred to it is remapped, as emoji ids are).
4. **Dry run**: do the whole import inside a transaction and throw a private `DryRun` at the end, so the report ("N notes, M tags, K skipped, warnings") is the real one and nothing is written.
5. **Looks only fill gaps**: tag emoji and colour from a backup are applied only to tags that have none, so an import never overwrites what you chose here.
6. **Pictures travel inside** (base64), so an emoji a tag uses is not lost on restore.
7. Each part of a note's state that is not content (order, pins, due dates, archive and bin state) is in the file; `updatedAt` is kept, so a restore does not look like an edit.
8. Other apps' formats (Standard Notes, Vikunja) are separate readers and writers with their own report; `io.ts` shows the shape. Their gotchas are in TurboKeep's `docs/development/FORMATS.md`.

## Gotchas
- A test that exports, deletes everything and imports again, and then compares, caught most mistakes. Keep it.
- Put the tags in the order the note has them (`note_tags.position`); sorting by name loses the user's order.
- The web panel (`ImportExport.tsx`) shows TurboKeep on top and other platforms in their own windows; every import offers "Check first" (the dry run).

## Files
- `apps/server/src/formats/turbokeep.ts` (reader and writer), `formats/types.ts`, `io.ts` (also holds the other platforms: keep what you need), `apps/web/src/components/ImportExport.tsx`
