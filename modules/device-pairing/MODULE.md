# Device pairing code

A code that carries server address, access token and the Cloudflare Access service token (the two `CF-Access-Client-*` headers) to a new device (`CUR1-<base64url>`), so a phone is set up with one paste instead of three typed fields.

See [`docs/CLOUDFLARE.md`](../../docs/CLOUDFLARE.md) section 5 for the checklist that makes a code carry the service token (the missing id/secret is what sends a paired device to the Cloudflare login page).

Optional. Reference files are in `files/` (the paths are the paths in the app). Source: `TurboNZL/turbomusic` at `7435718` (the codec, the panel, the `?pair=` handler); generalised and extended in `TurboNZL/turbokeep` (a codec per app, the panel as a component, the header helper, the Android decoder).

**Requires:** `settings-shell`. Works best with `cloudflare-access` (what each client does with the two headers once it has them).

## What it is
A code `<PREFIX>-<base64url JSON>` holds the server address (editable, so a phone gets the tunnel address and not the home one), an access token and, optionally, the Cloudflare Access service token's id and secret (`{u, t, i, s}`). The new device pastes it, or opens `<address>/?pair=<code>` (the web client asks to confirm, applies it and strips the query).

| File | What |
|---|---|
| `lib/pairCode.ts` | `createPairCodec('XXX1-')`: encode, decode, link, `fromSearch`. Give each app its **own prefix** so one app's code is never taken for another's. TurboMusic's `CUR1-` codec is still exported under the old names. |
| `components/PairDevice.tsx` | The "Pair a device" panel: address, (optionally) the service token fields, **Make a code / Copy code / Copy link**, and (if `onUse` is given) **Use a code**. Props, not a store, so any app can mount it. |
| `lib/applyPairLink.ts` | `consumePairLink(...)` for `main.tsx`: asks, applies, and **always** strips the code from the address (history, bookmarks and screenshots would keep it). Pure, tested. |
| `lib/accessHeaders.ts` | `accessHeaders(settings)` / `withAccess(settings, init)`: the two headers, only when both parts are set. Put them on every API request. |
| `test/pairCode.test.ts` | Codec, link handler and header tests (11). |
| `apps/android/…/app/example/android/PairCode.kt` (+ test, listed as `examples`; the package is a placeholder) | The decoder for a native client (Android): `java.util.Base64` only, so it runs in a plain JVM unit test. The setup screen pastes a code and fills address, token and the service token. |

## Wiring (TurboMusic and TurboKeep are the two reference uses)
- **Web, make a code:** mount `<PairDevice codec={codec} appName="…" defaultAddress={location.origin} getToken={…} …/>` in Settings. TurboMusic: `getToken={() => settings.token}` plus `access={{ id: settings.cfAccessId, secret: settings.cfAccessSecret }}` and `onUse={…}` to apply a code. TurboKeep: `getToken={async () => (await api.createToken('Paired device')).token}` (a token of its own per device, revocable alone) and `askAccess` (it has no Settings fields for the service token), no `onUse`.
- **Web, open a link:** call `consumePairLink` once in `main.tsx` before rendering (the doc comment in the file has the exact call).
- **Server:** CORS must allow `CF-Access-Client-Id` and `CF-Access-Client-Secret` for any client on another origin (the Android app page, the desktop app); same-origin needs nothing.
- **Native client:** decode with `PairCode.kt`, save address, token and the service token, and add the two headers to every request (`KeepApi.call` in TurboKeep).

## Never make the token unrecoverable (learned in TurboPantry, 2026-10-16)
A server that stores only a **hash** of each token cannot show it again, and TurboPantry's owner lost theirs and had to remake the account. Every app with its own accounts takes all three of these, not just the code:
1. **A token per device.** "Make a code" calls the server (`POST /api/devices {label}`), which mints a NEW token for the signed-in account and returns it once; the code carries that one (not the device's own). Keep a `device_tokens` table (id, user, hash, label, created, last used); `GET /api/devices` lists them without secrets and `DELETE /api/devices/:id` revokes. A lost phone is removed from the list and a new one paired; nobody remakes an account.
2. **A command for the server's shell** that replaces an account's main token and prints it once (`new-token <name>`; TurboPantry: `node --experimental-strip-types src/index.ts new-token <name>`). The data stays. Document it next to `add-user` in the self-hosting guide, and in Settings under "Lost every token?".
3. **Say it in the UI:** the code is a password; shown once; where the recovery is. Never write a token anywhere readable (TurboMusic keeps a plain `<data>/token` file by design; apps with hashed tokens must not).
Also: the code is built from the **typed** Settings values; a `?pair=` link must ask before applying and then remove the code from the address bar (`history.replaceState`); inside the Android shell the page is `http://localhost`, so pasting the code is the way there (the Android app should also forward the applied address/token to the native bridge, see `android-shell`).

## Gotchas
- **The code is the credentials.** Say so wherever it is shown (the panel does), never log it, never keep it after it was applied.
- Build the code from what is typed, not what was saved: Settings fields for the service token only save with their Save button (TurboMusic found this the hard way).
- In the Android app the page is `http://localhost` (TurboMusic) so the web part of "open the link" does not apply there: paste the code. TurboKeep's app loads the server's own page, so a link works too, but its setup screen is where the code is pasted.
- An app that makes tokens on demand should give the pairing token its own name, so the list of tokens shows which device it went to.
- Nothing here has run against real Cloudflare Access (see `cloudflare-access`); the codec, link handler and headers are unit-tested, the panel was driven in Chromium in TurboKeep, the Kotlin decoder is compiled by CI only.
