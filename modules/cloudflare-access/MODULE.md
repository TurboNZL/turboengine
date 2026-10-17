# Cloudflare Access service token on every client

A server behind Cloudflare Access wants two headers on every request; this makes web, desktop and Android send them, including for <audio>, <img> and event streams that cannot.

**Start with [`docs/CLOUDFLARE.md`](../../docs/CLOUDFLARE.md)**: the Cloudflare-side setup (service token, Service Auth policy, CORS) and the per-client checklist. This file is only the client code.

Optional. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbomusic` at `62934e8`.

A server behind Cloudflare Access (typically through a Cloudflare tunnel) rejects any request without the service token's two headers, `CF-Access-Client-Id` and `CF-Access-Client-Secret`. Plain `fetch` can send them. `<audio>`, `<img>` and `EventSource` cannot, so each client has its own answer. **If an app runs its own server, this module is mandatory** (see `self-hosted-server`).

## What each client does
- **Web, same origin as the server:** send the headers on every API request (below). Access answers a headered request with a `CF_Authorization` cookie, which `<audio>`/`<img>` then send by themselves.
- **Web page on another origin** (Android app page `http://localhost`, desktop app): the cookie is not shared, so `accessMedia.ts` fetches covers with the headers and hands the element a blob URL (LRU), and `sse.ts` reads event streams with a fetch-based reader instead of `EventSource` (`parseSse` is pure and tested).
- **Electron:** `accessHeaders.ts` adds the two headers in the main process (`session.webRequest.onBeforeSendHeaders`, for the server's origin only), so `<audio>`/`<img>` stream with Range and nothing is downloaded whole first. The page tells main the address and token through the preload bridge (`setAccess`).
- **Android:** `AccessProxy.kt` answers GET/HEAD in `shouldInterceptRequest` with a native request that carries the headers (streamed back, CORS headers added; preflights answered locally). The player needs them too: put them on its data source (below) and on the **bitmap loader**, otherwise the notification/lock-screen cover is the Cloudflare login page and shows nothing.

## Snippets (these live in files that are too app-specific to copy)
Web client, `lib/api.ts`:
```ts
export const accessHeaders = (s: { cfAccessId?: string; cfAccessSecret?: string }): Record<string, string> =>
  s.cfAccessId?.trim() && s.cfAccessSecret?.trim() ? { 'CF-Access-Client-Id': s.cfAccessId.trim(), 'CF-Access-Client-Secret': s.cfAccessSecret.trim() } : {};
```
Server CORS must allow them: `cors({ origin: '*', allowHeaders: ['Authorization', 'Content-Type', 'Range', 'CF-Access-Client-Id', 'CF-Access-Client-Secret'], exposeHeaders: ['Content-Range', 'Accept-Ranges'] })`.

Android, in the media service (read when each request is made, so a change in Settings applies at once):
```kotlin
val upstream = ResolvingDataSource.Factory(DefaultDataSource.Factory(this)) { spec ->
    val extra = prefs.accessHeaders()
    if (extra.isEmpty()) spec else spec.withAdditionalHeaders(extra)
}
// same upstream for the player (through CacheDataSource) and for the notification cover:
val artLoader = DataSourceBitmapLoader(MoreExecutors.listeningDecorator(Executors.newFixedThreadPool(2)), upstream)
MediaLibrarySession.Builder(this, player, callback).setBitmapLoader(artLoader).build()
```

## Gotchas
- A proxy that adds headers to an upstream answer must **replace**, never add, `Access-Control-Allow-Origin`: two values make Chromium reject every proxied fetch (this broke Android sync once).
- Not possible with headers: any stream played by an element from a URL you cannot rewrite (an audio "beam"), and `?token=` download links. Use a Bypass policy for those paths or leave Access off for them.
- For another-origin use the Access application needs "Bypass options requests to origin" (the CORS preflight carries no token) and the binding cookie off.
- The pairing code (`device-pairing`) carries address, token and the service token's id and secret; the Settings fields only save on "Save", so build the code from the typed values, not the saved ones.
- Never run against real Cloudflare when written; the Android parts were not compiled in the session that wrote them.

## Files
- `apps/web/src/lib/accessMedia.ts`
- `apps/web/src/lib/sse.ts`
- `apps/electron/src/accessHeaders.ts`
- `apps/android/app/src/main/kotlin/app/turbomusic/android/AccessProxy.kt`
