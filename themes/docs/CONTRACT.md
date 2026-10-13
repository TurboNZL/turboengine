# The contract between an app and the themes

An app does three things. Everything else (shape, type, motion, glass, wallpaper) is the themes' job.

## 1. Put your colours on these CSS variables

Palettes set them on `<html>`; the stylesheets read them as `hsl(var(--surface))` or `hsl(var(--surface) / 0.5)`, so each one is an HSL **triplet without `hsl()`**: `240 12% 7%`.

| Variable | Used for |
|---|---|
| `--bg` | the page |
| `--surface` | cards, side bar, dialogs, menus |
| `--raised` | fields, buttons, chips, things sitting on a surface |
| `--line` | borders and dividers |
| `--hover` | hover fill of buttons |
| `--fg` / `--muted` | text / secondary text |
| `--accent` / `--accent-fg` | the accent colour and the text on it |
| `--good` / `--warn` / `--bad` | positive, caution, destructive |
| `--top` | highlight for a top rating or score |

Also set by themes: `--radius` (corner radius), `--font` (font stack), `--row-y` and `--grid-min` (density).

With Tailwind, `turbothemes/tailwind` turns these into `bg-surface`, `text-muted`, `border-line`, `rounded-theme`, `font-sans` ...

## 2. Mark elements with the hook classes

| Hook | What it is |
|---|---|
| `.btn` `.btn-accent` `.btn-ghost` | buttons (plain, primary, text-only) |
| `.input` (also `select.input`) | text fields |
| `.card` `.chip` | a bordered surface, a small pill |
| `input[type=checkbox]` `input[type=radio]` | drawn by the style, nothing to add |
| `.bt-range` (`.bt-range-v`, `.bt-hit`) | sliders (`--p: 40%` is the filled part), the box a slider can be grabbed in |
| `.bt-window` `.bt-titlebar` `.bt-close` `.bt-body` `.bt-footer` `.bt-backdrop` | a dialog |
| `.bt-menu` + `role="menuitem"` / `role="option"` | pop-up menus and drop-downs |
| `.bt-side` `.bt-top` `.bt-player` `.bt-tabbar` | the side bar, top bar, player bar, phone tab bar |
| `.bt-nav` `.bt-tab` with `aria-current="page"` | navigation entries |
| `.bt-row` `.bt-row-current` | list rows |
| `.bt-panel-title` | the title of a settings panel |
| `.bt-sel[data-selected]` | a chosen card (an outline, not a ring) |
| `.bt-page` | the content area that animates on a page change |
| `.bt-wf` `.bt-wf-title` `.bt-wf-btns` `.bt-wf-btn` `.bt-wf-close` | a drawn window title bar for desktop apps |
| `.bt-ind` | a sliding indicator element some styles turn on |

Keep colours, radii and fonts for these out of the app's own CSS and utilities: the style decides. Put on them only layout (flex, gap, width). A utility class that sets e.g. the background of a `.btn` will beat the style (that is on purpose: the app gets the last word).

Where an app's pages are listed (a side bar, top tabs, a dock ...) is not a theme concern: it is the app's own layout, with its own CSS. A style may restyle the bars (`.bt-side`, `.bt-top`, `.bt-tabbar`), but never moves them.

## 3. Let the engine own these attributes on `<html>`

| Attribute | Meaning |
|---|---|
| `data-theme` | the palette id |
| `data-mode` | `dark` or `light` |
| `data-ui` | the UI style id |
| `data-glass` | `regular` or `clear` (Liquid Glass) |
| `data-wallpaper` | `on` when a wallpaper is showing |

A **preview** of another look inside a page: put `data-ui`, `data-theme`, `data-mode` and the inline variables from `themeStyle(id)` on a wrapper element. Every rule in a theme is scoped to its own `[data-ui="x"]`, so a wrapper renders its own look inside a page set to a different one. This is the **mock page system**, and it is how a picker should preview a look: hovering an option moves the mock, never the real page ([PICKER.md, section 2a](PICKER.md#2a-previewing-a-look-use-a-mock-page-not-the-real-page)).

## What a style sets (the variable families)

The defaults are the first block of `engine/base.css`; a style sets only what differs.

`btn-*` `ghost-*` buttons · `in-*` fields · `card-*` · `win-*` `tb-*` `close-*` `body-bg` `backdrop` dialogs · `menu-*` `pop-shadow` menus · `side-*` `top-*` `player-*` `nav-*` `row-*` `bar-border` chrome and lists · `panel-*` · `chk-*` checkboxes and radios · `rng-*` sliders · `dur` `ease` motion · `ctl-r` `card-r` `win-r` `menu-r` `nav-r` `chip-r` `in-r` shape · `font` `title-font` type.

Motion variables: `--dialog-anim`, `--menu-anim` (opening), `--player-in` `--player-out` `--player-ms` (the player bar entering and leaving; the app sets `data-leaving` on the way out), `--pop-out` `--pop-ms` (the exit of pop-ups), `--page-in`, `--vote-ms`.

## Effects

A style's `effects` list in theme.json switches on scripted extras: `liquid-glass` (an SVG refraction lens behind `.bt-side .bt-player .bt-tabbar .bt-menu .bt-window`, Chromium only) and `ripple` (a Material ink ripple on `.btn .bt-nav .bt-tab .bt-toplink`). They are in the engine, so a new effect needs an engine release; the list of known effect names is checked by the build.

## What the engine does not do

It does not decide your page layout, and it only draws a picker if you ask (`<turbo-themes-picker>`, see PICKER.md). It stores the user's choice only with `persist: true`; otherwise keep it in your own settings and call `themes.apply()` with it.
