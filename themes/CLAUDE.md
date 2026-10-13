# turbothemes: project handoff

One look for all of the owner's apps (TurboNZL, GitHub). Two halves, on purpose: a small **engine** that almost never changes, and **themes** (folders of JSON + CSS) that are iterated on and reach apps through an online updater, so a theme fix never needs an app release. Read `README.md`, then `docs/CONTRACT.md` (what an app must do) and `docs/AUTHORING.md` (how themes are written). Update this file when a decision or the state changes.

## User preferences (how to work with them)
- Don't waste their usage. Fact-check and double-check yourself; use web search liberally. Reply in normal capitalised prose, not lowercase or slang.
- Verify against real runs, not only unit tests. This repo was extracted from the Curator app (TurboNZL/Curator, `apps/web`); the proof was a pixel diff of 96 screenshots (every UI style, palettes, layouts, wallpaper, Liquid Glass) before and after: 92 identical, 4 with 1-5 px of antialiasing noise (the same noise two runs of the OLD code have).
- Commit trailers: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and the `Claude-Session` line the harness gives. Do not create a pull request unless asked.

## Decisions (don't re-ask)
| Topic | Decision |
|---|---|
| Shape | The folder `themes/` of the turboengine repo is the npm package `turbothemes` (install with a `#path:/themes` git dependency). `engine/` = source of the rarely-changing part; `themes/` = what changes; `dist/` = built output, committed by CI (apps download it from raw.githubusercontent.com, so it has to be in git). |
| Install | `pnpm add "github:TurboNZL/turboengine#path:/themes"` (needs the committed `dist/`), or a script tag from jsDelivr (public repos only), `npx turbothemes init` writes the glue file. Tailwind is optional: `turbothemes/tailwind` is a preset, the CSS is plain. |
| Themes | One folder per look: `theme.json` (a style and/or palettes), `style.css`, `palette.css`, assets. Colour palettes and UI styles stay independent choices (any palette with any style). **Layouts (where an app lists its pages) are NOT themes: they are app-specific and live in the app** (Curator: `apps/web/src/layouts.css`, `lib/layout.ts`). The engine never touches `data-layout`. Palettes are JSON specs; the engine derives every colour from `bg` + `primary` (+ overrides). |
| Updates | `manifest.json` (hash) -> `themes.json` + `themes.css`, verified by checksum and structure; stored in localStorage under `<prefix>.themes` with the built-in hash it was fetched against (a newer engine drops it). `apiVersion` gates incompatible bundles. Public repo = raw URLs; private = `githubSource({ token })` through the GitHub API. |
| Isolation | The build lints that every rule in a style is scoped to its own `[data-ui]` (palette: `[data-theme]`), no Tailwind syntax, no missing assets. That is what keeps one folder from breaking another and previews of other looks working. |
| Fonts | Styles list `@fontsource` packages; the engine loads them from jsDelivr (`fonts: 'cdn'`) unless the app bundles its own (`fonts: 'none'`, Curator does, for offline). The Minecraft font is embedded in themes/blocky. |
| Picker | `docs/PICKER.md`. A headless controller (`engine.picker()`: lists, preview, set, matching colours, wallpaper, updates) plus ONE optional skin, the `<turbo-themes-picker>` custom element (`variant` select/tiles, `floating`, `sections`). `start({ persist: true, picker: true })` + the tag is the whole install. Never dictate how a picker must look: apps may draw their own on the controller. |
| API version | `API_VERSION` is 2 since layouts left the catalog; engines at 1 refuse the newer bundles with `engine-too-old` (apps must update the package once). |
| Engine vs theme | A new scripted effect, a new hook class in `base.css`, or a new theme.json field needs an engine release (and maybe an `API_VERSION` bump). Everything else is a theme change. |

