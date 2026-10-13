# Device pairing code

A code that carries server address, access token and access-service credentials to a new device (`CUR1-<base64url>`).

Optional. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbomusic` at `ea3f5ea`.

**Requires:** `settings-shell`.

A code `CUR1-<base64url JSON>` (rename the prefix per app) holds server address (editable, so a phone gets the tunnel address), access token and optionally the Cloudflare Access service token's id and secret. The new device pastes it or opens `<address>/?pair=<code>`; `main.tsx` asks to confirm, applies it and strips the query.

## Gotchas
- **The code is the credentials**: say so wherever it is shown.
- Build the code from the typed Settings values, not the saved ones (the service-token fields only save with the Save button).
- In the Android app the page is `http://localhost`, so there you paste the code.

## Files
- `apps/web/src/lib/pairCode.ts`
