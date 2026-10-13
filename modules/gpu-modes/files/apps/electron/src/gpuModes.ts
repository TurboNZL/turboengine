/**
 * Ways to start Chromium's graphics on Linux. Which one works depends on the driver and the session (Wayland or X11, NVIDIA's proprietary
 * driver, the GPU sandbox), and Chromium falls back to software rendering without saying so, so the app can try them one after the other
 * on its own ("Automatic") and remember the first that gives real hardware acceleration.
 */
export interface GpuMode {
  id: string;
  label: string;
  hint: string;
  /** command-line switches: [name] or [name, value] */
  switches: [string, string?][];
  /** extra Chromium features (joined with the app's own in `enable-features`) */
  features?: string[];
  /** turn the GPU off entirely */
  software?: boolean;
}

const BASE: [string, string?][] = [['ignore-gpu-blocklist'], ['enable-gpu-rasterization']];

export const GPU_MODES: GpuMode[] = [
  { id: 'egl', label: 'OpenGL ES over EGL (modern, keeps Wayland)', hint: 'ANGLE on the driver\'s EGL/GLES: what Chromium uses on Wayland, since Wayland cannot do Vulkan.', switches: [...BASE, ['use-gl', 'angle'], ['use-angle', 'gles']] },
  { id: 'gl-egl', label: 'OpenGL over EGL', hint: 'ANGLE\'s desktop-OpenGL back end through EGL.', switches: [...BASE, ['use-gl', 'angle'], ['use-angle', 'gl-egl']] },
  { id: 'egl-nosandbox', label: 'OpenGL ES over EGL, no GPU sandbox', hint: 'For NVIDIA\'s proprietary driver when the GPU process cannot start.', switches: [...BASE, ['use-gl', 'angle'], ['use-angle', 'gles'], ['disable-gpu-sandbox']] },
  { id: 'default', label: 'Standard', hint: 'Ask Chromium for the GPU even where its block list says no and let it choose the back end.', switches: BASE },
  { id: 'vulkan', label: 'Vulkan (X11 only)', hint: 'The newest back end. Chromium cannot use it on Wayland, so this starts the app through X11.', switches: [...BASE, ['ozone-platform', 'x11'], ['use-angle', 'vulkan']], features: ['Vulkan'] },
  { id: 'x11', label: 'X11 (XWayland)', hint: 'Use X11 instead of Wayland: fixes GPU start-up failures on many Wayland sessions.', switches: [...BASE, ['ozone-platform', 'x11']] },
  { id: 'x11-nosandbox', label: 'X11 and no GPU sandbox', hint: 'X11 with the GPU sandbox off.', switches: [...BASE, ['ozone-platform', 'x11'], ['disable-gpu-sandbox']] },
  { id: 'wayland', label: 'Wayland (native)', hint: 'Force native Wayland.', switches: [...BASE, ['ozone-platform', 'wayland']] },
  { id: 'software', label: 'Software (no GPU)', hint: 'Turn the GPU off. Slower, but never crashes.', switches: [], software: true },
];

/**
 * The order Automatic tries modes in (software is never tried by itself: it is only chosen by hand). On a Wayland session the options that keep
 * Wayland come first and X11 is the last resort; on X11 the X11 modes would change nothing, so they are left out.
 */
export const autoOrder = (sessionType?: string): string[] =>
  (sessionType ?? '').toLowerCase() === 'wayland'
    ? ['default', 'egl', 'gl-egl', 'egl-nosandbox', 'x11', 'x11-nosandbox']
    : ['default', 'egl', 'gl-egl', 'egl-nosandbox', 'vulkan'];

export interface GpuChoice { mode: string; auto: { step: number; done: boolean } }

/** The mode to start with: the chosen one, or in Automatic the current step of the search. Unknown ids fall back to the standard mode. */
export function activeMode(c: Partial<GpuChoice> | undefined, sessionType?: string): GpuMode {
  const order = autoOrder(sessionType);
  const mode = c?.mode ?? 'auto';
  const id = mode === 'auto' ? order[Math.min(Math.max(c?.auto?.step ?? 0, 0), order.length - 1)] : mode;
  return GPU_MODES.find((m) => m.id === id) ?? GPU_MODES.find((m) => m.id === 'default')!;
}

/**
 * After a start that did not get hardware acceleration: the next step to try, or none when the search is over (done already, or every
 * mode was tried). Tested by `gpuModes.test.ts`.
 */
export function nextAutoStep(c: Partial<GpuChoice> | undefined, gotHardware: boolean, sessionType?: string): { step: number; done: boolean; relaunch: boolean } {
  const order = autoOrder(sessionType);
  const step = Math.min(Math.max(c?.auto?.step ?? 0, 0), order.length - 1);
  if (gotHardware) return { step, done: true, relaunch: false };
  if (step + 1 < order.length) return { step: step + 1, done: false, relaunch: true };
  return { step: 0, done: true, relaunch: false }; // nothing worked: stop trying and go back to the standard mode
}
