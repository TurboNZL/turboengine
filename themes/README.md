# turbothemes

One look for all of your apps, split in two so that each half is easy to work on:

- **The engine** (`engine/`) is small and almost never changes. It applies a look to a page, resolves "match this device", draws the wallpaper, runs the few scripted effects (Liquid Glass refraction, the Material ripple) and **checks this repository for newer themes**.
- **The themes** (`themes/`) are plain folders of JSON and CSS: colour palettes and UI styles (shape, type, motion). This is the part you iterate on. Push a change and every app that uses turbothemes picks it up on its own, **without anyone touching or releasing the app**.

That is also what separates a UI bug from a theme bug: if a page is laid out wrongly, it is the app; if a button looks wrong in one style, it is a folder in `themes/`.

33 UI styles (Windows 7 to 11, macOS and Liquid Glass, GTK 4, Breeze, Material 3, One UI, Fortnite chapters, Pip-Boy, Spotify, Discord ...), 67 palettes. [The full list](docs/THEMES.md).

## Use it in an app

An app marks its elements with a handful of hook classes (`btn`, `input`, `card`, `bt-side`, ...) and puts its colours on a handful of CSS variables. That small contract is [docs/CONTRACT.md](docs/CONTRACT.md); the rest is automatic.

**Adding it to an app?** Read [docs/INTEGRATION.md](docs/INTEGRATION.md): the wiring, the DOM structure every style assumes (dialogs, panels, tabs, menus), and a checker (`examples/verify-looks.mjs`) that screenshots the app under many styles. A worked example of what goes wrong without it is [docs/AUDIT_TURBOCUT.md](docs/AUDIT_TURBOCUT.md). **Making the app's logo?** [docs/LOGO.md](docs/LOGO.md) and `examples/logo/make-logo.mjs`.

### With a bundler (React, Vue, Svelte, plain Vite ...)

```sh
pnpm add "github:TurboNZL/turboengine#path:/themes"       # npm: (npm cannot install a subfolder of a repository: use pnpm)
npx turbothemes init                       # writes src/turbothemes.ts, tells you the two lines to add
```

```ts
// src/turbothemes.ts  (what `init` writes)
import { start } from 'turbothemes';
import 'turbothemes/base.css';

export const themes = start({ persist: true, picker: true });   // remember the user's choice, and enable <turbo-themes-picker>
```

Import that file first in your entry (`import './turbothemes'`), then put this tag anywhere to get a settings control:

```html
<turbo-themes-picker floating></turbo-themes-picker>   <!-- a corner button that opens it; drop `floating` to place it inline -->
```

That is the whole install: the choice is remembered, applied at the next start, and the themes keep themselves up to date. From code:

```ts
themes.apply({ theme: 'nord', ui: 'win11' });   // change the look (store this in your settings)
await themes.update();                                          // look for newer themes now
```

Using Tailwind? Add the preset so `bg-surface`, `text-muted`, `border-line`, `rounded-theme` exist:

```ts
// tailwind.config.ts
import turbothemes from 'turbothemes/tailwind';
export default { presets: [turbothemes], content: [...] };
```

and import `turbothemes/base.css` **before** Tailwind's utilities (`@import 'turbothemes/base.css';` at the top of your CSS) so an element's own utility classes still win over the generic component rules. Not using Tailwind is fine: nothing here needs it.

### Without a build step (a single HTML file)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/TurboNZL/turboengine@main/themes/dist/base.css">
<script src="https://cdn.jsdelivr.net/gh/TurboNZL/turboengine@main/themes/dist/engine.global.js"></script>
<script>
  TurboThemes.start({ persist: true, picker: true });
</script>
<turbo-themes-picker floating></turbo-themes-picker>
```

([examples/playground.html](examples/playground.html) is a complete page that does this, with pickers.) jsDelivr only serves **public** repositories.

### A picker, if you want one

One tag gives you a settings control, or build your own on the headless controller. See [docs/PICKER.md](docs/PICKER.md) and [docs/ENGINE.md](docs/ENGINE.md).

## How updates work

`dist/` (themes.json, themes.css, manifest.json) is built from `themes/` and committed by CI on every push to `main`. The engine ships with a copy of that bundle built in, so an app always has a complete look, even offline. In the background (at most every six hours, and only when the page is idle) it reads the tiny `manifest.json` from this repository, and if the content hash differs it downloads the new bundle, **verifies the checksum and the structure**, swaps the stylesheet in and re-applies the current look. A bad download is ignored; going back to the built-in themes is one call (`resetToBuiltin()`). What gets downloaded is data and CSS only, never JavaScript, so a theme update can restyle an app but cannot run code in it.

If a change needs something the engine does not have yet (a new hook, a new effect), the bundle's `apiVersion` goes up and older engines refuse it with a clear message instead of misbehaving; update the `turbothemes` package in the app then. Everything else never needs an app update.

The repository can be **public** (nothing in it is secret; the engine reads it from raw.githubusercontent.com) or **private**: then each app gives the engine a read-only GitHub token (`githubSource({ token })`). Apps that must not go online pass `source: false`.

## Work on the themes

```sh
pnpm install
pnpm dev        # http://localhost:5280  the playground; edit anything in themes/, the page restyles itself
pnpm test       # lints every folder, runs the engine tests
pnpm build      # writes dist/ and docs/THEMES.md
```

[docs/AUTHORING.md](docs/AUTHORING.md) shows how to add or change a palette or a style. The build refuses theme CSS that leaks outside its own folder's style, uses Tailwind syntax, or points at a missing file, so one theme cannot break another.

## Layout of this repository

```
engine/            the rarely-changing part: TypeScript source + base.css (the contract)
themes/<id>/       one folder per look: theme.json (palettes and/or a style), style.css, palette.css, fonts/images it uses
themes/config.json defaults, "Match this device" rules
dist/              built output that apps download (committed by CI)
examples/          the playground
docs/              contract, integration guide, logo guide, authoring guide, engine API, design notes, the TurboCut audit
scripts/           build, dev server, formatter, docs generator
```

## Licence

MIT. The Minecraft style bundles the FontStruct font "Minecraft" by Pwnage_Block (CC BY-SA 3.0), see `themes/blocky/`. The styles imitate the look of products and platforms for personal use; none of their logos or proprietary fonts are included.
