# Desktop window: custom frame, preload bridge and main process

A theme-drawn title bar (traffic lights by UI style), the preload bridge `window.<app>Desktop`, the single-instance main process, GPU modes and graphics readback.

Optional. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbomusic` at `ea3f5ea`, where they run.

- `customFrame` (desktop.json, applies after restart): the page draws minimise/maximise/close from the current UI style; macOS-like styles put the buttons on the left. The `.bt-wf*` rules live in turbothemes.
- `app.setDesktopName('<app>.desktop')` makes the launcher icon and the window one thing on Wayland (`StartupWMClass` in the deb must match).

## Split out
- GPU start-up modes and the graphics readback: `gpu-modes`.
- Discord Rich Presence: `discord-presence`.
- Service-token headers for requests made by the app: `cloudflare-access`.

## Files
- `apps/web/src/components/WindowFrame.tsx`
- `apps/electron/src/main.ts`
- `apps/electron/src/preload.ts`
- `apps/electron/src/desktopConfig.ts`
