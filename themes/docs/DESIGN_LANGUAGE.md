# One design language across all styles

These rules are for the apps that use turbothemes and for the people writing themes. The styles differ in character, not in behaviour. These rules keep them at parity, so a new page or component works in every one of them without special cases.

## Rules for components

1. **Colour only from tokens.** `bg-surface`, `text-muted`, `border-line`, `hsl(var(--accent))`. A hard-coded hex belongs in a style block that is deliberately era-specific (Windows 98's grey, Winamp's black), never in a component.
2. **Shape only from variables.** Use `rounded-theme` (= `--radius`) or the generic classes (`.btn`, `.input`, `.card`, `.chip`). Never `rounded-lg` on something a style should round differently.
3. **Use the hook classes** so a style can restyle them: `.btn .btn-accent .btn-ghost .input .card .chip`, dialogs a modal (`bt-window bt-titlebar bt-close bt-body bt-footer`), menus `bt-menu` with `role="menuitem"` / `role="option"`, bars `bt-side bt-top bt-player bt-tabbar bt-nav bt-tab`, rows `bt-row`, sliders `bt-range`, panels `bt-panel` + `bt-panel-title`.
4. **Motion from variables.** Use `var(--dur)` / `var(--ease)` in CSS transitions, `--menu-anim` for pop-ups, a "presence" helper in the app for anything that animates out (it sets `data-leaving`). Styles with no motion set `--dur: 0ms` and the animation variables to `none`.
5. **Floating things go in a portal** and wear `bt-menu`, so glass, shadows and animations apply.
6. **Selected = outline** (`bt-sel` + `data-selected`) or a style variable, not a ring.
7. **Phones first.** No horizontal page scroll at 390 px; touch targets reachable without hover; the bottom bar and player never hide content (`main.has-player` padding).
8. **Respect accessibility media queries.** `prefers-reduced-motion` removes animation globally; `prefers-reduced-transparency` makes glass opaque.

## What every style must define

A style is complete when each of these looks deliberate: default / hover / pressed / focus / disabled buttons (plain, accent, ghost); a text field in rest, hover and focus; a checkbox, a radio, a slider; a card; a dialog with title bar and close button; a menu with a highlighted item; the sidebar, top bar, player bar and phone tab bar; a list row (hover and current); a Settings panel title.

## Eras and fidelity

A style that is named after a platform is **one era of it**, and says which in its label and description. Do not blend eras: Aqua's gel and pinstripes belong to Mac OS X 10.0–10.6; the flat blue button belongs to macOS Big Sur and later (the "macOS" style); Liquid Glass is macOS 26. Android Holo is 4.0–4.4, flat and square with cyan rules; Material 3 is the later rounded, tonal one. When refining a style, name the specific release you are copying and check measurements against that platform's own documentation (for example WinUI: 4 px control corners, 8 px overlays).

## Per-style motion reference

| Style | Dialog | Menu | Player bar | Page change |
|---|---|---|---|---|
| Default | none | none | slide up | fade |
| GTK 4 | springy pop | fade | slide, spring | fade |
| Breeze | fade | drop | fade | fast fade |
| Windows 11 | pop (250 ms, Fluent ease) | slide down | slide up (fast out, slow in) | slide up 28 px |
| Windows 10 | pop | reveal | fade | fast fade |
| Windows 7 | pop | fade | fade | fast fade |
| Windows XP / 98 | none | none/instant | none | none |
| macOS | sheet drop | fade | slide, ease-out | fade |
| Mac OS X Aqua | sheet drop | fade | none | none |
| Liquid Glass | materialising pop | morphing from the trigger | floating glass in/out | soft scale |
| Material 3 | pop (emphasized) | reveal | slide (emphasized) | fade through |
| Android Holo | pop | fade | none | fast fade |
| Winamp | none | none | none | none |
