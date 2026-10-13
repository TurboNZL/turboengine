# Settings shell and device pairing

Wrapping tab strip, card order conventions, and a pairing code (`CUR1-<base64url>`) that carries address, token and access credentials to a new device.

Optional. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbomusic` at `ea3f5ea`, where they run.

- Tabs wrap (`flex-wrap`), never scroll sideways, so all are visible on a phone. Put the card the user came for first (Update server, App updates, Layout).
- Order used: Appearance, Server, Library, Playback & storage, Spotify (or other integrations), Guides, This app.

## Split out
- The pairing code: `device-pairing`.

## Files
- `apps/web/src/pages/Settings.tsx`
- `apps/web/src/components/Section.tsx`
