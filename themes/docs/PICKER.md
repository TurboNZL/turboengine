# Pickers

A settings screen for the look needs the same logic in every app: list the palettes and styles, preview them (in a mock page, never on the real one: see [section 2a](#2a-previewing-a-look-use-a-mock-page-not-the-real-page)), keep the choice, offer "matching colours", handle the wallpaper, look for newer themes. turbothemes ships that logic once, **headless**, and one optional ready-made control on top of it. Use the control as it is, restyle it, or ignore it and draw your own: nothing about the look of a picker is decided here.

## 1. The one-tag picker

```ts
start({ persist: true, picker: true });   // persist: remember the choice; picker: register the element
```

```html
<turbo-themes-picker></turbo-themes-picker>                  <!-- all sections, as drop-downs -->
<turbo-themes-picker variant="tiles"></turbo-themes-picker>   <!-- palettes and styles as tiles (see the known issues below: it previews on the real page, and the colour chips stack one per line) -->
<turbo-themes-picker floating label="Look"></turbo-themes-picker>  <!-- a corner button that opens it -->
<turbo-themes-picker sections="theme,ui"></turbo-themes-picker>    <!-- only some sections: theme, ui, wallpaper, updates -->
```

Without a bundler: load `engine.global.js`, call `TurboThemes.start({ persist: true, picker: true })`, put the tag in the page.

It is an ordinary custom element (works in React, Vue, Svelte, plain HTML). It is drawn with the hook classes (`.input`, `.btn`, `.card`), so it wears whatever look it is choosing. Event `tt-change` (detail: the new appearance) fires after a change; property `.picker` is the controller below. To restyle it, override its classes: `.tt-panel .tt-sec .tt-tiles .tt-tile .tt-sw .tt-hint .tt-float .tt-pop`.

It does not include a layout choice: how an app lists its pages is the app's own business (see CONTRACT.md).

## 2. The headless controller

```ts
const picker = themes.picker();        // or createPicker(themes)
```

| | |
|---|---|
| `getState()` | `{ appearance, shown, previewing, revision }`: the kept look, what the page shows now (differs while previewing), and a number that changes when an update changed the lists. A new object after every change. |
| `subscribe(fn)` | `fn` runs after any change; returns an unsubscribe. With React: `useSyncExternalStore(picker.subscribe, picker.getState)`. |
| `themes(filter?)` | palettes in groups `device` (auto, system), `own`, `colour`, `inspired`, `platform`: `{ id, label, items: [{ id, label, note, dark, colors: { bg, surface, accent, text } }] }`; `filter` is `'dark'` or `'light'`. `colors` are ready for a swatch. |
| `styles()` | `{ id, label, description, font, effects, isAuto }[]`, "Match this device" first. |
| `set(patch)` | changes part of the look and keeps it (`{ theme }`, `{ ui }`, `{ glass }`, `{ wallpaper, wallpaperDarkness, wallpaperCustom }`). |
| `preview(patch \| null)` | re-themes the **real page** with a look without keeping it; `null` ends it. **Do not call it on hover or focus** (section 2a). Fine for a deliberate, short "try this" with an explicit way back. |
| `matchingTheme(styleId?)` / `useMatchingTheme()` | the palette made for a style, in the variant that fits the current light or dark; apply it. |
| `device()` | what "match this device" means here (`{ name, ui, light, dark }`). |
| `wallpaper` | `hasCustom()`, `setCustom(file)`, `clearCustom()`, `getCustom()` for the user's own picture. |
| `checkForUpdates()` / `version()` / `resetThemes()` | the updater, for a "Themes" row. |
| `resetLook()` | palette and style back to "auto", wallpaper off. |

A minimal hand-made picker (hover only moves a mock page, the real page changes on click):

```ts
const picker = themes.picker();
const mock = document.querySelector<HTMLElement>('#mock');   // a wrapper that holds a small mock page, see 2a
const showInMock = (theme: string) => {
  const p = resolveTheme(theme);
  mock.dataset.theme = p.id;
  mock.dataset.mode = p.dark ? 'dark' : 'light';
  mock.dataset.ui = effectiveUi(picker.getState().appearance.ui);       // hovering a colour keeps the current style
  for (const [k, v] of Object.entries(themeStyle(theme))) k.startsWith('--') ? mock.style.setProperty(k, v) : (mock.style[k as 'colorScheme'] = v);
};
for (const g of picker.themes()) for (const t of g.items) {
  const b = document.createElement('button');
  b.textContent = t.label;
  b.onmouseenter = () => showInMock(t.id);
  b.onmouseleave = () => showInMock(picker.getState().appearance.theme);
  b.onclick = () => picker.set({ theme: t.id });
  menu.append(b);
}
```

## 2a. Previewing a look: use a mock page, not the real page

**Making the whole page change colours or style while the pointer moves over an option is a bad idea.** Verified in Chromium with the stock `variant="tiles"` picker: hovering a tile changes `<html data-theme>` (`adwaita` to `midnight`) and restyles the entire page, including the picker itself, which then redraws under the pointer. Why it is bad:

- the page the person is trying to read and click flashes through every look as the mouse crosses the list (a styles list has 33 entries, a colour list 67);
- the picker, the pointer target and the surrounding layout change size and colour under the pointer, so tiles move away from it;
- touch has no hover, so it needs a second mechanism anyway;
- some styles load fonts, run an effect (Liquid Glass, ripple) or animate on change, so each hover costs real work and can flicker.

Use the **mock page** instead: a small, framed miniature of the app drawn with the real hook classes, coloured and shaped by the option under the pointer. It relies only on the wrapper rule in [CONTRACT.md](CONTRACT.md) (`data-theme`, `data-ui`, `data-mode` and the inline variables from `themeStyle(id)` on a wrapper element; every theme rule is scoped to its own `[data-ui]`, so the wrapper shows its own look inside a page that is set to another). The reference implementation is `PreviewApp` in `modules/appearance/files/apps/web/src/components/AppearanceCard.tsx`; copy it and change the mock's content to your app.

Rules for the picker around it:

1. **Hover and focus only change what the mock shows.** The real page changes on click (`picker.set`), and nothing else.
2. **The mock is labelled and framed** (dashed accent border, a "Preview" chip, "Not your real page. Hover an option to try it, click to apply."), stays in view beside the lists (`lg:sticky`), and names the combination it shows ("Nord + Windows 11"). Below it say which look is active now.
3. The mock is `pointer-events-none select-none` and `role="img"` with an `aria-label`: it is a picture, not a control.
4. Keep colour and style independent in the mock too: hovering a colour shows it with the *current* style, hovering a style shows it with the *current* colours.
5. With `fonts: 'cdn'` call `ensureFonts(styleId)` for the style the mock is about to show; with bundled fonts nothing is needed.
6. Offer "Use matching colours" as a button next to the style list; hovering it shows that palette in the mock, clicking applies it.

### Laying out the colours: a grid of chips, several per line

Colour chips are small. Put them in a CSS grid that fills the row, **not one chip per line**:

```html
<div role="radiogroup" aria-label="Colour themes" class="grid grid-cols-[repeat(auto-fill,minmax(8.25rem,1fr))] gap-1.5"> ... chips ... </div>
```
(plain CSS: `display:grid; grid-template-columns:repeat(auto-fill,minmax(8.25rem,1fr)); gap:.375rem`). A chip is a single line: a four-stripe swatch (`bg`, `surface`, `accent`, `top`; the `colors` of `picker.themes()` give them), the name (truncated) and a tick when selected. Group them (the app's own looks, colour themes, games/apps/devices, platform palettes) with a small uppercase heading each, and offer an All / Dark / Light filter. UI styles use the same grid with a wider minimum (`9.5rem`) and a one-line description underneath that follows the hovered style.

### Known issues of the stock `<turbo-themes-picker variant="tiles">`

Until these are fixed in `engine/src/picker-element.ts`, prefer the drop-down variant or build on the controller as above.

- **It previews on the real page** (hover and focus call `picker.preview`). See above.
- **`sections="..."` breaks in React 19.** React 19 sets attributes of a custom element as *properties* when the element has a member of that name, and the element has a private method `sections()`: `<turbo-themes-picker sections="wallpaper,updates">` in JSX overwrites it with a string and rendering throws (`this.sections is not a function`). Create the element with `document.createElement` and `setAttribute('sections', ...)` instead (the engine should rename the method).
- **The colour chips stack one per line.** The grouped palettes are wrapped in an element that is itself a `.tt-sec`, and the rule that stretches children of a section (`.tt-sec > select, .tt-tiles, .tt-group, ...`) does not list `.tt-sec`, so the wrapper shrinks to one column and the `auto-fill` grid inside it collapses (measured: 188 px wide, three chips on three rows; with `turbo-themes-picker .tt-sec > .tt-sec { justify-self: stretch }` added it is 872 px wide and one row). If you must use the element, add that rule.

## 3. Keeping the choice

- `persist: true` makes the engine keep the look in `localStorage` (`<prefix>.appearance`) and apply it before the first paint at the next start. Nothing else to do.
- An app that has its own settings (sync, an account) leaves `persist` off, stores the look itself and calls `themes.apply(settings)` at start and on every change; pickers built on `picker.set()` still work, because `themes.onAppearance(fn)` tells the app about every change so it can save it:

```ts
themes.onAppearance((a) => saveSettings({ theme: a.theme, ui: a.ui, glass: a.glass, wallpaper: a.wallpaper }));
```
