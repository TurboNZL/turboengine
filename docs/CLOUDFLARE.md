# Cloudflare Tunnel + Access: the standard setup

Every TurboNZL app that runs its own server is reached from outside the home network through a **Cloudflare Tunnel**, and the tunnel's hostname is protected by **Cloudflare Access**. This page is the one place that explains both halves: what to click in Cloudflare, what each client must do, and why apps keep getting it wrong.

Read it together with `modules/cloudflare-access/MODULE.md` (the client code) and `modules/device-pairing/MODULE.md` (the pairing code). Facts taken from Cloudflare's documentation are marked *(CF docs)*; everything else was learned running TurboMusic and is marked *(learned)*. Nothing in the engine has been run against a real Cloudflare account by the AI that wrote it; the owner's setup is the real test.

## 0. The two sentences to remember

1. **Humans log in with the portal; apps authenticate with a service token.** An app must never send the owner to the Cloudflare login page. The only way past Access without a login is a request that carries the service token's two headers and matches a policy whose action is **Service Auth**.
2. **A pairing code that does not contain the service token's id and secret is a broken pairing code.** The new device would connect to the server, hit the portal, and the user is made to log in. Every pairing code must carry `address + app token + service token id + service token secret`.

## 1. The picture

```
 phone / desktop app / browser
        │  HTTPS, headers: CF-Access-Client-Id, CF-Access-Client-Secret   (apps)
        │  or the CF_Authorization cookie after a portal login             (browsers)
        ▼
 Cloudflare edge ── Access: is there a matching policy?  ── no ──► 302 to the login portal (or 403)
        │ yes
        ▼
 Cloudflare Tunnel (cloudflared on the server's machine)
        ▼
 http://localhost:<app port>        ← the app's own token (Authorization: Bearer …) still guards the API
```

Two independent locks, and both stay: **Access** (Cloudflare decides whether the request may reach the machine) and the **app's own token** (the app decides whether the request may read data). Never remove the second because the first exists.

## 2. Cloudflare side, step by step

Dashboard names move around; the current section is **Zero Trust** (one.dash.cloudflare.com) and under it *Networks > Tunnels* and *Access controls*. Look for the name, not the menu path.

### 2.1 The tunnel
1. *Networks > Tunnels > Create a tunnel* (type: Cloudflared). Name it after the machine, not the app (one tunnel can serve several apps).
2. Install `cloudflared` on the server's machine with the command the page shows, or paste the **tunnel token** into the app's server setup (the TurboMusic Windows server wizard and `docker-self-host` both take it). The tunnel token is for the machine; it is **not** what clients get (see 5).
3. *Public hostname:* subdomain + your domain, service type **HTTP**, URL `localhost:<app port>` (a Docker setup uses the service name, `http://<service>:<port>`; see `docs/SERVER_APPS.md`). The port comes from `docs/PORTS.md`.
4. Cloudflare terminates TLS, so clients use `https://<hostname>` and the server itself can stay plain HTTP. Free and Pro plans refuse request bodies over 100 MB *(CF docs)*: big imports go over the LAN.

### 2.2 The service token (one per app, or one per owner)
1. *Access controls > Service credentials > Service Tokens > Create service token*. Name it like `turbomusic-clients`.
2. Choose a duration. The default is one year *(CF docs, Terraform default 8760h)*; "non-expiring" exists. **Write the expiry date in the app's notes**: on that day every client silently starts getting the login page. *Refresh* extends it by one year; editing the token chooses a longer duration *(CF docs)*.
3. **Copy the Client ID and the Client Secret now.** The secret is shown only once; if it is lost, generate a new token *(CF docs)*. Store them in the owner's password manager.
4. Rotating the secret keeps the Client ID, creates a new secret, and lets the old one live for a grace period from 1 hour to 30 days, or be revoked at once *(CF docs)*. After a rotation every device needs the new secret: make a **new pairing code** and re-pair (section 5).
5. Secrets created on or after 2026-08-26 use a new, prefixed format; older secrets keep working *(CF docs changelog via search)*. Do not validate the secret's shape in code; treat it as an opaque string.

### 2.3 The Access application
*Access controls > Applications > Add an application > Self-hosted.*
- **Destination:** the tunnel's public hostname (the whole hostname, no path, unless you deliberately split it, see 2.5).
- **Session duration:** this is how long a *human's* portal login lasts (default 24 hours, up to one month) *(CF docs)*. Pick a long one (1 month) for a personal app, it only affects browsers.
- **Policies:** you need exactly these two, and the *action* is what matters:

| Policy name | Action | Include | Used by |
|---|---|---|---|
| `apps` | **Service Auth** | Selector *Service Token*, value: the token from 2.2 | desktop app, Android app, any script, the browser page's API calls once it has a cookie |
| `owner` | **Allow** | Selector *Emails*, value: the owner's address | a person opening the web client in a browser (portal login) |

  Order does not matter between them: **Bypass and Service Auth policies are evaluated first, then Allow and Block policies in list order**, and evaluation stops at the first match *(CF docs)*. So a request with the token goes straight through, and everything else falls to the portal.
