# Custom emoji: any picture, shrunk to emoji size

Import a picture, the browser shrinks it to a 96 px PNG, the server keeps it and serves it with a year-long cache header.

Optional. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbokeep`, branch `claude/notes-ui-ux-improvements-lc6qs1` (where it runs).

## How it works
- The page (`resizeToEmoji` in `lib/emoji.tsx`) decodes the picture (`createImageBitmap`, which scales while decoding, so a 4k photo is never held at full size; an `<img>` fallback for SVG), draws it **contained** into a 96 × 96 canvas and sends a PNG as base64. A 3840 × 2160 test picture became a 695-byte file in about 1.5 seconds.
- The server (`emoji.ts`) accepts only a PNG or WebP (magic bytes), at most 120 kB, 300 per user, and stores it in `custom_emoji(id, user_id, name, mime, data, created_at)` with `id = 12 hex`.
- A tag's emoji field holds `:<id>:` (`isCustomEmoji`); `<Emoji value>` draws the image (`/api/emoji/<id>`) or the character.
- Routes: `GET /api/emoji`, `POST /api/emoji {name, data}`, `GET /api/emoji/:id` (`Cache-Control: private, max-age=31536000, immutable`; the id never changes), `DELETE /api/emoji/:id` (tags using it lose it).
- `EmojiPicker` focuses its search box when it opens (typing is the first thing anyone does), lists "Your own" first-class next to the groups, imports several files at once and has a "Remove…" mode.

## Gotchas
- An app that sets `Cache-Control: no-store` on all of `/api` must let the emoji route keep its own header (TurboKeep: only set it when none is there).
- A tag's emoji must be checked against the user's own table before it is accepted, or one account could reference another's picture.
- Keep `:<id>:` in backups together with the pictures (`backup-bundle`), remapping when an id is taken.
- Never pass a user-chosen emoji through `slice(0, 4)` without checking for the `:id:` form first.

## Files
- `apps/server/src/emoji.ts` (copied from `store.ts`; wire the four routes in `app.ts`), `apps/web/src/lib/emoji.tsx`, `components/EmojiPicker.tsx`
