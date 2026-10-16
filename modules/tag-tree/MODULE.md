# Tag tree: Parent.Child tags with inherited colours

Tags with a dot are a tree; a parent that only exists as the front of a child is still shown.

Optional. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbokeep`, branch `claude/notes-ui-ux-improvements-lc6qs1` (where it runs).

## Rules
1. `work.reports` sits under `work`; **`work` shows in the tags column even when no note is directly under it** (`railTags` adds every ancestor, with `implied: true`), and its count is the notes under it and under its children (`total`).
2. **A tag with nothing under it (and no child with anything) is not shown, and the server deletes it** (looks included); a tag whose notes are all archived is hidden from the live column and shown in the archive's.
3. **A parent keeps its look in every pile**: `railTags(tags, looks)` takes the look of an implied parent from the full tag list, so the archive's column shows it too.
4. **Colour inheritance**: a tag without a colour takes its nearest parent's (`colorOf`). The **bar** (the stripe down an item's edge, and the tag column's marker) is the parent's colour when the tag has its own and it differs (`barColorOf`); the glow (the wash over the item) and the chip use the tag's own.
5. Children are drawn after their parent with a dash (`– reports`); renaming a parent renames everything under it; deleting a parent in the manager offers to delete the tree.
6. New items and tags that appear after the first draw use `useArrivals` (`motion`).

## Files
- `apps/web/src/lib/tagTree.ts`, `lib/tagLook.ts`, `components/TagRail.tsx`
