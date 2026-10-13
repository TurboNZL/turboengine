# Settings shell and device pairing

Wrapping tab strip, card order conventions, and a pairing code (`CUR1-<base64url>`) that carries address, token and access credentials to a new device.

Optional. Reference files are in `files/` (the paths are the paths in the app); they were taken from TurboMusic at `b6d85a8`, where they are known to work.

- Tabs wrap (`flex-wrap`), never scroll sideways, so all are visible on a phone. Put the card the user came for first (Update server, App updates, Layout).
- Order used: Appearance, Server, Library, Playback & storage, Spotify (or other integrations), Guides, This app.
- The pairing code is the credentials: say so wherever it is shown.

## Files
- `apps/web/src/pages/Settings.tsx`
- `apps/web/src/components/Section.tsx`
- `apps/web/src/lib/pairCode.ts`
