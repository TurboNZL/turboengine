import type { Motif, Palette, ThemeId } from "./types.ts";
import { resolveTheme } from "./theme.ts";
import { safeGet, safeRemove, safeSet, storageKey } from "./options.ts";

const IMAGE_KEY = () => storageKey("wallpaperImage");

export type WallpaperSettings = {
  enabled: boolean;
  /** 0 (as is) to 0.9 (nearly black): opacity of a black layer over the wallpaper. */
  darkness: number;
  custom: boolean;
};

export const getCustomImage = (): string | null => safeGet(IMAGE_KEY());

const mulberry32 = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const motifSvg = (motif: Motif, def: Palette): string => {
  const [h, s, l] = def.primary;
  const rand = mulberry32([...def.id].reduce((a, c) => a + c.charCodeAt(0), 7));
  const ink = def.dark ? `hsl(${h} ${Math.min(s, 80)}% ${Math.max(l, 60)}%)` : `hsl(${h} ${s}% ${Math.min(l, 40)}%)`;
  const ink2 = `hsl(${(h + 40) % 360} ${Math.min(s, 80)}% ${def.dark ? 62 : 38}%)`;
  const W = 1600;
  const H = 900;
  let body = "";
  switch (motif) {
    case "stars":
      for (let i = 0; i < 140; i++) {
        const r = rand() < 0.1 ? 2.2 : rand() * 1.2 + 0.5;
        body += `<circle cx="${(rand() * W).toFixed(0)}" cy="${(rand() * H * 0.85).toFixed(0)}" r="${r.toFixed(1)}" fill="${rand() < 0.2 ? ink2 : ink}" fill-opacity="${(0.25 + rand() * 0.6).toFixed(2)}"/>`;
      }
      break;
    case "waves":
      for (let k = 0; k < 5; k++) {
        const y = 520 + k * 75;
        let d = `M0 ${y}`;
        for (let x = 0; x <= W; x += 100) d += ` Q${x + 50} ${y + (k % 2 ? 38 : -38)} ${x + 100} ${y}`;
        body += `<path d="${d} V${H} H0Z" fill="${k % 2 ? ink2 : ink}" fill-opacity="${(0.07 + k * 0.035).toFixed(3)}"/>`;
      }
      break;
    case "hills":
      for (let k = 0; k < 4; k++) {
        const base = 560 + k * 85;
        let d = `M0 ${base}`;
        for (let x = 0; x < W; x += 200) d += ` C${x + 70} ${base - 90 - rand() * 60} ${x + 130} ${base - 90 - rand() * 60} ${x + 200} ${base - rand() * 40}`;
        body += `<path d="${d} V${H} H0Z" fill="${k % 2 ? ink2 : ink}" fill-opacity="${(0.08 + k * 0.045).toFixed(3)}"/>`;
      }
      break;
    case "peaks":
      for (let k = 0; k < 3; k++) {
        const base = 640 + k * 80;
        let d = `M0 ${H} L0 ${base}`;
        for (let x = 0; x < W; x += 140 + k * 30) d += ` L${x + 70 + rand() * 40} ${base - 120 + k * 25 - rand() * 150} L${x + 150 + k * 30} ${base}`;
        body += `<path d="${d} L${W} ${H}Z" fill="${k % 2 ? ink2 : ink}" fill-opacity="${(0.09 + k * 0.06).toFixed(3)}"/>`;
      }
      break;
    case "grid":
      for (let x = 0; x <= W; x += 80) body += `<path d="M${x} 0V${H}" stroke="${ink}" stroke-opacity=".08"/>`;
      for (let y = 0; y <= H; y += 80) body += `<path d="M0 ${y}H${W}" stroke="${ink}" stroke-opacity=".08"/>`;
      break;
    case "dots":
      for (let y = 40; y < H; y += 70) for (let x = 40 + ((y / 70) % 2) * 35; x < W; x += 70) {
        body += `<circle cx="${x}" cy="${y}" r="${(2 + rand() * 5).toFixed(1)}" fill="${ink}" fill-opacity="${(0.05 + rand() * 0.14).toFixed(2)}"/>`;
      }
      break;
    case "rays":
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 0.9 + Math.PI * 0.55;
        const a2 = a + 0.06;
        body += `<path d="M${W} 0L${(W + Math.cos(a) * 2200).toFixed(0)} ${(Math.sin(a) * 2200).toFixed(0)}L${(W + Math.cos(a2) * 2200).toFixed(0)} ${(Math.sin(a2) * 2200).toFixed(0)}Z" fill="${ink}" fill-opacity="${(0.04 + (i % 3) * 0.03).toFixed(2)}"/>`;
      }
      break;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${body}</svg>`;
};

/** A palette can ask for a different wallpaper than its chrome colours suggest (Marshmallow's chrome is blue, its wallpaper pink). */
const tinted = (def: Palette): Palette => (def.wallpaper ? { ...def, bg: def.wallpaper.bg ?? def.bg, primary: def.wallpaper.primary ?? def.primary } : def);

/** The built-in wallpaper for a theme, as a CSS `background` value. */
export const themeWallpaper = (id: ThemeId): string => {
  const def = tinted(resolveTheme(id));
  const [h, s] = def.primary;
  const [bh, bs, bl] = def.bg;
  const top = `hsl(${bh} ${bs}% ${def.dark ? bl + 2 : bl}%)`;
  const bottom = `hsl(${h} ${Math.min(bs + 10, 60)}% ${def.dark ? bl + 9 : bl - 8}%)`;
  const glow = (pos: string, hue: number, a: number) =>
    `radial-gradient(ellipse at ${pos}, hsl(${hue} ${s}% ${def.dark ? 50 : 62}% / ${a}), transparent 60%)`;
  const svg = `url("data:image/svg+xml,${encodeURIComponent(motifSvg(def.motif, def))}") center / cover no-repeat`;
  return [svg, glow("12% 8%", h, def.dark ? 0.32 : 0.28), glow("90% 90%", (h + 50) % 360, def.dark ? 0.24 : 0.22), `linear-gradient(165deg, ${top}, ${bottom})`].join(", ");
};

let host: HTMLDivElement | null = null;
let img: HTMLDivElement | null = null;
let dim: HTMLDivElement | null = null;

const ensureHost = () => {
  if (host && document.body.contains(host)) return;
  host = document.createElement("div");
  host.id = "bt-wallpaper";
  host.setAttribute("aria-hidden", "true");
  img = document.createElement("div");
  img.className = "bt-wp-img";
  dim = document.createElement("div");
  dim.className = "bt-wp-dim";
  host.append(img, dim);
  document.body.prepend(host);
};

/** Applies the saved wallpaper settings (or the preview override) to the page. */
export const applyWallpaper = (theme: ThemeId, settings: WallpaperSettings) => {
  const root = document.documentElement;
  if (!settings.enabled) {
    root.removeAttribute("data-wallpaper");
    host?.remove();
    host = null;
    return;
  }
  ensureHost();
  const custom = settings.custom ? getCustomImage() : null;
  img!.style.background = custom ? `center / cover no-repeat url("${custom}")` : themeWallpaper(theme);
  // a black layer over a light picture turns it grey: it counts for much less on a light theme
  dim!.style.opacity = String(root.dataset.mode === "light" ? settings.darkness * 0.4 : settings.darkness);
  root.setAttribute("data-wallpaper", "on");
};

/** Shrinks a picked image so it fits in browser storage, and saves it as the custom wallpaper. */
export const saveCustomWallpaper = (file: File): Promise<void> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Please choose an image file"));
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, 1920 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext("2d")!.drawImage(image, 0, 0, canvas.width, canvas.height);
      if (safeSet(IMAGE_KEY(), canvas.toDataURL("image/jpeg", 0.8))) resolve();
      else reject(new Error("That image is too large to store in this browser"));
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image"));
    };
    image.src = url;
  });

export const clearCustomWallpaper = () => safeRemove(IMAGE_KEY());
