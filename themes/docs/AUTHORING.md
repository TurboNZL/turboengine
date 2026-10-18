# Writing themes

Everything here is plain JSON and CSS. You never touch the engine or an app. `pnpm dev` opens the playground and restyles it every time you save.

```
themes/<id>/
  theme.json       who this is: a style, palettes, or both
  style.css        the style's CSS (optional)
  palette.css      CSS for a palette that needs more than colours (optional, rare)
  *.woff2 / *.png  anything the CSS points at with url(./file): embedded by the build
themes/config.json defaults and the "match this device" rules
```

A folder's name is its id. A folder can hold a style, palettes, or both: `themes/win7/` is the Windows 7 style plus its two palettes; `themes/nord/` is one palette. Display order is the `order` number (lower first; leave it out and it sorts last by id).

## A palette

In `themes/<id>/theme.json`, under `"palettes"`:

```json
{
  "id": "nord", "label": "Nord", "mode": "dark",
  "bg": [220, 16, 17], "primary": [193, 43, 67],
  "fg": "218 27% 94%", "mutedFg": "219 15% 70%",
  "motif": "peaks", "step": 1.1, "group": "colour", "order": 140
}
```

- Colours may be `"#rrggbb"`, `"#rgb"`, an `"h s% l%"` triplet, or `[h, s, l]`.
- `bg` and `primary` are enough: every other surface, border and text colour is derived (`step` controls how much lighter stacked surfaces get on dark palettes). `fg`, `mutedFg`, `onPrimary` (text on the accent) override the derived values.
- To copy a real design system exactly, pin surfaces with `"overrides": { "card": "#fff", "secondary": "...", "muted": "...", "accent": "...", "border": "...", "input": "..." }` (hex).
- `vars` sets any other variable by name (`positive`, `negative` ...), applied last.
- `motif` is the shape of the generated wallpaper: `stars waves hills grid dots rays peaks`. `wallpaper: { bg, primary }` tints the wallpaper differently from the chrome.
- `group`: `colour`, `platform` (copies an OS palette), `inspired` (a game or app), `own` (see below).
- `source` is a free-text note on where the colours come from.
- `note` is shown next to the palette in pickers (used by `own` palettes).
- `pair` names the same look in the other mode (see "Light and dark" below).

### Light and dark

A palette is either dark or light (`mode`). Two palettes can be **twins**: the dark one names the light one in `pair` and the other way round. Pickers use twins for one **Light / Dark switch** instead of listing every theme twice: the switch shows only palettes of the chosen mode (Dark is the default), and flipping it also flips the theme that is selected to its twin. A look that exists in one mode only simply has no twin and shows up under its own mode; that is fine.

Twins come from two places, in this order: a palette's own `pair`, then the two palettes a style lists in `matching` (`{ "light": "win11", "dark": "win11-dark" }`). So the platform palettes are twins already without any extra field. The build refuses a `pair` that does not exist, is in the same mode, or points at a palette that pairs with something else. Pickers read it through `listThemes()` (`pair` on each entry) and `counterpartOf(id)`.

### Every app can have its own two palettes

Each app may add **two colour themes of its own, one light and one dark, as a pair** in the engine: a folder `themes/<app>/theme.json` with the two palettes, `"group": "own"` and each naming the other in `pair`. TurboMusic's is `themes/turbomusic/` (the logo's purple on near-black, and its light twin); TurboKeep's is `themes/turbokeep/` (the logo's amber on warm near-black, and its light twin); TurboDocs' is `themes/turbodocs/` (the logo's teal on near-black, and a deeper-teal light twin); TurboPantry's is `themes/turbopantry/` (the jar's mint green on deep green-black, and its light twin). Take the app's emblem colour as `primary`, keep `bg` close to neutral with a hint of the same hue, name them "<App> Dark" and "<App> Light", and give a short `note`. Two palettes is the limit on purpose: an app's own look should be a clear default pair, not a collection (everything else belongs to all apps). Not carried into the open pack (`themes-open`) unless `make.py` lists it.

The own palettes (`default`, `classic`, `light`) set `"own": true` and take their variables from the folder's `palette.css` (`[data-theme='classic'] { --bg: ...; --radius: 8px; }`), which is how a palette can also change density and corner radius.

## A style

`theme.json`:

```json
"style": {
  "description": "Aero: glass window frames, grey gel buttons with a blue glow ...",
  "font": "Segoe UI",
  "matching": { "light": "win7", "dark": "win7-dark" },
  "fonts": [{ "package": "open-sans", "weights": [400, 600, 700] }],
  "effects": [],
  "order": 60
}
```

`matching` names the palettes made for the style (shown as "Use matching colours"). `fonts` lists `@fontsource` packages the CSS font stack uses, so apps that load fonts from the CDN get them (`italic: [700]` for italics). `effects` can contain `liquid-glass` and `ripple`.

`style.css` is mostly a block of variables (see [CONTRACT.md](CONTRACT.md) for the families) plus a few selectors where a look needs more:

```css
[data-ui="win7"] {
  --radius: 6px; --font: "Segoe UI", "Open Sans", sans-serif;
  --btn-bg: linear-gradient(...); --btn-border: 1px solid #707070; --menu-anim: bt-fade 120ms ease both;
}
[data-ui="win7"] .bt-titlebar { background-image: ... }
```

**Every rule must be scoped to `[data-ui="<this folder's id>"]`**, never a bare `.btn`. That is what lets two looks coexist (a preview of one inside a page set to another) and what stops a change in one folder from altering another; the build checks it. `@media`, `@keyframes` and `@font-face` are fine. Tailwind syntax (`@apply`, `theme()`) is not: the CSS must work in apps without Tailwind.

Colours: a style should not hard-code a colour scheme; tint from the palette with `color-mix(in srgb, hsl(var(--accent)) 30%, transparent)`. Hard-coded hex is for an era-specific look (Windows 98's grey, Winamp's black).

Shared animations: `bt-fade bt-pop bt-pop-spring bt-slide-in bt-slide-out bt-drop bt-reveal bt-fade-out bt-sheet` are in `engine/base.css`; reuse them in `--menu-anim` and friends, or define your own `@keyframes` in the style.

## Fonts and images

Put the file next to the CSS and refer to it as `url(./name.woff2)`; the build embeds it into themes.css, so a folder is complete and the bundle stays one file. Mind the licence (the folder should say what it is).

## "Match this device"

`themes/config.json` → `devices` is an ordered list; the first rule whose `when` fits wins. A condition can test `ua`, `platform`, `env` (the Linux desktop an app reports) as case-insensitive regexes, `minTouchPoints`, and combine with `all` / `any`. Add a device by adding a rule above the broader ones.

## Check, build, ship

```sh
pnpm dev      # playground; rebuilds on save
pnpm fmt      # tidy the JSON
pnpm test     # the build's lint plus the engine tests
pnpm build    # dist/ and docs/THEMES.md (CI does this on every push to main and commits dist/)
```

Push to `main`. Apps pick the change up the next time they check (within hours, or at once from their "check for newer themes" button).

## When the engine has to change

Only for: a new hook class that the generic rules in `engine/base.css` must understand, a new scripted effect, a new field in theme.json that the engine must read. Add it, bump `API_VERSION` in `engine/src/types.ts` if older engines would misbehave with bundles that use it, and release the package. Otherwise: never.

Look at a style on Tracks, an album page, a dialog, a menu and a 390 px phone before you call it done; [DESIGN_LANGUAGE.md](DESIGN_LANGUAGE.md) says what a style must define.
