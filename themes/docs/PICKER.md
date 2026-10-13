# Pickers

A settings screen for the look needs the same logic in every app: list the palettes and styles, preview on hover, keep the choice, offer "matching colours", handle the wallpaper, look for newer themes. turbothemes ships that logic once, **headless**, and one optional ready-made control on top of it. Use the control as it is, restyle it, or ignore it and draw your own: nothing about the look of a picker is decided here.

## 1. The one-tag picker

```ts
start({ persist: true, picker: true });   // persist: remember the choice; picker: register the element
```

```html
<turbo-themes-picker></turbo-themes-picker>                  <!-- all sections, as drop-downs -->
<turbo-themes-picker variant="tiles"></turbo-themes-picker>   <!-- palettes and styles as tiles that preview on hover -->
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
| `preview(patch \| null)` | shows a look without keeping it (hover, focus); `null` ends it. |
| `matchingTheme(styleId?)` / `useMatchingTheme()` | the palette made for a style, in the variant that fits the current light or dark; apply it. |
| `device()` | what "match this device" means here (`{ name, ui, light, dark }`). |
| `wallpaper` | `hasCustom()`, `setCustom(file)`, `clearCustom()`, `getCustom()` for the user's own picture. |
| `checkForUpdates()` / `version()` / `resetThemes()` | the updater, for a "Themes" row. |
| `resetLook()` | palette and style back to "auto", wallpaper off. |

A minimal hand-made picker:

```ts
const picker = themes.picker();
for (const g of picker.themes()) for (const t of g.items) {
  const b = document.createElement('button');
  b.textContent = t.label;
  b.onmouseenter = () => picker.preview({ theme: t.id });
  b.onmouseleave = () => picker.preview(null);
  b.onclick = () => picker.set({ theme: t.id });
  menu.append(b);
}
```

## 3. Keeping the choice

- `persist: true` makes the engine keep the look in `localStorage` (`<prefix>.appearance`) and apply it before the first paint at the next start. Nothing else to do.
- An app that has its own settings (sync, an account) leaves `persist` off, stores the look itself and calls `themes.apply(settings)` at start and on every change; pickers built on `picker.set()` still work, because `themes.onAppearance(fn)` tells the app about every change so it can save it:

```ts
themes.onAppearance((a) => saveSettings({ theme: a.theme, ui: a.ui, glass: a.glass, wallpaper: a.wallpaper }));
```