## Layout
```
engine/src/        types, color, palette (spec -> variables), catalog (registry + validation), theme (apply palette), device (match this device from config rules),
                   wallpaper, fonts, effects/{liquidGlass,ripple}, bundle (built-in vs downloaded), source (github/url), updater, apply, picker (headless controller),
                   picker-element (<turbo-themes-picker>), index (start())
engine/base.css    the contract: default variables + generic .btn/.input/.card/... rules (imported by apps BEFORE their utility classes)
themes/<id>/       theme.json style.css palette.css assets      themes/config.json  defaults, devices
scripts/           build.mjs (dist), lib/themes.mjs (read + lint + assemble), dev.mjs (playground server), fmt.mjs, gen-docs.mjs
examples/          playground.html (vanilla page, no Tailwind: proves the engine works anywhere)
test/              themes (build lint), device, engine (start/update/fonts/wallpaper/ripple, happy-dom), liquid (optics)
```
Commands: `pnpm install`, `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm dev` (http://localhost:5280, restyles on save through the real updater).

## What was verified, and what was not
- Verified: the data (all 67 palettes' derived variables, 33 styles, "auto" rules identical to the old Curator code), the CSS split (pixel diff above), the updater in a real Chromium (edit a palette on disk, the open page changed colour within a second), the engine in a non-Tailwind page (playground), 46 tests.
- Not verified: the engine from a published location (nothing was pushed from the session that created this: the GitHub app had no push access to this repo), jsDelivr font loading and raw.githubusercontent CORS against real GitHub (the sandbox cannot reach them), a private repo with a token, other frameworks than Curator's React app, Safari/Firefox.

- Picker verified in real Chromium (examples/picker.html): tiles and drop-downs, click keeps, hover previews and restores, the choice survives a reload. Bugs only a real browser showed: the element was defined before the engine was registered (tags already in the page threw), and a hover preview re-rendered the tile under the pointer in a loop (the element now redraws only when the kept look or the theme list changed). Importing the engine in plain Node must keep working (no top-level HTMLElement).

## Adopter guidance (added 2026-10-13)
- `docs/INTEGRATION.md` is the how-to for apps (Curator is the reference; section 2 lists the DOM structure styles assume, which the contract table alone did not say). `docs/AUDIT_TURBOCUT.md` is the evidence: TurboCut's only really bad UI was the tab strips (`.bt-tab` misused for in-page tabs) and the dialog title bar (needs an `h2` in a flex `.bt-titlebar`); a tested fix is `docs/patches/turbocut-tabs-and-dialog.patch` (applies to TurboCut `main` at the time; not applied there). `docs/LOGO.md` + `examples/logo/make-logo.mjs` is the Curator-style logo recipe.
- `examples/verify-looks.mjs` screenshots an app under many looks and fails on native-looking buttons, wrapped title bars, loose panel titles and sideways overflow. It was run against TurboCut before and after the fix (negative control).
- **Known gap, not built (engine change):** there is no hook for in-page tabs. Apps use a token-only recipe (INTEGRATION 2.3). A `.bt-tabs`/`.bt-pagetab` hook with a `--tabs-*` variable family in `base.css`, plus per-style looks (Windows 98 folder tabs, macOS segmented control), is the proper fix and needs an engine release.
- SVG ids in a logo are one namespace per page: prefix them per app (the template has `ID`).

## Gotchas learned
- Selectors in a theme CSS must carry their own `[data-ui="id"]`; a shared rule for several styles is duplicated per style on purpose (see how fortnite2/4 and the macOS family look).
- Palette order in the pickers is the `order` number; the original app showed palettes in its source order, so `order` is index*10.
- `@layer components` in the old Curator CSS was Tailwind's; plain CSS in `base.css` must come before the utilities (apps `@import` it first). `.btn` etc. rely on being weaker than an element's own utility classes.
- Node: scripts run with `--experimental-strip-types` (no enums, no parameter properties); imports use explicit `.ts` extensions.
- `pnpm install --ignore-scripts` is fine here (no native builds).
- happy-dom prints "CSS file loading is disabled" for the font `<link>`s in tests: expected.

## Next
- A GitHub Pages / release mirror of `dist/` if jsDelivr/raw caching ever gets in the way.
- `turbothemes init` could also patch the entry and the Tailwind config; today it prints the two lines.
