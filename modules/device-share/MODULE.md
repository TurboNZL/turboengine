# Device share: send a project to another copy of the app

`electron/share.cjs` (main process) finds other copies on the same network and receives from them; `src/app/share.ts` is the page side (the "Incoming project" window with Accept/Decline, the "Send to another device" window, collecting what to send). Wiring (`ipcMain.handle('share:...')`, the preload bridge, and the `app://…/received/` protocol branch that serves received files) is in TurboCut's `electron/main.cjs` and `electron/preload.cjs`.

Optional. Source: `TurboNZL/turbocut`, where it runs in tests (two instances in one process); **not yet run between two real computers**.

## Protocol
- **Finding:** every instance with sharing on broadcasts `{app, id, name, port, version, platform}` over UDP to the share port every 3 s (to `255.255.255.255` and each network's directed broadcast address) and listens; entries expire after 10 s.
- **Sending:** `POST /offer` (who, project name, counts, total bytes). The receiving person sees it and presses Accept (60 s, then it counts as declined); only then a one-time transfer id is returned. Then `PUT /part/<transfer>/<project|preset|media|font>?name=…` per part, streamed to a folder of its own, and `POST /done/<transfer>`.
- **Safety:** only private, loopback and link-local addresses are answered; nothing is written before Accept; each transfer is capped at the offered size (+1 MB); file names are reduced to a base name; folders older than a day are swept at start.
- Port **47903**, TCP and UDP (`docs/PORTS.md`), `TURBOCUT_SHARE_PORT` changes both.

## Gotchas
- A page cannot listen or broadcast, and cannot `fetch` an `http://` LAN address from a secure origin (mixed content): the main process makes the requests, and the page streams chunks to it over IPC (`share:part-write`, 2 MB at a time, awaited for back-pressure). A browser or the Android WebView cannot take part; Android would need a plugin (`NsdManager` for finding, a `ServerSocket` for receiving).
- Some Wi-Fi networks drop broadcasts between clients ("client isolation"); then nothing is found. A typed address would be the fallback (not built).
- Windows Firewall asks the first time the app listens; say so in the app's guide.
- Fonts and the caption style travel as parts; media travel only if the person ticks it. The receiving page matches media by file name, like opening a project file.

## Phone side: one link (2026-11-01)
`pull.ts`/`receive.ts` plus the shelf in `share.cjs`: the sender puts the parts on a *shelf* behind `http://<address>:47903/shelf/<22-char token>` (128 random bits, valid once, one hour, outlives the Send window); the phone pastes it. An earlier six-digit code needed address typing and a lock-out counter and was dropped as overbuilt. Needs `allowMixedContent` and cleartext traffic in a Capacitor shell (not run on a real phone).
