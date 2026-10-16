# Search language: words plus chips, Discord style

tag:, -tag:, excludes:, includes:, before:, after:, is:, has: and "phrases".

Optional. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbokeep`, branch `claude/notes-ui-ux-improvements-lc6qs1` (where it runs).

## The language
Words (all must match, in the title or the text), `"a phrase"`, and filters that become chips: `tag:work` (also finds `work.reports`), `-tag:old`, `excludes:old` / `exclude:` / `not:` (the same as `-tag:`), `includes:work` / `include:` (the same as `tag:`), `before:2024-06` / `after:2023` (a year or month is the whole period), `is:task|note|pinned|markdown`, `has:date|tags|text`. A leading `-` turns any filter round; several `tag:` filters all have to match. A filter that makes no sense is read as a word.

## The server
`parseSearch(q)` (in `search.ts`) returns `{ words, tags, notTags, before[], after[], is, notIs, has, notHas }`. Turn it into SQL as `listNotes` does in TurboKeep's `store.ts`: one `like ... escape '\'` per word (title or text), `exists (select 1 from note_tags … lower(g.title) = ? or lower(g.title) like 'x.%')` per tag (`not exists` for excluded), `substr(created_at,1,10) < ?` for `before` and `> ?` for `after`, plain column tests for `is:` and `has:`.

## The client
`searchQuery.ts` turns the text in the address into chips and back (`parseQuery`, `buildQuery`, `typedFilter`, the aliases in `canon`), so the address stays `?q=tag:work -tag:old milk` and a link shows the same search. `SearchBox.tsx` is the box: type a filter name for a list that narrows as you type, **Tab (or the arrows) walks the list, Enter takes the lit one**, Backspace on an empty box removes the last chip; plain words search on Enter unless you walked the list first. It is a **text** input (not `type="search"`: the browser's own clear button was the second cross next to ours).

## Scope
TurboKeep searches only the page you are on (Home, Archive, Bin) and `OtherPiles` says "There are N results for this on the Archive. Switch?" when the others hold results.

## Files
- `apps/server/src/search.ts`, `apps/web/src/lib/searchQuery.ts`, `components/SearchBox.tsx`
