# Device pairing code

A code that carries server address, access token and access-service credentials to a new device (`CUR1-<base64url>`).

Optional. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbomusic` at `ea3f5ea`.

**Requires:** `settings-shell`.

A code `CUR1-<base64url JSON>` (rename the prefix per app) holds server address (editable, so a phone gets the tunnel address), access token and optionally the Cloudflare Access service token's id and secret. The new device pastes it or opens `<address>/?pair=<code>`; `main.tsx` asks to confirm, applies it and strips the query.

## Never make the token unrecoverable (learned in TurboPantry, 2026-10-16)
A server that stores only a **hash** of each token cannot show it again, and TurboPantry's owner lost theirs and had to remake the account. Every app with its own accounts takes all three of these, not just the code:
1. **A token per device.** "Make a code" calls the server (`POST /api/devices {label}`), which mints a NEW token for the signed-in account and returns it once; the code carries that one (not the device's own). Keep a `device_tokens` table (id, user, hash, label, created, last used); `GET /api/devices` lists them without secrets and `DELETE /api/devices/:id` revokes. A lost phone is removed from the list and a new one paired; nobody remakes an account.
2. **A command for the server's shell** that replaces an account's main token and prints it once (`new-token <name>`; TurboPantry: `node --experimental-strip-types src/index.ts new-token <name>`). The data stays. Document it next to `add-user` in the self-hosting guide, and in Settings under "Lost every token?".
3. **Say it in the UI:** the code is a password; shown once; where the recovery is. Never write a token anywhere readable (TurboMusic keeps a plain `<data>/token` file by design; apps with hashed tokens must not).
Also: the code is built from the **typed** Settings values; a `?pair=` link must ask before applying and then remove the code from the address bar (`history.replaceState`); inside the Android shell the page is `http://localhost`, so pasting the code is the way there (the Android app should also forward the applied address/token to the native bridge, see `android-shell`).

## Gotchas
- **The code is the credentials**: say so wherever it is shown.
- Build the code from the typed Settings values, not the saved ones (the service-token fields only save with the Save button).
- In the Android app the page is `http://localhost`, so there you paste the code.

## Files
- `apps/web/src/lib/pairCode.ts`
