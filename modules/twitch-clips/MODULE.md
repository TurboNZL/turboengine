# Twitch clips

`src/twitch/clip.ts` parses clip links and resolves them; `electron/twitch.cjs` does the same in Electron's main process (no CORS there); `src/app/twitchDialog.ts` is the window (paste, progress, cancel, file lands in the media bin).

Optional. Source: `TurboNZL/turbocut`. Tested against the response **shape** with mocked fetch (`test/twitch.test.ts`); **never run against live Twitch** from the sandbox (its proxy blocks the host).

## How it works
`POST https://gql.twitch.tv/gql`, body `[{operationName:'ShareClipRenderStatus', variables:{slug}, extensions:{persistedQuery:{version:1, sha256Hash}}}]`, header `Client-ID`. The answer has `data.clip.assets[]` (**first is landscape, second the portrait version**), each with `videoQualities[{quality, frameRate, sourceURL}]`, and `data.clip.playbackAccessToken{signature,value}`. The MP4 is `sourceURL` with `sig=<signature>&token=<value>`. The client id (`ue6666qo983tsx6so1t0vnawi233wa`) and hash (`2db6a3b2…`) are taken from yt-dlp's `twitch.py` (`TwitchClipsIE`), 2026-10.

## Gotchas
- Twitch can change the client id or the hash without notice: when clips stop resolving, compare with yt-dlp's `twitch.py` first. All knowledge of the wire format is in the two twin files; keep them in step (one test file checks both against the same fixture).
- A page cannot fetch it if Twitch does not send CORS headers (unknown); the dialog says so and points to the desktop app.
- Downloading may conflict with Twitch's terms or the creator's rights: the dialog says to use only clips you may use.
