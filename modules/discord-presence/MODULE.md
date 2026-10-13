# Discord Rich Presence (Electron)

Shows the playing track in Discord through the local IPC socket; needs the app's own Discord application id.

Optional. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbomusic` at `ea3f5ea`.

**Requires:** `window-frame`.

Shows the playing track in Discord through the local IPC socket (`@xhayper/discord-rpc`). Updates are throttled to one per 4 s (Discord allows 5 per 20 s; the newest state wins). Settings shows why it is not connected (no `discord-ipc` socket in the folders searched, or found but unreachable; `XDG_RUNTIME_DIR` falls back to `/run/user/<uid>`).

## Gotchas
- A fresh install needs the app's **own Discord application id** (register one in the Discord developer portal and ship it as the built-in id, or let the user paste it in Settings).
- Tested against a fake IPC socket in vitest and a real Electron under Xvfb, never against a real Discord.

## Files
- `apps/electron/src/discord.ts`
