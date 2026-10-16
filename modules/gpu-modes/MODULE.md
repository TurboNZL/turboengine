# GPU modes and graphics readback (Electron)

Chromium falls back to software rendering silently; this reads back what it got and tries start-up modes in turn ("Automatic").

Optional. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbomusic` at `62934e8`.

**Requires:** `window-frame`.

Electron falls back to software rendering without saying so. `graphics.ts` reads back what Chromium got after start-up and `gpuModes.ts` (Linux) tries start-up switch sets in turn: "Automatic" checks six seconds after the window opens and, if there is no hardware acceleration, saves the next mode and relaunches (at most five tries, then it settles).

## Gotchas
- Do not trust `gl=none` alone: native Wayland with the GPU in the browser process reports it while WebGL and OpenGL are enabled and a real vendor id exists. In a headless sandbox (Xvfb) there is no vendor id, which is the real "software" case.
- Wayland + NVIDIA: `--ozone-platform=wayland` is not compatible with Vulkan; the modes name ANGLE back ends (EGL first on Wayland) and set `disable-features=Vulkan` unless a mode asks for it.
- `TURBOMUSIC_SOFTWARE_RENDERING=1` (rename it) disables the GPU for diagnosis; offer "Copy graphics report" in Settings.
- Never tried on a real GPU when written.

## Files
- `apps/electron/src/graphics.ts`
- `apps/electron/src/gpuModes.ts`
