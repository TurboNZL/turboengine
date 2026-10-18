# Themed select (vanilla): drop-downs the look can style

A native `<select>` opens the operating system's own list; no look can restyle it (Liquid Glass showed a plain grey one). `themedSelect.ts` replaces the list, not the element: `enhanceSelects()` finds every `select.input` (now, and as new ones appear), hides the native select and puts a button in its place that opens a `bt-menu` list. The `<select>` remains the one source of truth, so code that reads `.value`, sets `.value`, rebuilds the `<option>`s or listens for `change` keeps working untouched. React apps use TurboKeep's `Select.tsx` instead (same behaviour).

Optional. Source: `TurboNZL/turbocut`, file `src/app/themedSelect.ts` (runs there); it imports `h` from `dom.ts` and `icon` (chevron, check) from `icons.ts`: use your own element helper and icons.

## Use it
1. Copy the file, call `enhanceSelects()` once at start.
2. Copy the `.themed-select`, `.themed-select-menu`, `.ts-option` rules from TurboCut's `styles.css` (about 15 lines; `select.ts-native` must be visually hidden, not `display:none`, so a label's click and form logic still work).
3. In Playwright, `selectOption` cannot reach the hidden select. Use a helper that opens the list and presses the row (`pick()` in TurboCut's `e2e/browser.mjs`).

## Gotchas
- A `<button>` does not inherit the field's text colour: set `color: hsl(var(--fg))` on `.themed-select`. And `.input` itself sets no `color`, so a field's text follows the browser's dark/light guess and came out **white on a light look** in TurboCut; set `input.input, textarea.input, select.input { color: hsl(var(--fg)) }` (this belongs in `turbothemes` base).
- Position the list with `offsetHeight` (the opening animation scales it; `getBoundingClientRect` reports it too small) and leave room for `--dock-h` when a bottom dock covers the window.
- Setting `.value` from script fires no event: the file wraps the `value` and `selectedIndex` setters of each upgraded select and watches the options with a `MutationObserver`.
- `sel.focus()` is redirected to the button, so code that focuses a field lands on something visible.
