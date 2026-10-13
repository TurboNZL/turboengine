# Engine API

```ts
import { start } from 'turbothemes';
const themes = start(options);
```

`start()` installs the built-in themes (or a downloaded bundle from an earlier run), injects their stylesheet, applies `appearance` before the first paint and schedules the background update check. Call it once, early.

## `start(options)`

| Option | Default | |
|---|---|---|
| `appearance` | none | `{ theme, ui, glass?, wallpaper?, wallpaperDarkness?, wallpaperCustom? }` applied immediately. `theme`/`ui` may be an id, `"auto"` (match the device) or, for `theme`, `"system"` (follow light/dark). |
| `storagePrefix` | `"turbothemes"` | prefix of the localStorage keys (`<prefix>.themes`, `.themesChecked`, `.wallpaperImage`). |
| `source` | GitHub `TurboNZL/turboengine@main` (`themes/dist`) | where updates come from: `githubSource({ repo, ref, dir, token })`, `urlSource(base, headers)`, or `false` for never. |
| `autoUpdate` | `true` | check in the background after start. |
| `checkEveryMs` | 6 hours | minimum time between background checks. |
| `fonts` | `"cdn"` | `"cdn"` loads a style's `@fontsource` fonts from jsDelivr when it is used; `"none"` if the app bundles its own (works offline). |
| `lens` | `true` | `false` or `() => boolean` to switch off the Liquid Glass refraction (phones, some webviews). |
| `persist` | `false` | remember the user's choice in localStorage (`<prefix>.appearance`) and apply it at the next start; `appearance` is then just the default for a first visit. |
| `picker` | `false` | register the `<turbo-themes-picker>` element (see [PICKER.md](PICKER.md)). |
| `host` | `{}` | what only the app knows about the device: `{ desktopEnv: 'ubuntu:GNOME' }` lets "match this device" tell Linux desktops apart. |

## What it returns

| | |
|---|---|
| `apply(appearance)` | applies a look; cheap, call it on every change. Remembered, so an update re-applies it. |
| `update()` | looks for newer themes now: `{ status: 'updated' \| 'current' \| 'engine-too-old' \| 'failed', message, added?, removed? }`. Never throws. |
| `setSource(source \| false)` | changes where updates come from (for example after the user pastes an access token). |
| `resetToBuiltin()` | forgets downloaded themes. |
| `appearance()` | the look that is applied now. |
| `preview(a \| null)` | re-themes the real page with a look without keeping it; `null` goes back. Not for hover or focus: preview those in a mock page ([PICKER.md](PICKER.md#2a-previewing-a-look-use-a-mock-page-not-the-real-page)). |
| `onAppearance(fn)` | called after every `apply()` from anywhere; returns an unsubscribe. |
| `picker()` | the headless picker controller ([PICKER.md](PICKER.md)). |
| `version()` | `{ hash, built, origin: 'builtin' \| 'downloaded', checkedAt, source }` for a "last updated" line. |

## For a settings screen

`listThemes()` (palettes, with `"auto"` and `"system"` first; each has `group`: `own` / `colour` / `platform` / `inspired`, and `dark`), `listStyles()` (with `"auto"` first; `matching` names the palettes made for a style), `getPalette(id)`, `getStyle(id)`, `resolveTheme(id)`, `themeStyle(id)` (inline variables for a preview), `themeWallpaper(id)`, `deviceLook()` (what "auto" means here), `subscribe(fn)` / `getRevision()` (React: `useSyncExternalStore(subscribe, getRevision)`), wallpaper helpers `saveCustomWallpaper(file)` / `getCustomImage()` / `clearCustomWallpaper()`.

Lower-level: `ensureFonts(styleId)` (load a style's fonts for a preview when `fonts: 'cdn'`), `applyAppearance`, `applyTheme`, `watchSystemTheme(get)` (re-apply when the OS switches light/dark), `checkForUpdates(source)`.

## Updates in detail

1. Read `manifest.json` (about 200 bytes). If its `apiVersion` is newer than the engine's: stop with `engine-too-old`. If its `hash` equals the running bundle's: `current`.
2. Read `themes.json` and `themes.css`, check they match the hash (if someone pushed in between, wait and read once more), check the catalog's structure (every palette complete, the default palette and style exist).
3. Install: replace the engine's catalog, swap the `<style id="turbothemes-css">`, re-apply the current look, tell subscribers, store the bundle in localStorage.
4. On the next start the stored bundle is used, unless the engine itself was updated since (a newer engine carries newer built-in themes, so the stored bundle is dropped).

The stylesheet of a downloaded bundle is inserted after the app's own CSS, like the built-in one. `base.css` is part of the engine, not of the bundle: it only changes with an engine release.
