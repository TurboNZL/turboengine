# Appearance: themes, layouts and the picker

How an app starts the turbothemes engine, owns its layouts, shows the picker (colour theme, UI style, layout, wallpaper) and the theme-update card.

Recommended for every app. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbomusic` at `ea3f5ea`, where they run.

## Themes live in this repo
The theme package is `themes/` of this repository (name `turbothemes`; the old separate repository is retired). It has its own `CLAUDE.md`, docs (`themes/docs/`: CONTRACT, AUTHORING, INTEGRATION, PICKER ...), tests and a committed `dist/` that CI rebuilds. Apps get it two ways: **build time** as a pnpm git dependency on a subfolder, and **run time** as theme updates the app downloads from `themes/dist` on `main` (so a theme fix never needs an app release).

## Integration
1. `"turbothemes": "github:TurboNZL/turboengine#path:/themes"` in the web app (pnpm; npm cannot install a repository subfolder). Under CI keep it resolvable by the lockfile (`git+https://github.com/TurboNZL/turboengine.git#path:/themes` is the form CI can clone); `presets: [turbothemes]` in `tailwind.config.ts`; `@import 'turbothemes/base.css'` **first** in `index.css` so Tailwind utilities still beat the generic component rules.
2. `appearance.ts` starts the engine once (`storagePrefix`, bundled `fonts`, `lens` off where refraction is unsafe, `host.desktopEnv`, `autoUpdate`, GitHub token source) and applies the device settings; it injects `layouts.css` after the themes' stylesheet.
3. The app marks its markup with the hook classes the themes style: `.btn .input .card .chip .bt-window .bt-menu .bt-side .bt-top .bt-player .bt-nav .bt-tab .bt-tabbar .bt-row .bt-tile .bt-cap ...` (see `Layout.tsx`). Layouts are the **app's** (where pages are listed), not the themes'.
4. Device settings: `theme`, `ui`, `layout`, `glass`, `wallpaper*`, `themeUpdates`, `themesToken`. `'auto'` for theme/ui = match this device.

## Gotchas
- Utilities beat the themes' component rules (same layer): markup a style must control carries only the hook class.
- **Do not preview a look by restyling the real page on hover** (`picker.preview` / the stock tiles variant do). Hover moves the mock page (`PreviewApp` in `AppearanceCard.tsx`), the page changes on click. Colour chips go in a multi-column grid (`TILE_GRID`), not one per line. Rules and the stock element's known issues: `themes/docs/PICKER.md`, section 2a.
- Multi-line text boxes get a pill radius from some styles (turbothemes#1): keep the local `textarea.input` rule at the end of `index.css` until the engine fixes it.
- Liquid Glass positions the player/dock with fixed offsets: every layout needs its own offset rule (see `layouts.css`).
- Service worker caches: bump the cache name when an unfingerprinted asset such as `icon.svg` changes.

## Files
- `apps/web/src/lib/appearance.ts`
- `apps/web/src/lib/useCatalog.ts`
- `apps/web/src/lib/layout.ts`
- `apps/web/src/layouts.css`
- `apps/web/src/components/AppearanceCard.tsx`
- `apps/web/src/components/ThemeUpdates.tsx`
- `apps/web/src/components/Layout.tsx`
- `apps/web/tailwind.config.ts`
- `apps/web/src/index.css`
- `apps/web/src/fonts.css`
- `docs/development/APPEARANCE.md`
