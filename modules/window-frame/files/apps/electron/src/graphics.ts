/**
 * What Chromium actually got for painting. Electron falls back to software rendering without a word when the GPU process cannot start
 * or the driver is on Chromium's block list, so the app reads it back and says it (terminal at start-up, Settings > Desktop app).
 *
 * The feature status alone is not enough: with no GPU at all (a VM, a container, a broken driver) it still says "gpu_compositing: enabled",
 * because Chromium then composites on the CPU through its own GL. What gives it away is the GL implementation ("gl=none") and that no
 * GPU device with a vendor id was found, so those are checked too.
 */
export type GpuFacts = {
  /** Chromium's feature status ("enabled", "disabled_software", "unavailable_off", ...) */
  features: Record<string, string>;
  /** the GL string when the driver reports one (empty in a basic query) */
  renderer: string;
  /** e.g. "(gl=egl-angle,angle=opengl)"; "(gl=none,angle=none)" means no GL at all */
  glParts: string;
  /** PCI vendor ids of the GPUs Chromium found (0 = none really found) */
  vendorIds: number[];
};

export type Graphics = {
  hardware: boolean;
  summary: string;
  /** what to show next to the summary: the GL string, else the GL implementation */
  detail: string;
  features: Record<string, string>;
  /** how many times the GPU process has died since the app started (it is restarted a few times, then Chromium gives up on it) */
  gpuCrashes: number;
};

const SOFTWARE = /swiftshader|llvmpipe|softpipe|software|basic render/i;
const on = (v: string | undefined) => !!v && v.startsWith('enabled');

export function describeGraphics(g: GpuFacts, gpuCrashes = 0): Graphics {
  const compositing = g.features.gpu_compositing;
  const softwareGl = SOFTWARE.test(g.renderer) || SOFTWARE.test(g.glParts);
  // "gl=none" alone is not trusted when a real GPU is plainly in use: with the GPU in the browser process (native Wayland on NVIDIA, measured)
  // the basic query leaves the GL string empty although a GPU (vendor id found) runs WebGL and OpenGL
  const glWorks = g.vendorIds.some((v) => v > 0) && on(g.features.webgl) && on(g.features.opengl);
  const noGl = /gl=none/.test(g.glParts) && !glWorks;
  // some sessions (native Wayland on NVIDIA, measured) report no vendor id in the basic query although the GL is a real GPU through ANGLE: a concrete GL
  // implementation that is not software counts as a device
  const noDevice = !g.vendorIds.some((v) => v > 0) && (!g.glParts || noGl);
  const hardware = on(compositing) && !softwareGl && !noGl && !noDevice;
  const why = (v: string | undefined) => (v ?? 'unknown').replace(/_/g, ' ');
  let summary: string;
  if (hardware) summary = on(g.features.rasterization) ? 'Hardware accelerated' : `Hardware compositing, but rasterization is ${why(g.features.rasterization)}`;
  else if (!on(compositing)) summary = `Software rendering: GPU compositing is ${why(compositing)}`;
  else if (softwareGl) summary = 'Software rendering (a software GL such as SwiftShader or llvmpipe)';
  else summary = 'Software rendering: Chromium found no usable GPU or GL driver';
  if (gpuCrashes) summary += `; the GPU process has crashed ${gpuCrashes} time${gpuCrashes === 1 ? '' : 's'}`;
  return { hardware, summary, detail: g.renderer || g.glParts, features: g.features, gpuCrashes };
}
