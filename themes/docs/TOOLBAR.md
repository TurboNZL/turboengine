# Toolbar and Zinc: the first version's look

The first version of Curator (the Dyad-generated app, long since replaced) is available as a **UI style**, *Standard v1* (id `toolbar`), and a **palette**, *Standard v1* (id `zinc`). Builds before the rename called both "dyad"; a saved setting with that name is converted when the app starts. Pick both in the app's appearance settings ("Use matching colours" pairs them). They are read off the original Tailwind markup, not eyeballed from screenshots.

## Palette `zinc` (`themes/toolbar/theme.json`)
Tailwind's zinc scale on near-black, with blue buttons. One dark theme only, as the original had no light mode.

| Role | Colour | Original use |
|---|---|---|
| page, side bar, toolbar, player | zinc-950 `#09090b` | `bg-zinc-950` |
| cards | `#101012` | zinc-900 at 40% over zinc-950 |
| fields, buttons (raised) | zinc-900 `#18181b` | `bg-zinc-900/50` |
| borders, hover fill | zinc-800 `#27272a` | `border-zinc-800` |
| captions | zinc-500 `#71717a` | `text-zinc-500` |
| accent | blue-600 `#2563eb` | `bg-blue-600` primary buttons |
| good / bad | emerald-500 / red-500 | "Merge", delete links |

The original used indigo and purple for a few page buttons (New album, Journal). They are the accent here, so every primary button is blue.

## UI style `toolbar` (`themes/toolbar/style.css`; the toolbar arrangement of the pages is a layout, and layouts belong to the app: in Curator it is `apps/web/src/layouts.css`)
- **Layout** (in Curator a separate layout that any style can use): the side bar lists the library pages only (Artists, Albums, Singles, Eras, Tracks, Playlists; the original had the first, second, fifth and sixth) under a plain uppercase CURATOR wordmark, 16 rem wide. The other pages are text links in a full-width toolbar (Journal, Rank, Queue, Notes, Stats, Health; the original had Journal, Cleanup, Stats, Queue), followed by a 16 rem pill search, Play-on-device, an icon-only Add menu and a Settings icon. Content is full width with 2 rem padding. Between 768 and 1100 px the links wrap to a second row. Phones keep the normal bottom tab bar.
- **Type**: page titles 30 px black uppercase, section titles 14 px black uppercase with wide tracking, form captions 10 px black uppercase (`.bt-label`), primary buttons bold uppercase, outline buttons 12 px bold, dialog titles black uppercase with the X in the corner and no title bar.
- **Tiles** (`.bt-tile`, `.bt-cap`, `.bt-cap-t` on album, artist, single and era cards): a bordered zinc-900/40 card, square cover that zooms 5% over 500 ms, padded captions; artist pictures are grey until hovered with a dark gradient. Tables sit in a rounded-2xl frame with faint dividers.
- **Player**: 6 rem tall, three columns, a 3.5 rem cover with a border, capitalised title and caption, a white round play button, monospace times and the original slider (dark fill, bordered track, ring thumb). Unlike the original it still appears only once something is selected, and without motion.

## Not copied
The original's pages that no longer exist (Cleanup tasks, per-modal "resolution" dialogs) are not recreated; the new pages simply wear the style. Colours of the original's modals that differed per page (blue, indigo, purple primary buttons) are one accent here.

## Verified
Chromium against a seeded server at 1440, 768 and 390 px (albums, artists, tracks with the player, album page, journal, dialog, add menu, Settings preview), no console errors, no horizontal scroll on phone or tablet, and the default style unchanged (13 side bar items, no toolbar links). The old app itself was not run (it needs its Nitro server and database); values come from its source.