- **If the only policy is Allow, a service token is useless**: "Make sure to set the policy action to Service Auth; otherwise, Access will prompt for an identity provider login" *(CF docs)*. This is the single most common reason an app "makes me log in". The token must also be **selected in the Service Auth policy** (creating a token does not grant it anything).
- **Do not use Bypass for an app's API.** Bypass turns Access off for matching traffic, with no enforcement and no logging *(CF docs)*; Service Auth is the enforced, logged way to let apps in.

### 2.4 CORS (only for clients on another origin)
The Android app's page is `http://localhost` and the desktop app's page is a local file, so their `fetch` calls to the tunnel hostname are **cross-origin** and the browser engine sends a CORS preflight (`OPTIONS`) first. A preflight never carries the token, so Access answers it with **403**, "regardless of whether you have logged in" *(CF docs)*. Fix, in the application's *Advanced settings > CORS*: turn on **Bypass options requests to origin** (this removes any other CORS setting on that application) *(CF docs)*. The server's own CORS then answers the preflight and must allow the two headers (section 4.1).
- Our native clients mostly avoid the problem by answering preflights themselves (Android `AccessProxy`) or adding the headers in the main process (Electron), but the setting is cheap and makes every other client work, so turn it on.
- Leave the **binding cookie** off: Cloudflare says not to enable it for non-browser tools *(CF docs)*, and our clients are exactly that.

### 2.5 Optional: protect only the API
If the owner does not want a portal login for the web client at all, they can keep the pages public and Access-protect only `/api`: add the path to the application's destination (`<hostname>/api`) and keep the Service Auth + Allow policies. The app's own token still guards the API and the pages hold no data. TurboMusic does not need this; mention it when an owner asks to remove the portal for browsers.

## 3. What a client may and may not do

| Client | Can send the two headers on | Cannot | What it does |
|---|---|---|---|
| Any script / `fetch` | everything it makes | | adds them to every request |
| Browser tab on the tunnel hostname | nothing on navigation; `fetch` yes | `<img>`, `<audio>`, `EventSource`, the first page load | the portal login sets `CF_Authorization`; after that everything is same-origin and the cookie rides along. `fetch` with the headers also gets the cookie |
| Desktop app (Electron) | everything, in the **main process** | | `session.webRequest.onBeforeSendHeaders` for the server's origin only (`accessHeaders.ts`), so `<audio>` streams with Range and nothing is downloaded whole |
| Android app | page `fetch`; native requests | `<img>`/`<audio>` in the page | `AccessProxy` answers the page's GET/HEAD natively with the headers; the media player, the cover loader and the library loader add them (4.3) |

Rules that follow:
- **A browser cannot be made to skip the portal with a service token.** The token is for apps. If a browser user must not log in, use 2.5 or a longer session.
- When a token is set and the server is on another origin, never go back to "download the file whole, then play it" (the blob workaround in `accessMedia.ts`): it makes every song wait several seconds. Inject the headers where the request is made (Electron main process, Android native layer) so the element streams. The blob path is only the fallback for an old shell *(learned)*.
- Not possible with headers: any stream played by an element from a URL you cannot rewrite (the Soloist "beam"), and `?token=` download links. Give those paths a policy that allows them, or leave them out of Access.

## 4. Code checklist per client (what every app must contain)

### 4.1 Server
```ts
cors({ origin: '*', allowHeaders: ['Authorization', 'Content-Type', 'Range', 'CF-Access-Client-Id', 'CF-Access-Client-Secret'], exposeHeaders: ['Content-Range', 'Accept-Ranges'] })
```
Allowing the two headers is required or the preflight of a header-carrying request fails even though Cloudflare let it through.

### 4.2 Web client
- Settings fields **Access client ID** and **Access client secret** (device settings, never synced), with the explanation "only needed when the server is behind Cloudflare Access".
- `accessHeaders(settings)` returns the two headers only when **both** are set, and is spread into **every** request path: API calls, uploads, health/test-connection, speed test, file `fetch`es. A forgotten path (a raw `fetch` for uploads, the health check) is the usual "works everywhere except X" bug. Grep the code for `fetch(` after wiring.
- Same origin: nothing more. Another origin (inside the shells): media goes through `accessMedia.ts` only if the shell does **not** inject the headers itself (`setAccess` exists in the desktop bridge; `accessInjected()` is true in the Android bridge); event streams use `sse.ts`.
- The Settings fields save with a Save button. **The pairing code must be built from the typed values, not the saved ones** *(learned)*.

