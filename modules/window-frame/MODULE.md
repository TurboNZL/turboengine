# Desktop window: custom frame, preload bridge and main process

A theme-drawn title bar (traffic lights by UI style), the preload bridge `window.<app>Desktop`, the single-instance main process, GPU modes and graphics readback.

Optional. Reference files are in `files/` (the paths are the paths in the app); they were taken from Curator at `b6d85a8`, where they are known to work.

- `customFrame` (desktop.json, applies after restart): the page draws minimise/maximise/close from the current UI style; macOS-like styles put the buttons on the left. The `.bt-wf*` rules live in turbothemes.
- `app.setDesktopName('<app>.desktop')` makes the launcher icon and the window one thing on Wayland (`StartupWMClass` in the deb must match).
- **Graphics**: Chromium falls back to software silently. `graphics.ts` reads back what it got and, on Linux, `gpuModes.ts` tries start-up modes in turn ("Automatic"). Do not trust `gl=none` alone: native Wayland with the GPU in the browser process reports it while WebGL/OpenGL are enabled and a real vendor id exists.
- Pass a `Cloudflare Access` service token to requests in the main process (`accessHeaders.ts`) so `<audio>`/`<img>` can stream.
- Discord Rich Presence needs the app's own Discord application id.

## Files
- `apps/web/src/components/WindowFrame.tsx`
- `apps/electron/src/main.ts`
- `apps/electron/src/preload.ts`
- `apps/electron/src/desktopConfig.ts`
- `apps/electron/src/graphics.ts`
- `apps/electron/src/gpuModes.ts`
- `apps/electron/src/accessHeaders.ts`
- `apps/electron/src/discord.ts`
