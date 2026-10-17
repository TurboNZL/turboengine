# Date picker: a calendar drawn by the UI style

A native `<input type="date">` opens the browser's or the operating system's own picker, which no theme can restyle and which looks out of place in every look but the default. `DatePicker` is a button that shows the chosen day and opens a month calendar drawn with the themes' own hook classes.

Optional. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbokeep`, branch `claude/zealous-newton-w3w78y` (where it runs, in the item rows and the note editor).

## Use
```tsx
<DatePicker aria-label="Due date" value="2026-10-18" onChange={(v) => save(v || null)} />   // value and onChange are 'YYYY-MM-DD', '' is no date
```
Props: `value`, `onChange`, `placeholder` ("No date"), `className` (added to the button, which is an `input bt-select`), `clearable` (default true: a Clear button while a day is set), `aria-label`, `autoOpen`. `dayKey(date)` is exported.

## What it does
- The calendar is a `bt-menu bt-popover` in a portal at `z-[95]` (above windows at 80 and the Select list at 70), placed under the button or above it when there is no room, kept clear of the dock via `--dock-h`, closed by a click elsewhere or Escape. It reuses `usePresence` so the style's own exit animation plays.
- Arrow keys move by a day / a week, PageUp/PageDown by a month (Shift: a year), Home/End to the start/end of the week, Enter or Space picks, `T` is today, Escape closes (and does not close a window around it: it calls preventDefault, which `Dialog` respects).
- The first day of the week comes from `Intl.Locale(...).getWeekInfo()` (Monday when the browser does not say). Always six rows, so the popover never changes height while you page through months.
- Needs `lucide-react` and the themes' tokens (`bg-accent`, `text-accent-fg`, `bg-hover`, `border-line`, `text-muted`).

## Gotchas
- A day is picked as text, never through `new Date('2026-10-18')` (that is UTC midnight and shows the day before west of Greenwich): the component builds dates with `new Date(y, m, d)`. An app that stores a moment should add a time itself (TurboKeep stores noon, `T12:00`, so a date picked without a time never shifts a day).
- Month arithmetic holds the day number to the target month's end (31 Jan + 1 month = 28 Feb), not rolling into March.
- The popover is outside the page, so a page that animates with `transform` and a fill mode does not clip or move it.
