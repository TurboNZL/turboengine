# Appearance

How Curator looks is not decided in this repository. It is decided by **turbothemes** ([github.com/TurboNZL/turbothemes](https://github.com/TurboNZL/turbothemes)), a small package that all of the owner's apps share, so they look consistent and the look can be improved without releasing an app.

| Part | Where | Changes |
|---|---|---|
| The **engine**: applies a look, "match this device", wallpaper, Liquid Glass lens, ripple, the updater, the generic `.btn` / `.input` / `.card` rules | the `turbothemes` npm dependency (`apps/web/package.json`, pinned to a commit in `pnpm-lock.yaml`) | rarely |
| The **themes**: 67 colour palettes and 33 UI styles, one folder each | `themes/` in the turbothemes repository | often, and they reach the app by themselves |
| The **layouts** (where the pages are listed: side bar, toolbar, icon rail, top tabs, dock): app-specific, so they stay here | `apps/web/src/lib/layout.ts` (the list), `apps/web/src/layouts.css` (the CSS, injected after the themes' stylesheet), `Layout.tsx` (the markup) | with the app |
| The glue: starts the engine with this app's options, hands it the device settings | `apps/web/src/lib/appearance.ts` | rarely |
| The picker (Settings → Appearance) and the "Themes" update card | `apps/web/src/components/AppearanceCard.tsx`, `ThemeUpdates.tsx` | with the app |

## What the app promises

The markup uses the hook classes (`.btn`, `.input`, `.card`, `.chip`, `.bt-window`, `.bt-menu`, `.bt-side`, `.bt-top`, `.bt-player`, `.bt-tabbar`, `.bt-nav`, `.bt-tab`, `.bt-row`, `.bt-range`, ...) and takes every colour from the tokens (`bg-surface`, `text-muted`, `border-line`, `hsl(var(--accent))`) and every corner radius from `rounded-theme`. That is the whole contract; it is written out in turbothemes' `docs/CONTRACT.md`. If a page looks wrong in every style, it is a layout bug in the app. If a control looks wrong in one style, it is a bug in that style's folder in turbothemes.

## Updating themes

- Automatically: Settings → Appearance → **Themes** looks for newer themes in the background (at most every six hours) and when you press the button. The setting "Look for newer themes automatically" turns it off; the engine then only uses the themes built into the installed app.
- Themes are fetched from the public turbothemes repository. If that repository is ever made private, paste a read-only GitHub token into the same card.
- A downloaded set is kept on the device and used at the next start, until a newer engine (a new app build with a newer `turbothemes` dependency) brings newer built-in themes.
- To take a new **engine**: `pnpm update turbothemes --filter @curator/web`, then commit the lockfile.

## Fonts

The app bundles the fonts the styles use (`apps/web/src/fonts.css`, `@fontsource`), so styles work offline in the desktop and Android apps, and tells the engine not to load them from a CDN (`fonts: 'none'`). If a theme starts using a font that is not bundled, it falls back to the next font in its stack until the app adds the import.

## Trying a change before pushing it

Run `pnpm dev` in the turbothemes repository for its playground, or point this app at a local build: in `apps/web/package.json` use `"turbothemes": "link:../../../turbothemes"` while working (do not commit it).
