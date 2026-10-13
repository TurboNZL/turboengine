# Docs layout, in-app guides and the project brief

`docs/guides` = user guides bundled into Settings > Guides; `docs/development` = developer notes; `PROJECT_BRIEF.md` and `CLAUDE.md` at the root.

Recommended for every app. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbomusic` at `ea3f5ea`, where they run.

## Layout
```
README.md             what it is, how to run it
PROJECT_BRIEF.md      vision, rules, roadmap (see templates/PROJECT_BRIEF.md)
CLAUDE.md             running state and decision log for the AI (see templates/CLAUDE.md)
docs/guides/          ONLY user guides; bundled into the app (Settings > Guides)
docs/development/     research notes, packaging plans, internals
```
- `guides.ts` globs `docs/guides/**` and the README with `import.meta.glob`; groups and titles are a small table in the file. `markdown.ts` is a safe renderer that turns links to other guides into in-app links.
- Guides must not assume one way of hosting (a Raspberry Pi is one option, not the default).
- Feasibility studies and decision logs are not guides.

## Files
- `apps/web/src/lib/guides.ts`
- `apps/web/src/lib/markdown.ts`
- `apps/web/src/components/GuidesTab.tsx`
- `docs/guides/GETTING_STARTED.md`