### 4.3 Android (native)
- `ServerPrefs` stores id and secret; `accessHeaders()` returns the map or empty. The page hands the values over a bridge method (`setAccess`, or the same call that hands over address and token).
- Every native HTTP request adds the map: the player's data source (`ResolvingDataSource` upstream of the cache), the **bitmap loader** (notification and lock-screen cover; otherwise it downloads the login page and shows nothing), the library/sync loader, update checks to the server, and `AccessProxy` for the page's own GET/HEAD requests.
- `AccessProxy` rules: answer the preflight locally; forward `Range`; stream the body; **replace** (never add) `Access-Control-Allow-Origin` *(learned: two values made Chromium reject every proxied fetch, sync included)*; do not forward `Host`, `Origin`, `Referer`, `Cookie`.
- The decoder for the pairing code must read the service token (`PairCode.kt` in `device-pairing`).

### 4.4 Desktop (Electron)
- `makeRule(serverUrl, id, secret)` + `withAccess` in the main process; the page calls the preload bridge `setAccess(address, id, secret)` whenever the settings change; clear the rule when either part is blank.
- Only for the server's own origin, never for third-party hosts (the secret must not leak to YouTube or Spotify).

## 5. The pairing code (this is where apps fail)

The point of the code is that a phone is set up with one paste and **never shows a login page**. It must contain:

| Field | Meaning | If missing |
|---|---|---|
| `u` address | the **tunnel hostname** (`https://music.example.com`), editable in the panel; a phone should get the tunnel address, not `192.168.x.x` | phone cannot connect away from home |
| `t` token | the app's own token (a per-device token where the app has accounts) | 401 after Access |
| `i` + `s` | the service token's **Client ID and Client Secret** | **the portal login page**, or a 302/403 that looks like "network error" |

Checklist for an app's pairing code and screen:
1. The codec writes `i` and `s` whenever both exist, and **only then** (a half pair is useless).
2. The Make-a-code panel has the Access fields (prefilled from Settings), takes **typed** values, and says in words what the code holds ("address, token and the Cloudflare Access service token").
3. Applying a code (`?pair=` link, paste box, native setup screen) saves **all four** values, not just address and token. The native app forwards them to the native layer too.
4. If the app has no Settings fields for the service token, it must ask when the code is made (`askAccess` in the `PairDevice` panel).
5. The code is the credentials: never log it, remove `?pair=` from the address bar after applying, say so in the UI.
6. After a secret rotation or an expiry, old codes carry a dead secret. The failure is the login page again; the fix is a new code.

## 6. Symptom → cause

| Symptom | Cause | Fix |
|---|---|---|
| App or phone shows / is redirected to the Cloudflare login page | policy action is **Allow**, or the token is not selected in a **Service Auth** policy | 2.3 |
| Same, but only on a freshly paired device | pairing code lacks `i`/`s`, or applying it dropped them | section 5 |
| Same, only for songs/covers (text and sync work) | `<audio>`/`<img>` cannot send headers, the shell does not inject them | 3, 4.3, 4.4 |
| `403` on every request from the Android/desktop page, API works from curl | CORS preflight reaches Access | 2.4 |
| `CORS ... multiple values '*, *'` | a proxy added `Access-Control-Allow-Origin` next to the server's | replace, 4.3 |
| Everything worked, now everything is the login page | the service token expired, or its secret was rotated and the grace period ended | 2.2; re-pair |
| Works on Wi-Fi at home (LAN address), fails outside | the device was given the LAN address | edit the address in the panel before making the code |
| Songs only start after several seconds | media is fetched whole and turned into a blob because headers are not injected | 3 (rule 2) |
| `curl` works with headers but the browser asks to log in | expected: a browser tab cannot send headers | 2.5 or a longer session duration |

## 7. Prove it with curl (do this before blaming the app)

```sh
# 1. Without the token: must NOT reach the app (302 to *.cloudflareaccess.com, or 403)
curl -sI https://music.example.com/api/health

# 2. With the token: must reach the app (200 and the app's JSON)
curl -s https://music.example.com/api/health \
  -H "CF-Access-Client-Id: <id>" -H "CF-Access-Client-Secret: <secret>"

# 3. A Range request through Access (what <audio> sends); expect 206 and a Content-Range
curl -sI https://music.example.com/api/files/<hash> -H "Range: bytes=0-1" \
  -H "CF-Access-Client-Id: <id>" -H "CF-Access-Client-Secret: <secret>" -H "Authorization: Bearer <app token>"
```
If 2 returns the login page, the policy or token is wrong (2.3), not the app. If 2 works and the app does not, the client is not sending the headers on some path (section 4). Cloudflare's *Access controls > Logs > Access authentication logs* show each denied request and which policy it missed.

## 8. For the AI adding or reviewing an app

1. Do the module checklist (`self-hosted-server`), then walk sections 4 and 5 against the code; do not trust "it has the fields", grep for every `fetch(` and every native request.
2. Add a unit test that the pairing code round-trips `i` and `s` and that applying a code saves them.
3. Tell the user, in plain words: create the service token (and save the secret), add the **Service Auth** policy that selects it, switch on *Bypass options requests to origin* if a shell app is involved, write down the token's expiry date.
4. Record in `.turboengine.json` `notes` that Access was set up and which of the clients were checked against the real thing.
