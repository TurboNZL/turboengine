# System fonts: the fonts installed on this computer

One framework-free file that lists the installed font families, so a font box can offer them and a document or caption that names a font can tell whether this device has it. Needed by TurboCut (caption and text fonts) and TurboDocs (the font picker); any app with a font box should use it instead of a typed list.

Optional. Source: `TurboNZL/turbocut`, file `src/app/systemFonts.ts` (runs there, with `test/systemFonts.test.ts`). The file has no imports.

## What it does
`detectSystemFonts()` returns `{ fonts: [{ family, styles[] }], source, note? }` and never throws.

| Runtime | How | `source` |
|---|---|---|
| **Electron** | `window.queryLocalFonts()`. **No permission prompt, no click needed, no `setPermissionRequestHandler` entry** (measured in Electron 44.7 / Chromium 152 under Xvfb: the call returned the installed faces both with and without a user gesture). | `local-fonts` |
| Chrome, Edge (desktop) | the same API; the first call must come from a click or key press and asks the person once (permission `local-fonts`, remembered). A refusal is reported in `note` and the fallback is used. | `local-fonts`, or `probe` if refused |
| Firefox, Safari, the Android WebView | no such API. The fallback measures text with each name in `COMMON_FONTS` against three fallback fonts and keeps the ones that change the width. Finds the common fonts only. | `probe` |

`groupFonts(faces)` turns faces into one row per family (case-insensitive, sorted). `probeFonts(names, test)` is the fallback on its own. `fontPermission()` says whether a call would prompt (`granted`, `prompt`, `denied`, `unsupported`), so an app can detect silently when it is already allowed and show a button otherwise. `detectedFonts()` is the last result; `onFontsDetected(fn)` re-draws a font box when one arrives.

## Using it
1. **Electron:** call `detectSystemFonts()` at start (TurboCut `main.ts`). Nothing to configure.
2. **Browser:** `if ((await fontPermission()) === 'granted') await detectSystemFonts();` at start, and a "Find installed fonts" button that calls it (the click is the user activation Chrome wants). Say what `note` says when the list is the fallback.
3. Fill the `<datalist>` or select of the font box from `detectedFonts()?.fonts`, with a few built-in names first (TurboCut `fontChoices()` in `fonts.ts`). Keep typing free: a font name that is not installed must still be accepted, because a document can be opened on a machine that has it.
4. A font the app **adds itself** (file import, `FontFace`) is a different thing from an installed one: keep both lists and say which is which (TurboCut's font manager has "Your fonts" and "Installed on this device").

## Gotchas
- **An app that denies all permissions** (`session.setPermissionRequestHandler((_, __, cb) => cb(false))` and a `setPermissionCheckHandler` that returns false, as hardening guides suggest) may block the call. Electron's default is to allow it; if an app turns the default off, allow `local-fonts` for its own origin only. Not tested with a deny-all handler.
- **`Permissions-Policy: local-fonts=()`** (or a missing `self`) blocks it in a browser; an iframe needs `allow="local-fonts"`.
- It is a **secure-context** API: `https://`, `localhost`, or Electron's custom `app://` scheme when it is registered as secure (TurboCut registers it with `secure: true`). Plain `http://` on a LAN address has no `queryLocalFonts`, so the fallback runs.
- A font family appears **once per style**: group before showing (done). Names are the family a CSS `font-family` accepts; use `fullName` or `postscriptName` only for display.
- The fallback is a **guess by width**: a font that happens to have the same metrics as a fallback is missed, and `COMMON_FONTS` is a list of well-known names, not every font. Do not describe it to people as "installed fonts"; the `note` already says so.
- Listing fonts is also a **fingerprinting** surface; that is why browsers gate it. An app that sends the list anywhere should say so (TurboCut keeps it in memory only).
- 100 to 1000 families is normal. Draw them in pieces with a search box (TurboCut shows 30 and "Show more"); a sample drawn in each family loads lazily and is slow when all are drawn at once.

## Files
- `src/app/systemFonts.ts` (the module), `test/systemFonts.test.ts` (vitest, no DOM needed: the browser calls are injected).
