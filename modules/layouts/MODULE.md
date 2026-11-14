# Layouts: where the pages are listed (optional)

A template, not a requirement. Apps made with the engine tend to end up with a **flat, square, full-height side bar**, because that is what `.bt-side` gives you. This module is the other options, switchable per device: the same markup, one `data-layout` on `<html>`.

| id | what |
|---|---|
| `side` | the engine default; needs no CSS |
| `floating` | the side bar is a **rounded panel with a gap around it** |
| `rail` | icons only |
| `floating-rail` | icons only, in a floating pill |
| `topbar` / `dock` | no side bar; the app lists pages in its top bar / the bottom tab bar (the shell shows the tabs on wide windows for `dock`) |

## Use it
1. Copy `layouts.css`, `lib/layout.ts` and (if you have no shell yet) `components/AppShell.tsx`.
2. Import `layouts.css` **after** the themes' stylesheet so it wins ties with a style (or inject it in `appearance.ts`, as TurboMusic does).
3. Call `applyLayout(settings.layout)` at start-up and whenever the setting changes; offer `LAYOUTS` in your picker.
4. Just want the rounded bar and nothing else? Set `document.documentElement.dataset.layout = 'floating'` and skip the picker.
5. Add the module to `.turboengine.json`.

## What the floating rules rely on
`.bt-frame` (the row that holds the side bar and the page) gets the padding and gap; `.bt-side` the radius, a full border and a soft shadow. (Want the page in a rounded panel as well? Give `.bt-pane` a `background: var(--card-bg)` and a radius in your app.) Size comes from theme variables when a style sets them: `--side-r` (side bar radius, else `1.6 x --radius`), `--float-gap` (default 12px), `--bar-border`, `--side-shadow`.

## Gotchas
- **Two floating rails** (learned in TurboPantry, 2026-11): `floating-rail` (side pill) and `floating-dock` (bottom pill, every screen size; the shell hides the side bar and shows the tab bar for it). A badge on a nav item (a count on Shopping) must be `position: absolute` over the icon's corner (`.bt-badge`, rules at the end of `layouts.css`): an inline badge widens the item and moves the other icons when it appears.
- Utility classes beat the layouts (same layer): `rounded-*`, `border-*` or `shadow-*` on the side bar defeats the floating look. Put only the hook class on it.
- A rounded panel needs `overflow: hidden` or the highlighted link's square corners poke out; the rule is there.
- **Liquid Glass already floats its bars** with its own radius and lens; the floating rules skip it (`:not([data-ui="liquid"])`). Any other look that draws its own floating bars should be excluded the same way.
- A fixed, floating player bar must know where the side bar ends; give it a per-layout `left` offset (TurboMusic's `layouts.css` has examples under "Liquid Glass x layout").
- Phones (< 768 px) ignore the floating rules: the side bar is hidden there and the tab bar takes over.
- The app-specific set (toolbar layout, top links, Liquid Glass offsets) stays in `modules/appearance/files/apps/web/src/layouts.css`; this module is the generic part.
