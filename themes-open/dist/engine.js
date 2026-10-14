// engine/src/options.ts
var current = { storagePrefix: "turbothemes", fonts: "cdn", fontsCdn: "https://cdn.jsdelivr.net/npm", lens: true };
var options = () => current;
var setOptions = (o) => {
  current = { ...current, ...o };
};
var storageKey = (name) => `${current.storagePrefix}.${name}`;
var safeGet = (key) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
var safeSet = (key, value) => {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};
var safeRemove = (key) => {
  try {
    window.localStorage.removeItem(key);
  } catch {
  }
};

// engine/src/types.ts
var API_VERSION = 2;

// engine/src/color.ts
var hex = (value) => {
  let v = value.replace("#", "");
  if (v.length === 3) v = v.split("").map((c) => c + c).join("");
  const n = parseInt(v, 16);
  const r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) h = max === r ? (g - b) / d % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [Math.round((h * 60 + 360) % 360), Math.round(s * 100), Math.round(l * 1e3) / 10];
};
var triplet = (h, s, l) => `${h} ${s}% ${l}%`;
var parseTriplet = (v) => {
  const m = v.match(/^\s*(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*$/);
  if (!m) throw new Error(`not a colour: ${v}`);
  return [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
};
var toHsl = (c) => Array.isArray(c) ? c : c.startsWith("#") ? hex(c) : parseTriplet(c);
var toTriplet = (c) => Array.isArray(c) ? triplet(c[0], c[1], c[2]) : c.startsWith("#") ? triplet(...hex(c)) : c;
function readableOn(hexColour) {
  const n = parseInt(hexColour.replace("#", ""), 16);
  const lin = (c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  const lum = 0.2126 * lin(n >> 16 & 255) + 0.7152 * lin(n >> 8 & 255) + 0.0722 * lin(n & 255);
  return lum > 0.4 ? "240 10% 8%" : "0 0% 100%";
}

// engine/src/palette.ts
var NAMES = {
  card: "card",
  popover: "popover",
  secondary: "secondary",
  muted: "muted",
  accent: "accent",
  border: "border",
  input: "input",
  mutedFg: "muted-foreground",
  fg: "foreground"
};
var applyOverrides = (vars, spec) => {
  const ov = spec.overrides;
  if (ov) {
    for (const [k, v] of Object.entries(ov)) {
      if (!v) continue;
      vars[NAMES[k]] = toTriplet(v);
      if (k === "fg") for (const x of ["card-foreground", "popover-foreground", "secondary-foreground", "accent-foreground"]) vars[x] = toTriplet(v);
      if (k === "card" && !ov.popover) vars.popover = toTriplet(v);
    }
  }
  for (const [k, v] of Object.entries(spec.vars ?? {})) vars[k] = toTriplet(v);
  return vars;
};
var darkVars = (s, bg, primary) => {
  const [h, sat, l] = bg;
  const k = s.step ?? 1;
  const lightAccent = primary[2] > 62;
  const fg = s.fg !== void 0 ? toTriplet(s.fg) : triplet(h, Math.min(sat, 30), 95);
  return applyOverrides({
    background: triplet(h, sat, l),
    foreground: fg,
    card: triplet(h, sat, l + 4.5 * k),
    "card-foreground": fg,
    popover: triplet(h, sat, l + 4.5 * k),
    "popover-foreground": fg,
    primary: triplet(...primary),
    "primary-foreground": s.onPrimary !== void 0 ? toTriplet(s.onPrimary) : lightAccent ? triplet(h, 40, 10) : "0 0% 100%",
    secondary: triplet(h, Math.min(sat, 30), l + 10 * k),
    "secondary-foreground": fg,
    muted: triplet(h, Math.min(sat, 30), l + 10 * k),
    "muted-foreground": s.mutedFg !== void 0 ? toTriplet(s.mutedFg) : triplet(h, Math.min(sat, 16), 68),
    accent: triplet(h, Math.min(sat, 30), l + 15 * k),
    "accent-foreground": fg,
    destructive: "0 62.8% 40%",
    "destructive-foreground": "0 0% 98%",
    border: triplet(h, Math.min(sat, 30), l + 11 * k),
    input: triplet(h, Math.min(sat, 30), l + 15 * k),
    ring: triplet(primary[0], primary[1], Math.min(primary[2] + 4, 80)),
    positive: "142 69% 58%",
    negative: "0 91% 71%"
  }, s);
};
var lightVars = (s, bg, primary) => {
  const [h, sat, l] = bg;
  const fg = s.fg !== void 0 ? toTriplet(s.fg) : triplet(222, 47, 11);
  return applyOverrides({
    background: triplet(h, sat, l),
    foreground: fg,
    card: triplet(h, sat, Math.min(l + 3.5, 100)),
    "card-foreground": fg,
    popover: triplet(h, sat, Math.min(l + 3.5, 100)),
    "popover-foreground": fg,
    primary: triplet(...primary),
    "primary-foreground": s.onPrimary !== void 0 ? toTriplet(s.onPrimary) : "0 0% 100%",
    secondary: triplet(h, sat, l - 4.5),
    "secondary-foreground": fg,
    muted: triplet(h, sat, l - 4),
    "muted-foreground": s.mutedFg !== void 0 ? toTriplet(s.mutedFg) : triplet(h, 14, 38),
    accent: triplet(h, sat, l - 9),
    "accent-foreground": fg,
    destructive: "0 84.2% 60.2%",
    "destructive-foreground": "210 40% 98%",
    border: triplet(h, sat, l - 9),
    input: triplet(h, sat, l - 12),
    ring: triplet(...primary),
    positive: "142 71% 30%",
    negative: "0 72% 45%"
  }, s);
};
function buildPalette(spec) {
  const bg = toHsl(spec.bg), primary = toHsl(spec.primary), dark = spec.mode === "dark";
  return {
    id: spec.id,
    label: spec.label,
    dark,
    bg,
    primary,
    motif: spec.motif,
    own: spec.own,
    note: spec.note,
    group: spec.group ?? "colour",
    wallpaper: spec.wallpaper ? { bg: spec.wallpaper.bg ? toHsl(spec.wallpaper.bg) : void 0, primary: spec.wallpaper.primary ? toHsl(spec.wallpaper.primary) : void 0 } : void 0,
    vars: spec.own ? {} : dark ? darkVars(spec, bg, primary) : lightVars(spec, bg, primary)
  };
}
var tokens = (p) => {
  const v = p.vars;
  if (!v.background) return {};
  const [h, s, l] = p.primary;
  return {
    bg: v.background,
    surface: v.card,
    raised: v.secondary,
    line: v.border,
    hover: v.accent,
    fg: v.foreground,
    muted: v["muted-foreground"],
    accent: v.primary,
    "accent-fg": v["primary-foreground"],
    good: v.positive,
    bad: v.negative,
    warn: p.dark ? "42 92% 58%" : "38 90% 40%",
    top: `${h} ${Math.max(s, 60)}% ${p.dark ? Math.max(l, 64) : Math.min(l, 42)}%`
  };
};
var TOKEN_NAMES = ["bg", "surface", "raised", "line", "hover", "fg", "muted", "accent", "accent-fg", "good", "warn", "bad", "top"];

// engine/src/catalog.ts
var state = null;
var revision = 0;
var listeners = /* @__PURE__ */ new Set();
var sorted = (a) => [...a].sort((x, y) => (x.order ?? 1e9) - (y.order ?? 1e9) || x.id.localeCompare(y.id));
function validateCatalog(c) {
  const bad = [];
  const x = c;
  if (!x || typeof x !== "object") return ["not an object"];
  if (typeof x.apiVersion !== "number") bad.push("apiVersion missing");
  for (const k of ["palettes", "styles"]) if (!Array.isArray(x[k])) bad.push(`${k} is not a list`);
  if (!x.config || typeof x.config !== "object" || !x.config.defaults) bad.push("config.defaults missing");
  if (bad.length) return bad;
  const seen = /* @__PURE__ */ new Set();
  for (const p of x.palettes) {
    if (!p.id || !p.label || p.mode !== "dark" && p.mode !== "light") bad.push(`palette ${p.id ?? "?"} is incomplete`);
    if (seen.has(p.id)) bad.push(`duplicate palette ${p.id}`);
    seen.add(p.id);
  }
  for (const s of x.styles) if (!s.id || !s.label) bad.push(`style ${s.id ?? "?"} is incomplete`);
  const badRegex = (c2) => {
    if (!c2 || typeof c2 !== "object") return false;
    const d = c2;
    for (const k of ["ua", "platform", "env"]) if (d[k] !== void 0) {
      try {
        new RegExp(d[k], "i");
      } catch {
        return true;
      }
    }
    return [...d.all ?? [], ...d.any ?? []].some(badRegex);
  };
  if (!Array.isArray(x.config.devices) || x.config.devices.some((r) => !r || badRegex(r.when))) bad.push("a device rule is broken");
  if (!seen.has(x.config.defaults.theme)) bad.push("the default palette does not exist");
  if (!x.styles.some((s) => s.id === x.config.defaults.ui)) bad.push("the default style does not exist");
  return bad;
}
function setCatalog(catalog) {
  const palettes = sorted(catalog.palettes).map((p) => buildPalette(p));
  state = { catalog, palettes, byId: new Map(palettes.map((p) => [p.id, p])), styles: new Map(catalog.styles.map((s) => [s.id, s])) };
  revision++;
  listeners.forEach((fn) => fn());
}
var need = () => {
  if (!state) throw new Error("turbothemes: no catalog yet. Call start() first.");
  return state;
};
var getCatalog = () => need().catalog;
var config = () => need().catalog.config;
var getRevision = () => revision;
function subscribe(fn) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
var listPalettes = () => need().palettes;
var getPalette = (id) => need().byId.get(id);
function listThemes() {
  const s = need();
  return [
    ...s.catalog.config.choices.theme.map((c) => ({ id: c.id, label: c.label, dark: null, note: c.note })),
    ...s.palettes.map((p) => ({ id: p.id, label: p.label, dark: p.dark, note: p.note, group: p.group }))
  ];
}
function listStyles() {
  const s = need();
  return [...s.catalog.config.choices.ui.map((c) => ({ id: c.id, label: c.label, description: c.description ?? "", font: c.font ?? "system-ui" })), ...sorted(s.catalog.styles)];
}
var getStyle = (id) => need().styles.get(id);
var isTheme = (id) => typeof id === "string" && (need().catalog.config.choices.theme.some((c) => c.id === id) || need().byId.has(id));
var isUiStyle = (id) => typeof id === "string" && (need().catalog.config.choices.ui.some((c) => c.id === id) || need().styles.has(id));

// engine/src/device.ts
var re = (pattern, value) => new RegExp(pattern, "i").test(value);
function matches(c, d) {
  if (c.ua !== void 0 && !re(c.ua, d.ua ?? "")) return false;
  if (c.platform !== void 0 && !re(c.platform, d.platform ?? "")) return false;
  if (c.env !== void 0 && !re(c.env, d.desktopEnv ?? "")) return false;
  if (c.minTouchPoints !== void 0 && (d.touchPoints ?? 0) < c.minTouchPoints) return false;
  if (c.all && !c.all.every((x) => matches(x, d))) return false;
  if (c.any && !c.any.some((x) => matches(x, d))) return false;
  return true;
}
function detectLook(d, rules = config().devices) {
  for (const r of rules) if (matches(r.when, d)) return { ui: r.ui, light: r.light, dark: r.dark, name: r.name };
  return { ...config().fallbackDevice };
}
var cached = null;
var hostInfo = {};
function setHostInfo(info) {
  hostInfo = info;
  cached = null;
}
function deviceLook() {
  if (cached) return cached;
  if (typeof navigator === "undefined") return detectLook({ ua: "" });
  cached = detectLook({ ua: navigator.userAgent, platform: navigator.platform, touchPoints: navigator.maxTouchPoints, ...hostInfo });
  return cached;
}
var prefersDark = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;
var effectiveUi = (ui) => ui === "auto" ? deviceLook().ui : ui;
var effectiveTheme = (theme) => {
  if (theme !== "auto") return theme;
  const l = deviceLook();
  return prefersDark() ? l.dark : l.light;
};

// builtin:builtin
var builtin_default = { "manifest": { "apiVersion": 2, "hash": "jc2l4pjnt2", "built": "2026-10-14T07:32:44.950Z", "files": { "catalog": "themes.json", "css": "themes.css" } }, "catalog": { "apiVersion": 2, "palettes": [{ "id": "default", "label": "Standard v2", "mode": "dark", "bg": [240, 12, 7], "primary": [262, 83, 66], "motif": "stars", "own": true, "note": "Dark, medium density", "group": "own", "order": 0 }, { "id": "classic", "label": "Classic", "mode": "dark", "bg": [240, 6, 4], "primary": [217, 91, 60], "motif": "grid", "own": true, "note": "The original look, tighter", "group": "own", "order": 10 }, { "id": "light", "label": "Light", "mode": "light", "bg": [40, 20, 97], "primary": [262, 70, 52], "motif": "hills", "own": true, "note": "Light, medium density", "group": "own", "order": 20 }, { "id": "daylight", "label": "Daylight", "mode": "light", "bg": [210, 40, 96.5], "primary": [221, 83, 48], "fg": "222 84% 5%", "mutedFg": "215 16% 42%", "motif": "waves", "group": "colour", "order": 30 }, { "id": "sand", "label": "Sand", "mode": "light", "bg": [40, 33, 95], "primary": [28, 90, 40], "fg": "28 30% 12%", "mutedFg": "30 14% 36%", "motif": "hills", "group": "colour", "order": 40 }, { "id": "dark", "label": "Slate", "mode": "dark", "bg": [222, 47, 5], "primary": [217, 91, 55], "motif": "grid", "group": "colour", "order": 50 }, { "id": "midnight", "label": "Midnight", "mode": "dark", "bg": [232, 50, 6], "primary": [243, 85, 67], "motif": "stars", "group": "colour", "order": 60 }, { "id": "ocean", "label": "Ocean", "mode": "dark", "bg": [200, 60, 6], "primary": [188, 85, 42], "motif": "waves", "group": "colour", "order": 70 }, { "id": "forest", "label": "Forest", "mode": "dark", "bg": [160, 35, 5], "primary": [152, 69, 38], "motif": "peaks", "group": "colour", "order": 80 }, { "id": "plum", "label": "Plum", "mode": "dark", "bg": [285, 35, 6], "primary": [322, 75, 52], "motif": "dots", "group": "colour", "order": 90 }, { "id": "crimson", "label": "Crimson", "mode": "dark", "bg": [350, 40, 6], "primary": [351, 78, 52], "motif": "rays", "group": "colour", "order": 100 }, { "id": "ember", "label": "Ember", "mode": "dark", "bg": [22, 40, 6], "primary": [24, 94, 52], "motif": "peaks", "group": "colour", "order": 110 }, { "id": "graphite", "label": "Graphite", "mode": "dark", "bg": [220, 8, 9], "primary": [213, 60, 58], "motif": "grid", "step": 0.9, "group": "colour", "order": 120 }, { "id": "amoled", "label": "AMOLED black", "mode": "dark", "bg": [0, 0, 0], "primary": [190, 90, 50], "motif": "stars", "step": 1.4, "group": "colour", "order": 130 }, { "id": "nord", "label": "Nord", "mode": "dark", "bg": [220, 16, 17], "primary": [193, 43, 67], "fg": "218 27% 94%", "mutedFg": "219 15% 70%", "motif": "peaks", "step": 1.1, "group": "colour", "order": 140 }, { "id": "dracula", "label": "Dracula", "mode": "dark", "bg": [231, 15, 15], "primary": [265, 89, 72], "fg": "60 30% 96%", "mutedFg": "225 20% 72%", "motif": "dots", "step": 1.1, "group": "colour", "order": 150 }, { "id": "mocha", "label": "Mocha", "mode": "dark", "bg": [240, 21, 11], "primary": [267, 84, 78], "fg": "226 64% 88%", "mutedFg": "228 24% 72%", "motif": "hills", "step": 1.1, "group": "colour", "order": 160 }, { "id": "tokyo", "label": "Tokyo Night", "mode": "dark", "bg": [235, 22, 9], "primary": [222, 89, 70], "fg": "229 35% 82%", "mutedFg": "229 20% 62%", "motif": "stars", "step": 1.1, "group": "colour", "order": 170 }, { "id": "gruvbox", "label": "Gruvbox", "mode": "dark", "bg": [0, 0, 12], "primary": [42, 95, 55], "fg": "43 59% 81%", "mutedFg": "40 20% 62%", "motif": "hills", "step": 1.1, "group": "colour", "order": 180 }, { "id": "solarized", "label": "Solarized Dark", "mode": "dark", "bg": [193, 100, 9], "primary": [205, 69, 49], "fg": "44 87% 94%", "mutedFg": "186 13% 62%", "motif": "waves", "step": 1.2, "group": "colour", "order": 190 }, { "id": "soft", "label": "Soft light", "mode": "light", "bg": "#fafafb", "primary": "#3584e4", "fg": "#2e3436", "mutedFg": "#5e5c64", "motif": "hills", "overrides": { "card": "#ffffff", "secondary": "#ebebed", "muted": "#ebebed", "accent": "#e1e1e4", "border": "#d8d8dc", "input": "#cfcfd4" }, "group": "colour", "order": 200 }, { "id": "soft-dark", "label": "Soft dark", "mode": "dark", "bg": "#222226", "primary": "#3584e4", "onPrimary": "0 0% 100%", "fg": "0 0% 100%", "mutedFg": "#c0bfbc", "motif": "hills", "overrides": { "card": "#303030", "secondary": "#3a3a3a", "muted": "#383838", "accent": "#464646", "border": "#3d3d3d", "input": "#4a4a4a" }, "group": "colour", "order": 210 }, { "id": "bevel", "label": "Classic grey", "mode": "light", "bg": "#008080", "primary": "#000080", "fg": "#000000", "mutedFg": "#404040", "motif": "grid", "overrides": { "card": "#c0c0c0", "secondary": "#d4d0c8", "muted": "#d4d0c8", "accent": "#a6a6a6", "border": "#808080", "input": "#808080" }, "group": "colour", "order": 310 }, { "id": "terminal", "label": "Phosphor green", "mode": "dark", "bg": "#04150a", "primary": "#35ff74", "onPrimary": "141 68% 5%", "fg": "#35ff74", "mutedFg": "#1fb350", "motif": "grid", "overrides": { "card": "#072214", "secondary": "#0a2e1a", "muted": "#0a2e1a", "accent": "#0f3d22", "border": "#12652f", "input": "#0a2e1a" }, "group": "inspired", "order": 380 }, { "id": "lcd", "label": "Four greens", "mode": "light", "bg": "#9bbc0f", "primary": "#306230", "onPrimary": "71 85% 40%", "fg": "#0f380f", "mutedFg": "#306230", "motif": "dots", "overrides": { "card": "#8bac0f", "secondary": "#8bac0f", "muted": "#8bac0f", "accent": "#8bac0f", "border": "#306230", "input": "#8bac0f" }, "group": "inspired", "order": 400 }, { "id": "neon", "label": "Neon yellow", "mode": "dark", "bg": "#0a0a10", "primary": "#fcee0a", "onPrimary": "0 0% 0%", "fg": "#f2f2f2", "mutedFg": "#8c8c99", "motif": "grid", "overrides": { "card": "#12121a", "secondary": "#1c1c26", "muted": "#1c1c26", "accent": "#2b2b10", "border": "#4a4a1c", "input": "#181822" }, "group": "inspired", "order": 420 }, { "id": "zinc", "label": "Standard v1", "mode": "dark", "bg": "#09090b", "primary": "#2563eb", "onPrimary": "0 0% 100%", "fg": "#fafafa", "mutedFg": "#71717a", "motif": "grid", "overrides": { "card": "#101012", "secondary": "#18181b", "muted": "#18181b", "accent": "#27272a", "border": "#27272a", "input": "#27272a" }, "vars": { "positive": "#10b981", "negative": "#ef4444" }, "group": "platform", "order": 500, "source": "The first version of the app: Tailwind zinc on near-black (zinc-950 page, zinc-900 fields, zinc-800 borders, zinc-500 captions), blue-600 buttons" }, { "id": "material", "label": "Tonal", "mode": "light", "bg": "#fef7ff", "primary": "#6750a4", "fg": "#1d1b20", "mutedFg": "#49454f", "motif": "dots", "overrides": { "card": "#f7f2fa", "secondary": "#e8def8", "muted": "#ece6f0", "accent": "#e8def8", "border": "#cac4d0", "input": "#79747e" }, "group": "colour", "order": 510 }, { "id": "material-dark", "label": "Tonal dark", "mode": "dark", "bg": "#141218", "primary": "#d0bcff", "onPrimary": "#381e72", "fg": "#e6e0e9", "mutedFg": "#cac4d0", "motif": "dots", "overrides": { "card": "#211f26", "secondary": "#4a4458", "muted": "#2b2930", "accent": "#4a4458", "border": "#49454f", "input": "#938f99" }, "group": "colour", "order": 520 }], "styles": [{ "id": "default", "label": "Standard v2", "description": "The app's own look. Follows the colour theme's rounding and density (Classic is tighter).", "font": "Inter", "matching": { "light": "light", "dark": "default" }, "order": 10 }, { "id": "soft", "label": "Soft rounded", "description": "A flush grey sidebar and flat header bar, 6 px grey buttons and entries, 12 px outlined cards and popovers, white round slider knobs.", "font": "system-ui", "matching": { "light": "soft", "dark": "soft-dark" }, "order": 20 }, { "id": "bevel", "label": "Classic bevel", "description": "Grey bevelled 3D controls, navy title bars, no animation and small bitmap-style type.", "font": "system-ui", "matching": { "light": "bevel" }, "order": 80 }, { "id": "toolbar", "label": "Standard v1", "description": "The first version's look: bordered cover tiles, uppercase black headings, a wordmark and a three-column player. Pairs with the Standard v1 colours; its toolbar arrangement is the Standard v1 layout, which any look can use.", "font": "system-ui", "matching": { "light": "zinc", "dark": "zinc" }, "order": 110 }, { "id": "liquid", "label": "Glass lens", "description": "Translucent floating bars that bend the light behind them, rim highlights, springy press and morphing menus.", "font": "system-ui", "matching": { "light": "light", "dark": "default" }, "effects": ["liquid-glass"], "order": 120 }, { "id": "terminal", "label": "Green terminal", "description": "Green phosphor on black: one hue, square frames, glowing type, scan lines and menus that pick by inverting.", "font": "VT323", "matching": { "light": "terminal", "dark": "terminal" }, "fonts": [{ "package": "vt323", "weights": [400] }], "order": 200 }, { "id": "lcd", "label": "Pocket LCD", "description": "The four greens of a handheld LCD, 2 px square frames, hard shadows, inverted picks and pixel type. Covers are tinted green.", "font": "Press Start 2P", "matching": { "light": "lcd", "dark": "lcd" }, "fonts": [{ "package": "press-start-2p", "weights": [400] }, { "package": "vt323", "weights": [400] }], "order": 220 }, { "id": "neon", "label": "Neon night", "description": "Near-black with caution-tape yellow and cyan glints, chamfered corners, condensed capitals and solid yellow selection bars.", "font": "Barlow Condensed", "matching": { "light": "neon", "dark": "neon" }, "fonts": [{ "package": "barlow-condensed", "weights": [400, 600, 700, 800, 900], "italic": [700, 800, 900] }], "order": 240 }, { "id": "material", "label": "Material", "description": "Pill buttons, tonal surfaces, filled fields with an underline and rounded dialogs in Roboto.", "font": "Roboto", "matching": { "light": "material", "dark": "material-dark" }, "fonts": [{ "package": "roboto", "weights": [400, 500, 700] }], "order": 330 }], "config": { "defaults": { "theme": "default", "ui": "default" }, "system": { "dark": "default", "light": "light" }, "choices": { "theme": [{ "id": "auto", "label": "Match this device", "note": "The palette of your device's own look, light or dark by its setting" }, { "id": "system", "label": "System", "note": "Follows your device" }], "ui": [{ "id": "auto", "label": "Match this device", "description": "Picks Material on Android phones and Chromebooks and the standard look everywhere else. Follows the device's light or dark setting.", "font": "system-ui" }] }, "fallbackDevice": { "name": "Standard v2", "ui": "default", "light": "light", "dark": "default" }, "devices": [{ "name": "Material", "when": { "ua": "Android" }, "ui": "material", "light": "material", "dark": "material-dark" }, { "name": "ChromeOS (Material)", "when": { "ua": "CrOS" }, "ui": "material", "light": "material", "dark": "material-dark" }] } }, "css": `[data-theme=default]{--bg: 240 12% 7%;--surface: 240 10% 10%;--raised: 240 9% 14%;--line: 240 8% 20%;--hover: 240 8% 20%;--fg: 240 20% 96%;--muted: 240 8% 62%;--accent: 262 83% 66%;--accent-fg: 0 0% 100%;--good: 152 60% 50%;--warn: 42 92% 58%;--bad: 0 78% 64%;--top: 200 95% 65%;--radius: 14px;--font: "Inter", ui-sans-serif, system-ui, sans-serif;--row-y: .5rem;--grid-min: 11rem}[data-theme=light]{--bg: 40 20% 97%;--surface: 0 0% 100%;--raised: 40 15% 93%;--line: 40 10% 86%;--hover: 40 10% 86%;--fg: 240 15% 12%;--muted: 240 6% 42%;--accent: 262 70% 52%;--accent-fg: 0 0% 100%;--good: 152 60% 34%;--warn: 38 90% 40%;--bad: 0 70% 48%;--top: 210 90% 42%;--radius: 14px;--font: "Inter", ui-sans-serif, system-ui, sans-serif;--row-y: .5rem;--grid-min: 11rem}[data-theme=classic]{--bg: 240 6% 4%;--surface: 240 6% 7%;--raised: 240 4% 12%;--line: 240 4% 16%;--hover: 240 4% 16%;--fg: 0 0% 98%;--muted: 240 5% 56%;--accent: 217 91% 60%;--accent-fg: 0 0% 100%;--good: 158 64% 52%;--warn: 48 96% 53%;--bad: 0 91% 71%;--top: 213 94% 68%;--radius: 8px;--font: ui-sans-serif, system-ui, sans-serif;--row-y: .3rem;--grid-min: 8.5rem}[data-theme=classic] h1{font-weight:900;text-transform:uppercase;letter-spacing:-.025em}[data-theme=classic] h2{font-weight:900;text-transform:uppercase;letter-spacing:.1em;font-size:.875rem;line-height:1.25rem}[data-theme=classic] .card{border-radius:var(--radius);background:hsl(var(--surface) / .5)}[data-ui=soft] .bt-wf-close:is(:hover,:focus-visible){background:color-mix(in srgb,currentColor 22%,transparent);color:inherit}[data-ui=soft] .bt-wf-btn{--wf-r: 9999px;width:1.7rem;height:1.7rem}[data-ui=soft]{--chk-size: 1.1rem;--chk-r: 4px;--chk-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 28%, transparent);--chk-bg: transparent;--chk-hover-border: color-mix(in srgb, hsl(var(--fg)) 45%, transparent);--radius: 12px;--ctl-r: 6px;--card-r: 12px;--win-r: 12px;--menu-r: 12px;--nav-r: 6px;--font: "soft Sans", "Inter", system-ui, sans-serif;--dur: .15s;--ease: cubic-bezier(.25, .46, .45, .94);--tb-justify: center;--btn-bg: color-mix(in srgb, hsl(var(--fg)) 8%, transparent);--btn-hover-bg: color-mix(in srgb, hsl(var(--fg)) 13%, transparent);--btn-weight: 400;--btn-active-transform: none;--btn-active-shadow: inset 0 0 0 99px color-mix(in srgb, hsl(var(--fg)) 6%, transparent);--btn-accent-hover-bg: color-mix(in srgb, hsl(var(--accent)) 88%, white);--ghost-hover-bg: color-mix(in srgb, hsl(var(--fg)) 8%, transparent);--in-bg: color-mix(in srgb, hsl(var(--fg)) 7%, transparent);--in-border: 1px solid transparent;--in-hover-border: transparent;--in-focus-border: transparent;--in-shadow: none;--in-focus-shadow: 0 0 0 2px hsl(var(--accent) / .85);--card-bg: hsl(var(--surface));--card-border: 0 solid transparent;--card-shadow: 0 0 0 1px color-mix(in srgb, hsl(var(--fg)) 8%, transparent), 0 1px 3px rgb(0 0 0 / .1), 0 1px 2px rgb(0 0 0 / .06);--win-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 12%, transparent);--win-shadow: 0 8px 30px rgb(0 0 0 / .3), 0 2px 8px rgb(0 0 0 / .2);--dialog-anim: bt-pop .18s cubic-bezier(.2, .8, .3, 1);--tb-bg: color-mix(in srgb, hsl(var(--fg)) 5%, hsl(var(--surface)));--tb-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 12%, transparent);--tb-pad: .7rem 1rem;--tb-weight: 700;--tb-size: 1rem;--close-bg: color-mix(in srgb, hsl(var(--fg)) 8%, transparent);--close-r: 9999px;--close-hover-bg: color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--bar-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 12%, transparent);--menu-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 10%, transparent);--pop-shadow: 0 2px 10px rgb(0 0 0 / .25), 0 0 0 1px rgb(0 0 0 / .04);--menu-anim: bt-fade .12s ease-out;--menu-hi-bg: color-mix(in srgb, hsl(var(--fg)) 9%, transparent);--side-bg: color-mix(in srgb, hsl(var(--fg)) 5%, hsl(var(--bg)));--side-shadow: none;--top-bg: color-mix(in srgb, hsl(var(--fg)) 6%, hsl(var(--bg)));--top-shadow: none;--player-bg: color-mix(in srgb, hsl(var(--fg)) 6%, hsl(var(--bg)));--player-shadow: none;--nav-hover-bg: color-mix(in srgb, hsl(var(--fg)) 6%, transparent);--nav-active-bg: color-mix(in srgb, hsl(var(--fg)) 10%, transparent);--nav-active-fg: hsl(var(--fg));--row-hover: color-mix(in srgb, hsl(var(--fg)) 6%, transparent);--row-current: color-mix(in srgb, hsl(var(--fg)) 9%, transparent);--rng-appearance: none;--rng-h: .4rem;--rng-track: color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--rng-tw: 1.15rem;--rng-th: 1.15rem;--rng-thumb: #fff;--rng-ts: 0 1px 3px rgb(0 0 0 / .45), 0 0 0 1px rgb(0 0 0 / .08)}[data-ui=soft] .bt-titlebar{position:relative}[data-ui=soft] .bt-titlebar .bt-close{position:absolute;right:.6rem;top:50%;transform:translateY(-50%);padding:.3rem}html[data-ui=soft] ::selection{background:color-mix(in srgb,hsl(var(--accent)) 40%,transparent)}[data-ui=soft] .bt-shell{-webkit-backdrop-filter:none;backdrop-filter:none}[data-ui=soft] .bt-top{backdrop-filter:none;-webkit-backdrop-filter:none}[data-ui=soft] .bt-nav{font-weight:400;padding-block:.55rem;color:hsl(var(--fg))}[data-ui=soft] .bt-nav[aria-current=page]{font-weight:500}[data-ui=soft] .bt-brand{font-size:1rem;font-weight:700}[data-ui=soft] .btn.btn-accent{font-weight:500}[data-ui=soft] h1{font-weight:800;letter-spacing:0}[data-ui=soft] .card.overflow-hidden .bt-row+.bt-row,[data-ui=soft] .card.overflow-hidden>div+div{border-top:1px solid color-mix(in srgb,hsl(var(--fg)) 8%,transparent)}[data-ui=soft] .chip{background:color-mix(in srgb,hsl(var(--fg)) 8%,transparent)}[data-ui=soft]{--player-in: bt-slide-in .32s cubic-bezier(.2, .8, .3, 1) both;--player-out: bt-slide-out .22s ease-in both;--player-ms: .22s;--pop-out: bt-fade-out .15s ease-in both;--pop-ms: .15s}[data-ui=soft]{--page-in: bt-fade .22s ease-out backwards}[data-ui=bevel] .bt-wf-btn{--wf-r: 0;--wf-bg: #c0c0c0;--wf-hover: #c0c0c0;--wf-active: #c0c0c0;--wf-shadow: inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px #808080, inset 2px 2px #dfdfdf;width:1.15rem;height:1rem;color:#000}[data-ui=bevel] .bt-wf-btn:active{box-shadow:inset 1px 1px #0a0a0a,inset -1px -1px #fff,inset 2px 2px gray,inset -2px -2px #dfdfdf}[data-ui=bevel] .bt-wf-close:is(:hover,:focus-visible){background:silver;color:#000}[data-ui=bevel]{--chk-size: .95rem;--chk-r: 0;--chk-border: 0 solid transparent;--chk-bg: #fff;--chk-shadow: inset -1px -1px #fff, inset 1px 1px #808080, inset -2px -2px #dfdfdf, inset 2px 2px #000;--chk-hover-border: transparent;--chk-on-bg: #fff;--chk-on-border: transparent;--chk-on-fg: #000;--chk-radio-on-bg: #fff;--chk-dot: #000;--chk-focus: inset -1px -1px #fff, inset 1px 1px #808080, inset -2px -2px #dfdfdf, inset 2px 2px #000, 0 0 0 1px #000;--radius: 0px;--ctl-r: 0;--card-r: 0;--win-r: 0;--menu-r: 0;--nav-r: 0;--chip-r: 0;--font: "MS Sans Serif", "a desktop OS Sans Serif", "DejaVu Sans", Verdana, sans-serif;--title-font: var(--font);--b98-raised: inset -1px -1px #0a0a0a, inset 1px 1px #ffffff, inset -2px -2px #808080, inset 2px 2px #dfdfdf;--b98-sunken: inset -1px -1px #ffffff, inset 1px 1px #808080, inset -2px -2px #dfdfdf, inset 2px 2px #0a0a0a;--b98-title: linear-gradient(90deg, hsl(var(--accent)), #1084d0);--dur: 0ms;--dialog-anim: bt-none 1ms;--menu-anim: none;--btn-bg: hsl(var(--surface));--btn-fg: #000;--btn-border: 0 solid transparent;--btn-shadow: var(--b98-raised);--btn-weight: 400;--btn-hover-bg: hsl(var(--surface));--btn-active-shadow: var(--b98-sunken);--btn-accent-bg: hsl(var(--surface));--btn-accent-fg: #000;--btn-accent-shadow: var(--b98-raised);--btn-accent-hover-bg: hsl(var(--surface));--btn-accent-hover-shadow: var(--b98-raised);--ghost-hover-bg: transparent;--in-bg: #fff;--in-border: 0 solid transparent;--in-shadow: var(--b98-sunken);--in-focus-shadow: var(--b98-sunken);--card-bg: hsl(var(--surface));--card-border: 0 solid transparent;--card-shadow: var(--b98-raised);--backdrop: rgb(0 0 0 / .25);--win-bg: hsl(var(--surface));--win-border: 0 solid transparent;--win-shadow: var(--b98-raised), 3px 3px 0 rgb(0 0 0 / .45);--tb-bg: var(--b98-title);--tb-fg: #fff;--tb-border: 0 solid transparent;--tb-pad: .2rem .35rem;--tb-size: .9rem;--tb-weight: 700;--close-fg: #000;--close-bg: hsl(var(--surface));--close-shadow: var(--b98-raised);--close-hover-bg: hsl(var(--surface));--close-hover-fg: #000;--close-r: 0;--bar-border: 0 solid transparent;--menu-bg: hsl(var(--surface));--menu-border: 0 solid transparent;--pop-shadow: var(--b98-raised), 2px 2px 0 rgb(0 0 0 / .4);--menu-hi-bg: hsl(var(--accent));--menu-hi-fg: #fff;--side-shadow: var(--b98-raised);--top-bg: hsl(var(--surface));--top-shadow: var(--b98-raised);--player-shadow: var(--b98-raised);--nav-hover-bg: transparent;--nav-active-bg: hsl(var(--accent));--nav-active-fg: #fff;--row-hover: hsl(var(--accent));--row-hover-fg: #fff;--row-current: color-mix(in srgb, hsl(var(--accent)) 25%, transparent);--panel-tb-bg: var(--b98-title);--panel-tb-fg: #fff;--panel-tb-margin: -1.25rem -1.25rem .25rem;--panel-tb-pad: .2rem .5rem;--rng-appearance: none;--rng-h: .3rem;--rng-r: 0;--rng-shadow: var(--b98-sunken);--rng-track: #fff;--rng-fill: hsl(var(--accent));--rng-tw: .7rem;--rng-th: 1.3rem;--rng-tr: 0;--rng-thumb: hsl(var(--surface));--rng-ts: var(--b98-raised)}html[data-ui=bevel]{font-size:14px}[data-ui=bevel] *,[data-ui=bevel] :before,[data-ui=bevel] :after{transition-duration:0s!important;border-radius:0!important}[data-ui=bevel] .bt-row:hover *{color:#fff}[data-ui=bevel] .card:not([class*=" p-"]):not([class*=" px-"]):not([class*=" py-"]):not(.bt-panel){padding:2px}[data-ui=bevel] .bt-titlebar svg{display:none}[data-ui=bevel] .bt-close{padding:0 .2rem}[data-ui=bevel] .bt-window{padding:2px}[data-ui=bevel] ::selection{background:hsl(var(--accent));color:#fff}[data-ui=bevel]{--vote-ms: 0ms;--player-in: none;--player-out: none;--player-ms: 0ms;--pop-out: none;--pop-ms: 0ms}[data-ui=bevel] .bt-sel[data-selected]{outline:1px dotted #000;outline-offset:-4px;background-image:linear-gradient(hsl(var(--accent) / .18),hsl(var(--accent) / .18))}[data-ui=bevel]{--page-in: none}[data-ui=toolbar]{--radius: 8px;--ctl-r: 6px;--card-r: 8px;--win-r: 8px;--menu-r: 6px;--nav-r: 6px;--in-r: 8px;--font: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";--dur: .15s;--ease: cubic-bezier(.4, 0, .2, 1);--row-y: .75rem;--grid-min: 10rem;--btn-bg: hsl(var(--raised) / .5);--btn-border: 1px solid hsl(var(--line));--btn-weight: 700;--btn-hover-bg: hsl(var(--hover));--btn-accent-bg: hsl(var(--accent));--btn-accent-border: 0 solid transparent;--btn-accent-weight: 700;--btn-accent-hover-bg: color-mix(in srgb, hsl(var(--accent)) 76%, hsl(var(--top)));--ghost-hover-bg: hsl(var(--hover));--in-bg: hsl(var(--raised) / .5);--in-border: 1px solid hsl(var(--line));--in-hover-border: hsl(var(--line));--in-focus-border: hsl(var(--accent));--in-focus-shadow: none;--in-py: .5rem;--card-bg: hsl(var(--raised) / .4);--card-border: 1px solid hsl(var(--line));--backdrop: rgb(0 0 0 / .8);--win-bg: hsl(var(--bg));--win-border: 1px solid hsl(var(--line));--win-shadow: 0 10px 15px -3px rgb(0 0 0 / .4), 0 4px 6px -4px rgb(0 0 0 / .4);--dialog-anim: bt-pop .2s var(--ease);--tb-bg: transparent;--tb-border: 0 solid transparent;--tb-pad: 1.5rem 3rem .25rem 1.5rem;--tb-weight: 900;--tb-size: 1.25rem;--tb-justify: flex-start;--close-fg: hsl(var(--fg));--close-r: 2px;--menu-bg: hsl(var(--bg));--menu-border: 1px solid hsl(var(--line));--pop-shadow: 0 4px 6px -1px rgb(0 0 0 / .4), 0 2px 4px -2px rgb(0 0 0 / .4);--menu-anim: bt-pop .12s var(--ease);--menu-hi-bg: hsl(var(--hover));--side-bg: hsl(var(--bg));--top-bg: hsl(var(--bg));--player-bg: hsl(var(--bg));--nav-hover-bg: hsl(var(--raised) / .5);--nav-active-bg: hsl(var(--raised));--nav-active-fg: hsl(var(--fg));--row-hover: hsl(var(--raised) / .3);--row-current: hsl(var(--accent) / .1);--player-in: none;--player-out: none;--player-ms: 0ms;--pop-out: none;--pop-ms: 0ms;--rng-appearance: none;--rng-h: .5rem;--rng-r: 9999px;--rng-border: 1px solid hsl(var(--line) / .5);--rng-track: hsl(var(--line));--rng-fill: hsl(var(--raised));--rng-tw: 1rem;--rng-th: 1rem;--rng-thumb: hsl(var(--bg));--rng-tb: 2px solid hsl(var(--muted));--rng-ts: none}[data-ui=toolbar] .btn{font-size:.75rem}[data-ui=toolbar] .btn-accent{font-weight:var(--btn-accent-weight);text-transform:uppercase;letter-spacing:.05em}[data-ui=toolbar] .btn-ghost{font-weight:500}[data-ui=toolbar] .input:focus-visible,[data-ui=toolbar] .input:focus{box-shadow:0 0 0 1px hsl(var(--accent))}[data-ui=toolbar] .bt-brand{padding:1.5rem .5rem;margin-bottom:0;font-size:1.25rem;line-height:1.75rem;font-weight:700;letter-spacing:-.05em;text-transform:uppercase}[data-ui=toolbar] .bt-brand img{display:none}[data-ui=toolbar] .bt-side .bt-nav{color:color-mix(in srgb,hsl(var(--fg)) 63%,hsl(var(--bg)))}[data-ui=toolbar] .bt-side .bt-nav:hover,[data-ui=toolbar] .bt-side .bt-nav[aria-current=page]{color:hsl(var(--fg))}[data-ui=toolbar] .bt-tabbar .bt-tab{font-weight:700}[data-ui=toolbar] main h1{font-size:1.875rem;line-height:2.25rem;font-weight:900;letter-spacing:-.025em;text-transform:uppercase}[data-ui=toolbar] main h1>span{font-size:.875rem;letter-spacing:0}[data-ui=toolbar] main h2:not([class*=text-2xl]){font-size:.875rem;line-height:1.25rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}[data-ui=toolbar] main .card h2:not([class*=text-2xl]){font-size:.75rem}[data-ui=toolbar] .bt-label{font-size:10px;line-height:1rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}[data-ui=toolbar] .bt-titlebar{position:relative}[data-ui=toolbar] .bt-titlebar h2{text-transform:uppercase;letter-spacing:-.025em}[data-ui=toolbar] .bt-titlebar .bt-close{position:absolute;right:1rem;top:1rem;opacity:.7;padding:.15rem}[data-ui=toolbar] .bt-titlebar .bt-close:hover{opacity:1}[data-ui=toolbar] .bt-window .bt-body{padding:1.25rem 1.5rem 1.5rem}[data-ui=toolbar] .bt-footer{border-top:0;justify-content:flex-end;padding:0 1.5rem 1.5rem}[data-ui=toolbar] .bt-menu [role=menuitem],[data-ui=toolbar] .bt-menu [role=option]{font-size:.75rem;font-weight:700}[data-ui=toolbar] .bt-tile{background:hsl(var(--raised) / .4);border:1px solid hsl(var(--line));border-radius:var(--card-r);overflow:hidden;padding-bottom:.75rem;text-align:left;transition:border-color var(--dur) var(--ease)}[data-ui=toolbar] .bt-tile:hover{border-color:color-mix(in srgb,hsl(var(--line)) 88%,hsl(var(--fg)))}[data-ui=toolbar] .bt-tile .bt-cover{border-radius:0;transition-duration:.5s}[data-ui=toolbar] .bt-tile:hover .bt-cover{transform:scale(1.05)}[data-ui=toolbar] .bt-cap-t,[data-ui=toolbar] .bt-cap{padding-inline:.75rem}[data-ui=toolbar] .bt-cap-t{margin-top:0;padding-top:.75rem;font-weight:700}[data-ui=toolbar] .bt-cap{padding-top:.125rem}[data-ui=toolbar] .bt-tile .bt-cover[data-kind=artist] img{filter:grayscale(1);transition:filter .5s var(--ease)}[data-ui=toolbar] .bt-tile:hover .bt-cover[data-kind=artist] img{filter:none}[data-ui=toolbar] .bt-tile .bt-cover[data-kind=artist]:after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.6;background:linear-gradient(to top,rgb(0 0 0 / .8),transparent)}[data-ui=toolbar] .card.overflow-hidden{border-radius:1rem;border-color:hsl(var(--raised));background:hsl(var(--raised) / .2)}[data-ui=toolbar] .divide-y>:not([hidden])~:not([hidden]){border-color:hsl(var(--raised) / .5)}@media(min-width:768px){[data-ui=toolbar] .bt-pbar{min-height:6rem;padding:0 1.5rem;gap:1.5rem}}[data-ui=toolbar] .bt-cover-btn .bt-cover{width:3.5rem;height:3.5rem;border-radius:.5rem;border:1px solid hsl(var(--line));box-shadow:0 10px 15px -3px #0006}[data-ui=toolbar] .bt-ptitle{font-weight:900;letter-spacing:-.025em;text-transform:uppercase}[data-ui=toolbar] .bt-partist{font-weight:700;letter-spacing:.1em;text-transform:uppercase;font-size:.75rem}[data-ui=toolbar] .bt-player .btn-accent{background:hsl(var(--fg));color:hsl(var(--bg))}[data-ui=toolbar] .bt-player .btn-accent:hover{background:color-mix(in srgb,hsl(var(--fg)) 84%,hsl(var(--bg)))}[data-ui=toolbar] .bt-times{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}[data-ui=liquid]{--wf-order: -1}[data-ui=liquid] .bt-wf{padding-left:.75rem}[data-ui=liquid] .bt-wf-title{text-align:center;margin-right:3.6rem}[data-ui=liquid] .bt-wf-btns{gap:8px}[data-ui=liquid] .bt-wf-close{order:-1}[data-ui=liquid] .bt-wf-btn{--wf-r: 9999px;position:relative;width:12px;height:12px;padding:0;color:transparent;--wf-glyph: #995700;--wf-border: .5px solid #e1a73e;--wf-bg: #febc2e;--wf-hover: #febc2e;--wf-active: #c49a22}[data-ui=liquid] .bt-wf-btn[aria-label=Maximise],[data-ui=liquid] .bt-wf-btn[aria-label=Restore]{--wf-glyph: #006500;--wf-border: .5px solid #2dac2f;--wf-bg: #28c840;--wf-hover: #28c840;--wf-active: #1f9a30}[data-ui=liquid] .bt-wf-close{--wf-glyph: #4d0000;--wf-border: .5px solid #e2463f;--wf-bg: #ff5f57;--wf-close-hover: #ff5f57;--wf-close-active: #bf4943}[data-ui=liquid] .bt-wf-btn svg{display:none}[data-ui=liquid] .bt-wf-btn:after{content:"";position:absolute;inset:0;margin:auto;width:8px;height:8px;background:var(--wf-glyph);opacity:0;transition:opacity .08s;-webkit-mask:var(--glyph) center / contain no-repeat;mask:var(--glyph) center / contain no-repeat}[data-ui=liquid] .bt-wf-btns:hover .bt-wf-btn:after,[data-ui=liquid] .bt-wf-btns:focus-within .bt-wf-btn:after{opacity:.85}[data-ui=liquid] .bt-wf-btn{--glyph: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M1 4h6' stroke='%23000' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E")}[data-ui=liquid] .bt-wf-close{--glyph: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M1.3 1.3l5.4 5.4M6.7 1.3L1.3 6.7' stroke='%23000' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E")}[data-ui=liquid] .bt-wf-btn[aria-label=Maximise]{--glyph: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M.8 .8h3.6L.8 4.4zM7.2 7.2H3.6l3.6-3.6z'/%3E%3C/svg%3E")}[data-ui=liquid] .bt-wf-btn[aria-label=Restore]{--glyph: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M1 4.2h2.8V1.4zM7 3.8H4.2v2.8z'/%3E%3C/svg%3E")}[data-ui=liquid]{--radius: 22px;--ctl-r: 9999px;--card-r: 24px;--win-r: 34px;--menu-r: 24px;--nav-r: 18px;--in-r: 14px;--in-px: .9rem;--font: "Inter", system-ui, sans-serif;--dur: .18s;--ease: cubic-bezier(.32, .72, 0, 1);--spring: cubic-bezier(.34, 1.56, .64, 1);--lg-fill: hsl(var(--surface) / .34);--lg-fill-strong: hsl(var(--surface) / .6);--lg-sheen: linear-gradient(140deg, rgb(255 255 255 / .14), rgb(255 255 255 / .015) 44%, rgb(255 255 255 / .06));--lg-shadow: 0 12px 38px rgb(0 0 0 / .36), 0 2px 8px rgb(0 0 0 / .24);--lg-rim: inset 0 0 0 .5px rgb(255 255 255 / .14);--lg-blur: 14px;--lg-blur-sm: 8px;--lg-sat: 1.7;--lg-bright: 1.05;--lg-dim: transparent;--lg-hover: rgb(255 255 255 / .12);--lg-press: rgb(255 255 255 / .2);--btn-fg: inherit;--btn-weight: 600;--in-bg: hsl(var(--raised) / .5);--in-border: .5px solid rgb(255 255 255 / .14);--in-shadow: inset 0 1px 2px rgb(0 0 0 / .18);--in-hover-border: rgb(255 255 255 / .28);--in-focus-border: hsl(var(--accent));--in-focus-shadow: 0 0 0 4px hsl(var(--accent) / .32);--card-bg: hsl(var(--surface) / .46);--card-border: .5px solid rgb(255 255 255 / .1);--card-shadow: 0 6px 24px rgb(0 0 0 / .16);--backdrop: rgb(0 0 0 / .34);--dialog-anim: lg-open .38s cubic-bezier(.22, 1, .36, 1) both;--menu-anim: lg-menu .3s cubic-bezier(.22, 1, .36, 1) both;--tb-bg: transparent;--tb-border: 0 solid transparent;--tb-pad: 1.2rem 1.5rem .4rem;--tb-size: 1.2rem;--tb-weight: 700;--close-size: 2rem;--close-pad: 0;--close-bg: rgb(255 255 255 / .13);--close-r: 9999px;--close-hover-bg: rgb(255 255 255 / .24);--bar-border: .5px solid rgb(255 255 255 / .1);--row-hover: rgb(255 255 255 / .07);--row-current: hsl(var(--accent) / .16);--nav-hover-bg: rgb(255 255 255 / .08);--nav-active-fg: hsl(var(--fg));--rng-appearance: none;--rng-h: 6px;--rng-track: rgb(255 255 255 / .2);--rng-fill: hsl(var(--accent));--rng-tw: 1.75rem;--rng-th: 1.1rem;--rng-tr: 9999px;--rng-thumb: linear-gradient(#fff, #eceef4);--rng-ts: 0 2px 8px rgb(0 0 0 / .4), inset 0 0 0 .5px rgb(0 0 0 / .1);--chk-size: 1.2rem;--chk-r: 7px;--chk-border: .5px solid rgb(255 255 255 / .3);--chk-bg: linear-gradient(140deg, rgb(255 255 255 / .2), rgb(255 255 255 / .06));--chk-shadow: inset 0 .5px 0 rgb(255 255 255 / .4), 0 1px 3px rgb(0 0 0 / .25);--chk-on-bg: linear-gradient(140deg, hsl(var(--accent) / .95), hsl(var(--accent) / .7));--chk-on-border: hsl(var(--accent) / .6);--chk-focus: 0 0 0 4px hsl(var(--accent) / .32)}[data-ui=liquid][data-mode=light]{--lg-fill: hsl(var(--surface) / .46);--lg-fill-strong: hsl(var(--surface) / .74);--lg-sheen: linear-gradient(140deg, rgb(255 255 255 / .6), rgb(255 255 255 / .1) 46%, rgb(255 255 255 / .32));--lg-shadow: 0 12px 34px rgb(40 52 90 / .2), 0 1px 5px rgb(40 52 90 / .14);--lg-rim: inset 0 0 0 .5px rgb(255 255 255 / .75), inset 0 0 0 1px rgb(40 52 90 / .07);--lg-sat: 1.9;--lg-bright: 1.04;--lg-hover: rgb(255 255 255 / .5);--lg-press: rgb(255 255 255 / .75);--in-bg: hsl(var(--surface) / .55);--in-border: .5px solid rgb(0 0 0 / .1);--in-shadow: inset 0 1px 2px rgb(40 52 90 / .1);--in-hover-border: rgb(0 0 0 / .22);--card-bg: hsl(var(--surface) / .62);--card-border: .5px solid rgb(255 255 255 / .7);--card-shadow: 0 6px 22px rgb(40 52 90 / .12);--backdrop: rgb(20 28 50 / .28);--close-bg: rgb(0 0 0 / .07);--close-hover-bg: rgb(0 0 0 / .14);--bar-border: .5px solid rgb(0 0 0 / .08);--row-hover: rgb(0 0 0 / .05);--nav-hover-bg: rgb(0 0 0 / .05);--rng-track: rgb(0 0 0 / .14);--rng-thumb: linear-gradient(#fff, #f4f5f9);--chk-border: .5px solid rgb(0 0 0 / .25);--chk-bg: linear-gradient(140deg, #fff, rgb(255 255 255 / .5))}html[data-glass=clear][data-ui=liquid]{--lg-fill: hsl(var(--surface) / .05);--lg-fill-strong: hsl(var(--surface) / .2);--lg-blur: 2px;--lg-blur-sm: 1px;--lg-sat: 1.25;--lg-bright: 1;--lg-dim: rgb(0 0 0 / .22)}html[data-glass=clear][data-ui=liquid][data-mode=light]{--lg-dim: rgb(0 0 0 / .12)}html.lg-inactive[data-ui=liquid]{--lg-sat: 1.05;--lg-blur: 12px;--lg-shadow: 0 6px 18px rgb(0 0 0 / .18)}html.lg-inactive[data-ui=liquid] .bt-shell{opacity:.86}html[data-ui=liquid]:not([data-wallpaper=on]) body{background-color:hsl(var(--bg));background-attachment:fixed;background-image:radial-gradient(60rem 40rem at 6% -8%,hsl(var(--accent) / .4),transparent 62%),radial-gradient(52rem 38rem at 98% 6%,hsl(var(--top) / .3),transparent 60%),radial-gradient(56rem 40rem at 62% 112%,hsl(var(--bad) / .18),transparent 62%),radial-gradient(40rem 30rem at 30% 60%,hsl(var(--good) / .1),transparent 60%)}html[data-ui=liquid][data-mode=light]:not([data-wallpaper=on]) body{background-image:radial-gradient(60rem 40rem at 6% -8%,hsl(var(--accent) / .46),transparent 62%),radial-gradient(52rem 38rem at 98% 6%,hsl(var(--top) / .38),transparent 60%),radial-gradient(56rem 40rem at 62% 112%,hsl(var(--bad) / .22),transparent 62%),radial-gradient(40rem 30rem at 30% 60%,hsl(var(--good) / .16),transparent 60%)}:is(html,div)[data-ui=liquid] .bt-side,:is(html,div)[data-ui=liquid] .bt-player,:is(html,div)[data-ui=liquid] .bt-tabbar,:is(html,div)[data-ui=liquid] .bt-menu,:is(html,div)[data-ui=liquid] .bt-window{background:var(--lg-spec, none) center / 100% 100% no-repeat,var(--lg-sheen),var(--lg-fill);-webkit-backdrop-filter:blur(var(--lg-blur)) saturate(var(--lg-sat));backdrop-filter:blur(var(--lg-blur)) var(--lg-filter, saturate(1)) saturate(var(--lg-sat)) brightness(var(--lg-bright));border:0;box-shadow:var(--lg-shadow),var(--lg-rim),inset 0 0 0 999px var(--lg-dim)}:is(html,div)[data-ui=liquid] .bt-window{background:var(--lg-spec, none) center / 100% 100% no-repeat,var(--lg-sheen),var(--lg-fill-strong);box-shadow:0 30px 80px #00000073,0 4px 14px #00000040,var(--lg-rim),inset 0 0 0 999px var(--lg-dim)}:is(html,div)[data-ui=liquid] .bt-backdrop{animation:bt-fade .3s ease-out both}:is(html,div)[data-ui=liquid] .bt-menu{padding:6px;background:var(--lg-spec, none) center / 100% 100% no-repeat,var(--lg-sheen),var(--lg-fill-strong)}:is(html,div)[data-ui=liquid] .bt-menu [role=menuitem]{width:100%;border-radius:calc(var(--menu-r) - 8px);padding-inline:.8rem}:is(html,div)[data-ui=liquid] .bt-menu [role=menuitem]:hover:not(:disabled),:is(html,div)[data-ui=liquid] .bt-menu [role=menuitem]:focus-visible{background:radial-gradient(circle at var(--mx, 50%) var(--my, 50%),var(--lg-press),var(--lg-hover) 70%);color:inherit;box-shadow:inset 0 0 0 .5px #ffffff2e}:is(html,div)[data-ui=liquid] .bt-window .bt-body{background:none}:is(html,div)[data-ui=liquid] .bt-footer{border-top:var(--bar-border)}:is(html,div)[data-ui=liquid] .bt-side.bt-shell{margin:12px 0 12px 12px;border-radius:30px;padding:12px;animation:lg-bar-in .42s var(--ease) both}:is(html,div)[data-ui=liquid] .bt-player.bt-shell{position:fixed;z-index:30;left:12px;right:12px;bottom:12px;border-radius:30px;overflow:hidden}:is(html,div)[data-ui=liquid] .bt-player.bt-shell>div:last-child{padding-block:.4rem}:is(html,div)[data-ui=liquid] .bt-tabbar.bt-shell{position:fixed;z-index:31;left:12px;right:12px;bottom:12px;border-radius:9999px;padding:4px 6px}:is(html,div)[data-ui=liquid] .bt-tab{position:relative;z-index:1;border-radius:9999px;transition:color var(--dur) var(--ease)}:is(html,div)[data-ui=liquid] .bt-tab[aria-current=page]{background:none}:is(html,div)[data-ui=liquid] .bt-ind{display:block;position:absolute;left:0;top:0;z-index:0;pointer-events:none;width:var(--ind-w, 0);height:var(--ind-h, 0);opacity:var(--ind-o, 0);transform:translate3d(var(--ind-x, 0),var(--ind-y, 0),0);border-radius:var(--nav-r);background:var(--lg-sheen),#ffffff21;box-shadow:inset 0 0 0 .5px #ffffff3d,0 2px 10px #00000024;will-change:transform}:is(html,div)[data-ui=liquid] [data-ind-ready]>.bt-ind{transition:transform .42s cubic-bezier(.22,1,.36,1),width .46s var(--spring),height .46s var(--spring),opacity .16s ease}:is(html,div)[data-ui=liquid] .bt-tabbar .bt-ind{border-radius:9999px}[data-ui=liquid][data-mode=light] .bt-ind{background:var(--lg-sheen),#ffffffbf;box-shadow:inset 0 0 0 .5px #0000000f,0 2px 10px #28345a24}@media(min-width:768px){:is(html,div)[data-ui=liquid] .bt-player.bt-shell{left:calc(14rem + 24px)}}@media(max-width:767.98px){:is(html,div)[data-ui=liquid] .bt-player.bt-shell{bottom:calc(12px + 3.9rem)}}:is(html,div)[data-ui=liquid] main{padding-bottom:1.5rem}:is(html,div)[data-ui=liquid] main.has-player{padding-bottom:7.25rem}@media(max-width:767.98px){:is(html,div)[data-ui=liquid] main{padding-bottom:6rem}:is(html,div)[data-ui=liquid] main.has-player{padding-bottom:11.75rem}}:is(html,div)[data-ui=liquid] .bt-top.bt-shell{background:none;border:0;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none;isolation:isolate}:is(html,div)[data-ui=liquid] .bt-scrim{display:block;position:fixed;z-index:5;left:0;right:0;top:0;height:5.25rem;pointer-events:none;background:linear-gradient(hsl(var(--bg) / .7),hsl(var(--bg) / 0));-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);-webkit-mask-image:linear-gradient(#000 55%,transparent);mask-image:linear-gradient(#000 55%,transparent)}:is(html,div)[data-ui=liquid][data-mode=light] .bt-scrim,[data-mode=light] [data-ui=liquid] .bt-scrim{background:linear-gradient(#ffffff80,#fff0)}:is(html,div)[data-ui=liquid] .bt-side.bt-shell{position:relative;z-index:6}:is(html,div)[data-ui=liquid] .bt-top .input{border-radius:9999px;border:0;padding-block:.55rem;background:var(--lg-spec, none) center / 100% 100% no-repeat,var(--lg-sheen),var(--lg-fill);-webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:var(--lg-shadow),var(--lg-rim)}:is(html,div)[data-ui=liquid] .bt-top .input:focus{box-shadow:var(--lg-shadow),0 0 0 4px hsl(var(--accent) / .32)}:is(html,div)[data-ui=liquid] .btn,:is(html,div)[data-ui=liquid] .btn:hover,:is(html,div)[data-ui=liquid] .btn:active{--lg-btn-fill: var(--lg-fill);background:var(--lg-spec, none) center / 100% 100% no-repeat,var(--lg-sheen),var(--lg-btn-fill);border:0;color:inherit;text-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:0 3px 12px #00000029,var(--lg-rim);transition:transform .36s var(--spring),box-shadow .24s var(--ease)}:is(html,div)[data-ui=liquid] .btn:not(.absolute):not(.fixed){position:relative;isolation:isolate}:is(html,div)[data-ui=liquid] .btn:before{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;opacity:0;background:radial-gradient(circle at var(--mx, 50%) var(--my, 50%),rgb(255 255 255 / .5),rgb(255 255 255 / .12) 55%,transparent 80%);transition:opacity .26s var(--ease)}:is(html,div)[data-ui=liquid] .btn:hover:before{opacity:.55}:is(html,div)[data-ui=liquid] .btn:active:before{opacity:1;transition-duration:90ms}:is(html,div)[data-ui=liquid] .btn:active{transform:scale(.93);transition:transform .1s ease-out,box-shadow .14s;box-shadow:0 1px 4px #0003,var(--lg-rim)}:is(html,div)[data-ui=liquid] .btn:focus-visible{outline:none;box-shadow:0 0 0 4px hsl(var(--accent) / .4),var(--lg-rim)}:is(html,div)[data-ui=liquid] .btn.btn-accent,:is(html,div)[data-ui=liquid] .btn.btn-accent:hover,:is(html,div)[data-ui=liquid] .btn.btn-accent:active{--lg-btn-fill: linear-gradient(160deg, hsl(var(--accent) / .92), hsl(var(--accent) / .66));color:hsl(var(--accent-fg));box-shadow:0 4px 16px hsl(var(--accent) / .35),0 1px 3px #0003,var(--lg-rim)}:is(html,div)[data-ui=liquid] .btn.btn-ghost:not(:hover):not(:focus-visible):not(:active){background:none;-webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:none}:is(html,div)[data-ui=liquid] .btn:disabled{opacity:.4}:is(html,div)[data-ui=liquid] .bt-nav,:is(html,div)[data-ui=liquid] .bt-nav:hover{transition:background-color var(--dur) var(--ease),transform .42s var(--spring)}:is(html,div)[data-ui=liquid] .bt-nav:active{transform:scale(.96)}:is(html,div)[data-ui=liquid] .bt-nav{position:relative;z-index:1}:is(html,div)[data-ui=liquid] .bt-nav[aria-current=page]{background:none;box-shadow:none}:is(html,div)[data-ui=liquid] .bt-range::-webkit-slider-thumb{transition:transform .36s var(--spring)}:is(html,div)[data-ui=liquid] .bt-range:active::-webkit-slider-thumb{transform:scale(1.14)}:is(html,div)[data-ui=liquid] .card{background:var(--lg-sheen),var(--card-bg);border:0;box-shadow:var(--card-shadow),var(--lg-rim),inset 0 .5px #ffffff4d;-webkit-backdrop-filter:none;backdrop-filter:none}:is(html,div)[data-ui=liquid] .card .card{background:var(--lg-sheen),hsl(var(--surface) / .3);-webkit-backdrop-filter:none;backdrop-filter:none}:is(html,div)[data-ui=liquid] textarea.input{border-radius:18px}:is(html,div)[data-ui=liquid] .chip{background:#ffffff1a;box-shadow:inset 0 0 0 .5px #ffffff1f}[data-ui=liquid][data-mode=light] .chip{background:#0000000d;box-shadow:inset 0 0 0 .5px #0000000f}html[data-ui=liquid] ::selection{background:hsl(var(--accent) / .4)}@media(prefers-reduced-transparency:reduce){[data-ui=liquid]{--lg-fill: hsl(var(--surface) / .96);--lg-fill-strong: hsl(var(--surface));--lg-sheen: none;--card-bg: hsl(var(--surface))}:is(html,div)[data-ui=liquid] .bt-side,:is(html,div)[data-ui=liquid] .bt-player,:is(html,div)[data-ui=liquid] .bt-tabbar,:is(html,div)[data-ui=liquid] .bt-menu,:is(html,div)[data-ui=liquid] .bt-window,:is(html,div)[data-ui=liquid] .btn,:is(html,div)[data-ui=liquid] .card,:is(html,div)[data-ui=liquid] .bt-top .input,:is(html,div)[data-ui=liquid] .bt-backdrop{-webkit-backdrop-filter:none;backdrop-filter:none}}[data-ui=liquid]{--player-in: lg-bar-in .42s var(--ease) both;--player-out: lg-bar-out .26s cubic-bezier(.5, 0, .75, 0) both;--player-ms: .26s;--pop-out: lg-menu-out .2s cubic-bezier(.5, 0, .75, 0) both;--pop-ms: .2s}[data-ui=liquid]{--page-in: bt-page-glass .34s cubic-bezier(.22, 1, .36, 1) backwards}:is(html,div)[data-ui=liquid] .bt-cover[data-kind=artist]{border-radius:min(30px,28%)!important}@keyframes lg-open{0%{opacity:0;transform:scale(.72);-webkit-backdrop-filter:none;backdrop-filter:none}38%{opacity:1}68%{transform:scale(1.018)}99%{-webkit-backdrop-filter:none;backdrop-filter:none}to{opacity:1;transform:none;-webkit-backdrop-filter:blur(var(--lg-blur)) saturate(var(--lg-sat));backdrop-filter:blur(var(--lg-blur)) var(--lg-filter, saturate(1)) saturate(var(--lg-sat)) brightness(var(--lg-bright))}}@keyframes lg-menu{0%{opacity:0;transform:scale(.6)}30%{opacity:1}70%{transform:scale(1.012)}to{opacity:1;transform:none}}@keyframes lg-pill{0%{transform:scale(.82);opacity:.2}60%{transform:scale(1.04);opacity:1}to{transform:none}}@keyframes lg-bar-out{0%{opacity:1;transform:none}to{opacity:0;transform:translateY(18px) scale(.97)}}@keyframes lg-bar-in{0%{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}@keyframes lg-menu-out{0%{opacity:1;transform:none}to{opacity:0;transform:scale(.7)}}@keyframes bt-page-glass{0%{opacity:0;transform:scale(.985) translateY(6px)}to{opacity:1;transform:none}}[data-ui=terminal]{--radius: 0px;--ctl-r: 0px;--card-r: 0px;--win-r: 0px;--menu-r: 0px;--nav-r: 0px;--chip-r: 0px;--in-r: 0px;--font: "VT323", "Share Tech Mono", ui-monospace, monospace;--title-font: var(--font);--dur: 0ms;--ease: steps(2);--btn-bg: transparent;--btn-fg: hsl(var(--accent));--btn-weight: 400;--btn-border: 1px solid color-mix(in srgb, hsl(var(--accent)) 60%, transparent);--btn-shadow: none;--btn-hover-bg: hsl(var(--accent));--btn-hover-border: hsl(var(--accent));--btn-hover-shadow: none;--btn-active-shadow: inset 0 0 0 2px hsl(var(--bg));--btn-active-transform: none;--btn-accent-bg: hsl(var(--accent));--btn-accent-fg: hsl(var(--bg));--btn-accent-border: 1px solid hsl(var(--accent));--btn-accent-border-color: hsl(var(--accent));--btn-accent-shadow: none;--btn-accent-hover-bg: color-mix(in srgb, hsl(var(--accent)) 80%, white);--btn-accent-hover-shadow: none;--btn-accent-text-shadow: none;--ghost-hover-bg: color-mix(in srgb, hsl(var(--accent)) 16%, transparent);--in-bg: transparent;--in-border: 1px solid color-mix(in srgb, hsl(var(--accent)) 60%, transparent);--in-shadow: none;--in-hover-border: hsl(var(--accent));--in-focus-border: hsl(var(--accent));--in-focus-shadow: 0 0 6px color-mix(in srgb, hsl(var(--accent)) 70%, transparent);--in-px: .75rem;--card-bg: color-mix(in srgb, hsl(var(--accent)) 5%, hsl(var(--bg)));--card-border: 1px solid color-mix(in srgb, hsl(var(--accent)) 45%, transparent);--card-shadow: none;--backdrop: rgb(0 0 0 / .55);--win-bg: hsl(var(--bg));--win-border: 2px solid hsl(var(--accent));--win-shadow: 0 0 24px color-mix(in srgb, hsl(var(--accent)) 35%, transparent);--dialog-anim: bt-fade .12s steps(3);--tb-bg: hsl(var(--accent));--tb-fg: hsl(var(--bg));--tb-border: 0 solid transparent;--tb-pad: .6rem 1rem;--tb-size: 1.15rem;--tb-weight: 400;--tb-justify: space-between;--tb-text-shadow: none;--close-fg: hsl(var(--bg));--close-hover-bg: hsl(var(--bg));--close-hover-fg: hsl(var(--accent));--close-r: 0;--bar-border: 1px solid color-mix(in srgb, hsl(var(--accent)) 45%, transparent);--menu-bg: hsl(var(--bg));--menu-border: 1px solid hsl(var(--accent));--pop-shadow: 0 0 14px color-mix(in srgb, hsl(var(--accent)) 35%, transparent);--menu-anim: bt-fade .1s ease-out;--menu-hi-bg: hsl(var(--accent));--menu-hi-fg: hsl(var(--bg));--side-bg: hsl(var(--bg));--side-shadow: none;--top-bg: hsl(var(--bg));--top-shadow: none;--player-bg: hsl(var(--bg));--player-shadow: none;--nav-hover-bg: color-mix(in srgb, hsl(var(--accent)) 14%, transparent);--nav-active-bg: hsl(var(--accent));--nav-active-fg: hsl(var(--bg));--nav-active-shadow: none;--row-hover: color-mix(in srgb, hsl(var(--accent)) 16%, transparent);--row-current: color-mix(in srgb, hsl(var(--accent)) 30%, transparent);--panel-tb-fg: hsl(var(--accent));--panel-tb-margin: 0 0 .5rem;--panel-tb-pad: 0;--chk-size: 1.1rem;--chk-r: 0;--chk-border: 2px solid hsl(var(--accent));--chk-bg: transparent;--chk-hover-border: hsl(var(--accent));--chk-focus: 0 0 0 2px color-mix(in srgb, hsl(var(--accent)) 40%, transparent);--chk-on-bg: hsl(var(--accent));--chk-on-border: hsl(var(--accent));--chk-on-fg: hsl(var(--accent-fg));--chk-radio-on-bg: hsl(var(--accent));--chk-dot: hsl(var(--accent-fg));--rng-appearance: none;--rng-h: 6px;--rng-r: 0;--rng-track: color-mix(in srgb, hsl(var(--accent)) 25%, transparent);--rng-fill: hsl(var(--accent));--rng-tw: .9rem;--rng-th: .9rem;--rng-tr: 0;--rng-thumb: hsl(var(--accent));--rng-tb: 1px solid hsl(var(--accent));--rng-ts: 0 0 6px color-mix(in srgb, hsl(var(--accent)) 70%, transparent)}html[data-ui=terminal]{font-size:17px}[data-ui=terminal]{text-shadow:0 0 5px hsl(var(--accent) / .55);text-transform:uppercase;letter-spacing:.02em}[data-ui=terminal] :is(input,textarea,code,pre){text-transform:none}[data-ui=terminal] .bt-row:hover,[data-ui=terminal] .bt-row:hover *,[data-ui=terminal] .bt-nav[aria-current=page],[data-ui=terminal] .bt-nav[aria-current=page] *,[data-ui=terminal] .btn:hover:not(:disabled),[data-ui=terminal] .btn:hover:not(:disabled) *,[data-ui=terminal] .btn-accent,[data-ui=terminal] .btn-accent *{color:hsl(var(--bg));text-shadow:none}[data-ui=terminal] .bt-titlebar,[data-ui=terminal] .bt-titlebar *,[data-ui=terminal] .bt-menu [role=menuitem]:hover,[data-ui=terminal] .bt-menu [role=option]:hover{text-shadow:none}[data-ui=terminal] .chip{border:1px solid hsl(var(--accent) / .5);background:transparent;color:hsl(var(--accent))}html[data-ui=terminal]:after{content:"";position:fixed;inset:0;z-index:9999;pointer-events:none;background:repeating-linear-gradient(to bottom,#0000 0 2px,#00000029 2px 3px),radial-gradient(ellipse at center,transparent 55%,rgb(0 0 0 / .45) 100%);mix-blend-mode:multiply}@media(prefers-reduced-motion:reduce){html[data-ui=terminal]:after{background:none}}[data-ui=terminal]{--page-in: none;--vote-ms: 0ms;--player-in: none;--player-out: none;--player-ms: 0ms;--pop-out: none;--pop-ms: 0ms}[data-ui=terminal] *{scroll-behavior:auto!important}[data-ui=lcd]{--radius: 0px;--ctl-r: 0px;--card-r: 0px;--win-r: 0px;--menu-r: 0px;--nav-r: 0px;--chip-r: 0px;--in-r: 0px;--font: "Press Start 2P", "VT323", ui-monospace, monospace;--title-font: var(--font);--dur: 0ms;--ease: steps(2);--btn-bg: hsl(var(--surface));--btn-fg: hsl(var(--fg));--btn-weight: 400;--btn-border: 2px solid hsl(var(--fg));--btn-shadow: 3px 3px 0 hsl(var(--accent));--btn-hover-bg: hsl(var(--fg));--btn-hover-border: hsl(var(--fg));--btn-hover-shadow: 3px 3px 0 hsl(var(--accent));--btn-active-shadow: none;--btn-active-transform: translate(3px, 3px);--btn-accent-bg: hsl(var(--fg));--btn-accent-fg: hsl(var(--bg));--btn-accent-border: 2px solid hsl(var(--fg));--btn-accent-border-color: hsl(var(--fg));--btn-accent-shadow: 3px 3px 0 hsl(var(--accent));--btn-accent-hover-bg: hsl(var(--accent));--btn-accent-hover-shadow: 3px 3px 0 hsl(var(--fg));--btn-accent-text-shadow: none;--ghost-hover-bg: color-mix(in srgb, hsl(var(--fg)) 15%, transparent);--in-bg: hsl(var(--bg));--in-border: 2px solid hsl(var(--fg));--in-shadow: none;--in-hover-border: hsl(var(--fg));--in-focus-border: hsl(var(--fg));--in-focus-shadow: 3px 3px 0 hsl(var(--accent));--in-px: .75rem;--card-bg: hsl(var(--surface));--card-border: 2px solid hsl(var(--fg));--card-shadow: 3px 3px 0 hsl(var(--accent));--backdrop: color-mix(in srgb, hsl(var(--fg)) 55%, transparent);--win-bg: hsl(var(--bg));--win-border: 3px solid hsl(var(--fg));--win-shadow: 6px 6px 0 hsl(var(--accent));--dialog-anim: none;--tb-bg: hsl(var(--fg));--tb-fg: hsl(var(--bg));--tb-border: 0 solid transparent;--tb-pad: .6rem .9rem;--tb-size: .75rem;--tb-weight: 400;--tb-justify: space-between;--tb-text-shadow: none;--close-fg: hsl(var(--bg));--close-hover-bg: hsl(var(--bg));--close-hover-fg: hsl(var(--fg));--close-r: 0;--bar-border: 2px solid hsl(var(--fg));--menu-bg: hsl(var(--bg));--menu-border: 2px solid hsl(var(--fg));--pop-shadow: 4px 4px 0 hsl(var(--accent));--menu-anim: none;--menu-hi-bg: hsl(var(--fg));--menu-hi-fg: hsl(var(--bg));--side-bg: hsl(var(--surface));--side-shadow: none;--top-bg: hsl(var(--surface));--top-shadow: none;--player-bg: hsl(var(--surface));--player-shadow: none;--nav-hover-bg: color-mix(in srgb, hsl(var(--fg)) 12%, transparent);--nav-active-bg: hsl(var(--fg));--nav-active-fg: hsl(var(--bg));--nav-active-shadow: none;--row-hover: color-mix(in srgb, hsl(var(--fg)) 16%, transparent);--row-current: color-mix(in srgb, hsl(var(--fg)) 30%, transparent);--panel-tb-fg: hsl(var(--fg));--panel-tb-margin: 0 0 .5rem;--panel-tb-pad: 0;--chk-size: 1.1rem;--chk-r: 0;--chk-border: 2px solid hsl(var(--fg));--chk-bg: hsl(var(--bg));--chk-hover-border: hsl(var(--accent));--chk-focus: 0 0 0 2px color-mix(in srgb, hsl(var(--accent)) 40%, transparent);--chk-on-bg: hsl(var(--fg));--chk-on-border: hsl(var(--fg));--chk-on-fg: hsl(var(--bg));--chk-radio-on-bg: hsl(var(--fg));--chk-dot: hsl(var(--bg));--rng-appearance: none;--rng-h: 6px;--rng-r: 0;--rng-track: color-mix(in srgb, hsl(var(--fg)) 25%, transparent);--rng-fill: hsl(var(--fg));--rng-tw: .9rem;--rng-th: .9rem;--rng-tr: 0;--rng-thumb: hsl(var(--fg));--rng-tb: 2px solid hsl(var(--bg));--rng-ts: none}html[data-ui=lcd]{font-size:10px;line-height:1.7}[data-ui=lcd] :is(h1,h2,h3,.bt-brand){font-weight:400;line-height:1.5}[data-ui=lcd] h1{font-size:1.5rem}[data-ui=lcd] .bt-row:hover,[data-ui=lcd] .bt-row:hover *,[data-ui=lcd] .bt-nav[aria-current=page],[data-ui=lcd] .bt-nav[aria-current=page] *,[data-ui=lcd] .btn:hover:not(:disabled),[data-ui=lcd] .btn:hover:not(:disabled) *{color:hsl(var(--bg))}[data-ui=lcd] .text-muted,[data-ui=lcd] .chip{color:hsl(var(--accent))}[data-ui=lcd] .chip{border:2px solid hsl(var(--accent));background:transparent}[data-ui=lcd] :is(img,canvas,.bt-cover){image-rendering:pixelated;filter:grayscale(1) contrast(1.15) sepia(.7) hue-rotate(40deg) saturate(1.6)}[data-ui=lcd]{--page-in: none;--vote-ms: 0ms;--player-in: none;--player-out: none;--player-ms: 0ms;--pop-out: none;--pop-ms: 0ms}[data-ui=lcd] *{scroll-behavior:auto!important}[data-ui=neon]{--radius: 0px;--ctl-r: 0px;--card-r: 0px;--win-r: 0px;--menu-r: 0px;--nav-r: 0px;--chip-r: 0px;--in-r: 0px;--font: "Barlow Condensed", "Rajdhani", "Arial Narrow", system-ui, sans-serif;--title-font: var(--font);--dur: .1s;--ease: steps(3);--btn-bg: hsl(var(--raised));--btn-fg: hsl(var(--fg));--btn-weight: 600;--btn-border: 0 solid transparent;--btn-shadow: inset 3px 0 0 hsl(var(--accent));--btn-hover-bg: hsl(var(--accent));--btn-hover-border: transparent;--btn-hover-shadow: none;--btn-active-shadow: inset 0 0 0 2px #000;--btn-active-transform: none;--btn-accent-bg: hsl(var(--accent));--btn-accent-fg: #000;--btn-accent-border: 0 solid transparent;--btn-accent-border-color: transparent;--btn-accent-shadow: none;--btn-accent-hover-bg: #fff;--btn-accent-hover-shadow: none;--btn-accent-text-shadow: none;--ghost-hover-bg: color-mix(in srgb, hsl(var(--accent)) 16%, transparent);--in-bg: color-mix(in srgb, hsl(var(--fg)) 8%, transparent);--in-border: 1px solid color-mix(in srgb, hsl(var(--accent)) 45%, transparent);--in-shadow: none;--in-hover-border: hsl(var(--accent));--in-focus-border: hsl(var(--accent));--in-focus-shadow: inset 0 -2px 0 hsl(var(--accent));--in-px: .75rem;--card-bg: hsl(var(--surface));--card-border: 1px solid color-mix(in srgb, hsl(var(--accent)) 40%, transparent);--card-shadow: none;--backdrop: rgb(0 0 0 / .75);--win-bg: hsl(var(--bg));--win-border: 1px solid hsl(var(--accent));--win-shadow: 0 0 30px color-mix(in srgb, hsl(var(--accent)) 20%, transparent);--dialog-anim: bt-fade .12s steps(4);--tb-bg: hsl(var(--accent));--tb-fg: #000;--tb-border: 0 solid transparent;--tb-pad: .45rem 1rem;--tb-size: 1.15rem;--tb-weight: 700;--tb-justify: space-between;--tb-text-shadow: none;--close-fg: #000;--close-hover-bg: #000;--close-hover-fg: hsl(var(--accent));--close-r: 0;--bar-border: 1px solid color-mix(in srgb, hsl(var(--accent)) 35%, transparent);--menu-bg: hsl(var(--bg));--menu-border: 1px solid hsl(var(--accent));--pop-shadow: 0 0 18px color-mix(in srgb, hsl(var(--accent)) 22%, transparent);--menu-anim: bt-fade .1s ease-out;--menu-hi-bg: hsl(var(--accent));--menu-hi-fg: #000;--side-bg: hsl(var(--bg));--side-shadow: none;--top-bg: hsl(var(--bg));--top-shadow: none;--player-bg: hsl(var(--bg));--player-shadow: none;--nav-hover-bg: color-mix(in srgb, hsl(var(--accent)) 16%, transparent);--nav-active-bg: hsl(var(--accent));--nav-active-fg: #000;--nav-active-shadow: none;--row-hover: color-mix(in srgb, hsl(var(--accent)) 14%, transparent);--row-current: color-mix(in srgb, hsl(var(--accent)) 28%, transparent);--panel-tb-fg: hsl(var(--accent));--panel-tb-margin: 0 0 .5rem;--panel-tb-pad: 0;--chk-size: 1.1rem;--chk-r: 0;--chk-border: 2px solid hsl(var(--accent));--chk-bg: transparent;--chk-hover-border: hsl(var(--accent));--chk-focus: 0 0 0 2px color-mix(in srgb, hsl(var(--accent)) 40%, transparent);--chk-on-bg: hsl(var(--accent));--chk-on-border: hsl(var(--accent));--chk-on-fg: #000;--chk-radio-on-bg: hsl(var(--accent));--chk-dot: #000;--rng-appearance: none;--rng-h: 4px;--rng-r: 0;--rng-track: color-mix(in srgb, hsl(var(--fg)) 22%, transparent);--rng-fill: hsl(var(--accent));--rng-tw: .9rem;--rng-th: .9rem;--rng-tr: 0;--rng-thumb: hsl(var(--accent));--rng-tb: 2px solid hsl(var(--bg));--rng-ts: none}[data-ui=neon] :is(h1,h2,h3,.bt-brand,.bt-titlebar h2,.bt-panel-title,.btn,.bt-nav,.chip,th){text-transform:uppercase;letter-spacing:.06em}[data-ui=neon] h1{font-size:2.1rem;font-weight:700;color:hsl(var(--accent))}[data-ui=neon] .btn,[data-ui=neon] .card,[data-ui=neon] .bt-nav,[data-ui=neon] .bt-window,[data-ui=neon] .bt-menu{clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))}[data-ui=neon] .card,[data-ui=neon] .bt-window,[data-ui=neon] .bt-menu{clip-path:polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,14px 100%,0 calc(100% - 14px))}[data-ui=neon] .btn:hover:not(:disabled),[data-ui=neon] .btn:hover:not(:disabled) *{color:#000}[data-ui=neon] .chip{background:transparent;border:1px solid hsl(180 100% 50% / .6);color:#1affff}[data-ui=neon] .bt-row:hover,[data-ui=neon] .bt-row-current{box-shadow:inset 3px 0 hsl(var(--accent))}[data-ui=neon]{--page-in: bt-fade .11s linear backwards;--vote-ms: .26s}[data-ui=material] .bt-wf-close:is(:hover,:focus-visible){background:color-mix(in srgb,currentColor 22%,transparent);color:inherit}[data-ui=material] .bt-wf-btn{--wf-r: 9999px;width:1.7rem;height:1.7rem}[data-ui=material]{--radius: 16px;--ctl-r: 9999px;--card-r: 20px;--win-r: 28px;--menu-r: 4px;--nav-r: 9999px;--font: Roboto, "Noto Sans", "Open Sans", system-ui, sans-serif;--dur: .2s;--ease: cubic-bezier(.2, 0, 0, 1);--btn-bg: transparent;--btn-border: 1px solid hsl(var(--line));--btn-fg: hsl(var(--accent));--btn-weight: 500;--btn-hover-bg: color-mix(in srgb, hsl(var(--accent)) 8%, transparent);--btn-hover-border: hsl(var(--line));--btn-active-transform: scale(.98);--btn-accent-bg: hsl(var(--accent));--btn-accent-border: 0 solid transparent;--btn-accent-hover-shadow: 0 1px 3px 1px rgb(0 0 0 / .2);--ghost-hover-bg: color-mix(in srgb, hsl(var(--fg)) 8%, transparent);--in-bg: color-mix(in srgb, hsl(var(--accent)) 7%, hsl(var(--surface)));--in-border: 0 solid transparent;--in-shadow: inset 0 -1px 0 hsl(var(--line));--in-hover-border: transparent;--in-focus-border: transparent;--in-focus-shadow: inset 0 -2px 0 hsl(var(--accent));--in-r: 4px 4px 0 0;--in-px: 1rem;--in-py: .8rem;--chk-size: 1.15rem;--chk-r: 2px;--chk-border: 2px solid hsl(var(--muted));--chk-bg: transparent;--chk-hover-border: hsl(var(--fg));--card-bg: color-mix(in srgb, hsl(var(--accent)) 5%, hsl(var(--surface)));--card-border: 0 solid transparent;--card-shadow: 0 1px 2px rgb(0 0 0 / .15);--win-bg: color-mix(in srgb, hsl(var(--accent)) 7%, hsl(var(--surface)));--win-border: 0 solid transparent;--win-shadow: 0 6px 18px 4px rgb(0 0 0 / .25);--dialog-anim: bt-pop .3s cubic-bezier(.05, .7, .1, 1);--tb-border: 0 solid transparent;--tb-pad: 1.5rem 1.5rem .5rem;--tb-size: 1.5rem;--tb-weight: 400;--close-r: 9999px;--close-hover-bg: color-mix(in srgb, hsl(var(--fg)) 10%, transparent);--bar-border: 0 solid transparent;--menu-bg: color-mix(in srgb, hsl(var(--accent)) 6%, hsl(var(--surface)));--menu-border: 0 solid transparent;--pop-shadow: 0 2px 6px 2px rgb(0 0 0 / .18), 0 1px 2px rgb(0 0 0 / .3);--menu-anim: bt-reveal .2s cubic-bezier(.05, .7, .1, 1);--menu-hi-bg: color-mix(in srgb, hsl(var(--accent)) 14%, transparent);--side-bg: color-mix(in srgb, hsl(var(--accent)) 5%, hsl(var(--surface)));--top-bg: color-mix(in srgb, hsl(var(--accent)) 8%, hsl(var(--bg)));--top-shadow: 0 1px 3px rgb(0 0 0 / .12);--player-bg: color-mix(in srgb, hsl(var(--accent)) 8%, hsl(var(--surface)));--nav-hover-bg: color-mix(in srgb, hsl(var(--fg)) 6%, transparent);--nav-active-bg: color-mix(in srgb, hsl(var(--accent)) 22%, hsl(var(--surface)));--row-hover: color-mix(in srgb, hsl(var(--accent)) 10%, transparent);--rng-appearance: none;--rng-h: .5rem;--rng-track: color-mix(in srgb, hsl(var(--accent)) 24%, hsl(var(--surface)));--rng-tw: 1.25rem;--rng-th: 1.25rem;--rng-thumb: hsl(var(--accent));--rng-ts: 0 1px 3px rgb(0 0 0 / .3)}[data-ui=material] .btn.btn-accent{padding-inline:1.25rem}[data-ui=material]{--player-in: bt-slide-in .42s cubic-bezier(.05, .7, .1, 1) both;--player-out: bt-slide-out .2s cubic-bezier(.3, 0, .8, .15) both;--player-ms: .2s;--pop-out: bt-fade-out .15s cubic-bezier(.3, 0, .8, .15) both;--pop-ms: .15s}[data-ui=material]{--page-in: bt-fade-through .26s cubic-bezier(.2, 0, 0, 1) backwards}@keyframes bt-fade-through{0%{opacity:0;transform:scale(.95)}to{opacity:1;transform:none}}
` };

// engine/src/bundle.ts
var BUILTIN = builtin_default;
var current2 = BUILTIN;
var source = "builtin";
var STYLE_ID = "turbothemes-css";
function installBundle(b, from) {
  current2 = b;
  source = from;
  setCatalog(b.catalog);
  if (typeof document === "undefined") return;
  let el2 = document.getElementById(STYLE_ID);
  if (!el2) {
    el2 = document.createElement("style");
    el2.id = STYLE_ID;
    document.head.appendChild(el2);
  }
  el2.dataset.hash = b.manifest.hash;
  el2.textContent = b.css;
}
var currentBundle = () => current2;
var bundleSource = () => source;
function loadStored() {
  const raw = safeGet(storageKey("themes"));
  if (!raw) return null;
  try {
    const s = JSON.parse(raw);
    if (s.builtinHash !== BUILTIN.manifest.hash || s.manifest?.apiVersion > API_VERSION) {
      safeRemove(storageKey("themes"));
      return null;
    }
    if (validateCatalog(s.catalog).length || typeof s.css !== "string") return null;
    return { manifest: s.manifest, catalog: s.catalog, css: s.css };
  } catch {
    return null;
  }
}
function store(b) {
  const s = { ...b, builtinHash: BUILTIN.manifest.hash };
  return safeSet(storageKey("themes"), JSON.stringify(s));
}
var forgetStored = () => safeRemove(storageKey("themes"));

// engine/src/theme.ts
var resolveTheme = (id) => {
  const c = config();
  const real = id === "system" ? prefersDark() ? c.system.dark : c.system.light : effectiveTheme(id);
  return getPalette(real) ?? getPalette(c.defaults.theme) ?? listPalettes()[0];
};
var themeStyle = (id) => {
  const p = resolveTheme(id);
  const style = { colorScheme: p.dark ? "dark" : "light" };
  for (const [k, v] of Object.entries(tokens(p))) style[`--${k}`] = v;
  return style;
};
function applyTheme(theme) {
  const root2 = document.documentElement;
  const p = resolveTheme(theme);
  root2.dataset.theme = p.id;
  root2.dataset.mode = p.dark ? "dark" : "light";
  root2.style.colorScheme = p.dark ? "dark" : "light";
  const t = tokens(p);
  for (const name of TOKEN_NAMES) {
    if (t[name]) root2.style.setProperty(`--${name}`, t[name]);
    else root2.style.removeProperty(`--${name}`);
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", `hsl(${p.bg[0]} ${p.bg[1]}% ${p.bg[2]}%)`);
}

// engine/src/wallpaper.ts
var IMAGE_KEY = () => storageKey("wallpaperImage");
var getCustomImage = () => safeGet(IMAGE_KEY());
var mulberry32 = (seed) => () => {
  seed |= 0;
  seed = seed + 1831565813 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};
var motifSvg = (motif, def) => {
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
      for (let y = 40; y < H; y += 70) for (let x = 40 + y / 70 % 2 * 35; x < W; x += 70) {
        body += `<circle cx="${x}" cy="${y}" r="${(2 + rand() * 5).toFixed(1)}" fill="${ink}" fill-opacity="${(0.05 + rand() * 0.14).toFixed(2)}"/>`;
      }
      break;
    case "rays":
      for (let i = 0; i < 18; i++) {
        const a = i / 18 * Math.PI * 0.9 + Math.PI * 0.55;
        const a2 = a + 0.06;
        body += `<path d="M${W} 0L${(W + Math.cos(a) * 2200).toFixed(0)} ${(Math.sin(a) * 2200).toFixed(0)}L${(W + Math.cos(a2) * 2200).toFixed(0)} ${(Math.sin(a2) * 2200).toFixed(0)}Z" fill="${ink}" fill-opacity="${(0.04 + i % 3 * 0.03).toFixed(2)}"/>`;
      }
      break;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${body}</svg>`;
};
var tinted = (def) => def.wallpaper ? { ...def, bg: def.wallpaper.bg ?? def.bg, primary: def.wallpaper.primary ?? def.primary } : def;
var themeWallpaper = (id) => {
  const def = tinted(resolveTheme(id));
  const [h, s] = def.primary;
  const [bh, bs, bl] = def.bg;
  const top = `hsl(${bh} ${bs}% ${def.dark ? bl + 2 : bl}%)`;
  const bottom = `hsl(${h} ${Math.min(bs + 10, 60)}% ${def.dark ? bl + 9 : bl - 8}%)`;
  const glow = (pos, hue, a) => `radial-gradient(ellipse at ${pos}, hsl(${hue} ${s}% ${def.dark ? 50 : 62}% / ${a}), transparent 60%)`;
  const svg = `url("data:image/svg+xml,${encodeURIComponent(motifSvg(def.motif, def))}") center / cover no-repeat`;
  return [svg, glow("12% 8%", h, def.dark ? 0.32 : 0.28), glow("90% 90%", (h + 50) % 360, def.dark ? 0.24 : 0.22), `linear-gradient(165deg, ${top}, ${bottom})`].join(", ");
};
var host = null;
var img = null;
var dim = null;
var ensureHost = () => {
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
var applyWallpaper = (theme, settings) => {
  const root2 = document.documentElement;
  if (!settings.enabled) {
    root2.removeAttribute("data-wallpaper");
    host?.remove();
    host = null;
    return;
  }
  ensureHost();
  const custom = settings.custom ? getCustomImage() : null;
  img.style.background = custom ? `center / cover no-repeat url("${custom}")` : themeWallpaper(theme);
  dim.style.opacity = String(root2.dataset.mode === "light" ? settings.darkness * 0.4 : settings.darkness);
  root2.setAttribute("data-wallpaper", "on");
};
var saveCustomWallpaper = (file) => new Promise((resolve, reject) => {
  if (!file.type.startsWith("image/")) return reject(new Error("Please choose an image file"));
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    const scale = Math.min(1, 1920 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    if (safeSet(IMAGE_KEY(), canvas.toDataURL("image/jpeg", 0.8))) resolve();
    else reject(new Error("That image is too large to store in this browser"));
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error("Could not read that image"));
  };
  image.src = url;
});
var clearCustomWallpaper = () => safeRemove(IMAGE_KEY());

// engine/src/effects/liquidGlass.ts
var NS = "http://www.w3.org/2000/svg";
var TARGETS = ".bt-side, .bt-player, .bt-tabbar, .bt-menu, .bt-window";
var MATERIALIZE = ".bt-menu, .bt-window";
var BIG_SHAPE = 15e4;
var N_GLASS = 1.5;
var LIGHT = (() => {
  const x = -0.62, y = -0.78, l = Math.hypot(x, y);
  return [x / l, y / l];
})();
function roundedRect(px, py, hw, hh, r) {
  const qx = Math.abs(px) - (hw - r), qy = Math.abs(py) - (hh - r);
  const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
  const sd = Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
  const sx = px < 0 ? -1 : 1, sy = py < 0 ? -1 : 1;
  let nx, ny;
  if (qx > 0 && qy > 0) {
    const l = Math.hypot(qx, qy) || 1;
    nx = qx / l * sx;
    ny = qy / l * sy;
  } else if (qx > qy) {
    nx = sx;
    ny = 0;
  } else {
    nx = 0;
    ny = sy;
  }
  return { sd, nx, ny };
}
var bezelFor = (w, h) => Math.max(8, Math.min(28, Math.min(w, h) * 0.22));
var squircle = (t) => {
  const u = Math.pow(1 - t, 4);
  const height = Math.pow(1 - u, 0.25);
  const slope = u === 1 ? Infinity : Math.pow(1 - t, 3) / Math.pow(1 - u, 0.75);
  return { height, slope };
};
function displacementAt(t, bezel) {
  const bezelHeight = bezel * 0.9;
  const base = bezelHeight * 0.5;
  const { height, slope } = squircle(t);
  const theta1 = Math.min(Math.atan(slope * (bezelHeight / bezel)), Math.PI / 180 * 86);
  const theta2 = Math.asin(Math.sin(theta1) / N_GLASS);
  return (base + bezelHeight * height) * Math.tan(theta1 - theta2);
}
function maxDisplacement(bezel) {
  let m = 0;
  for (let i = 0; i <= 1024; i++) m = Math.max(m, displacementAt(i / 1024, bezel));
  return m;
}
var canvasFor = (w, h) => {
  const c = document.createElement("canvas");
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  return c;
};
function rimBand(w, h, band, fn) {
  for (let y = 0; y < h; y++) {
    if (y < band || y >= h - band || band * 2 >= w) {
      for (let x = 0; x < w; x++) fn(x, y);
      continue;
    }
    for (let x = 0; x < band; x++) fn(x, y);
    for (let x = w - band; x < w; x++) fn(x, y);
  }
}
function renderLens({ w, h, r }, dpr = 1) {
  const bezel = bezelFor(w, h);
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  const maxD = maxDisplacement(bezel) || 1;
  const scale = maxD * 2;
  const hw = w / 2, hh = h / 2;
  const ms = Math.min(1, 640 / Math.max(w, h));
  const mw = Math.max(2, Math.round(w * ms)), mh = Math.max(2, Math.round(h * ms));
  const mc = canvasFor(mw, mh), mctx = mc.getContext("2d");
  const mimg = mctx.createImageData(mw, mh);
  const STEPS2 = 128;
  const profile = Array.from({ length: STEPS2 + 1 }, (_, i) => displacementAt(i / STEPS2, bezel));
  for (let i = 0; i < mimg.data.length; i += 4) {
    mimg.data[i] = 128;
    mimg.data[i + 1] = 128;
    mimg.data[i + 2] = 128;
    mimg.data[i + 3] = 255;
  }
  rimBand(mw, mh, Math.ceil((bezel + radius * 0.3 + 2) * ms), (x, y) => {
    const px = (x + 0.5) / ms - hw, py = (y + 0.5) / ms - hh;
    const { sd, nx, ny } = roundedRect(px, py, hw, hh, radius);
    const depth = -sd;
    if (depth >= bezel) return;
    const d = profile[Math.max(0, Math.min(STEPS2, Math.round(Math.max(depth, 0) / bezel * STEPS2)))];
    const i = (y * mw + x) * 4;
    mimg.data[i] = Math.round(255 * (0.5 - nx * d / scale));
    mimg.data[i + 1] = Math.round(255 * (0.5 - ny * d / scale));
  });
  mctx.putImageData(mimg, 0, 0);
  const ss = Math.min(Math.max(dpr, 1), 2, Math.sqrt(9e5 / (w * h)) || 1);
  const sw = Math.max(2, Math.round(w * ss)), sh = Math.max(2, Math.round(h * ss));
  const sc = canvasFor(sw, sh), sctx = sc.getContext("2d");
  const simg = sctx.createImageData(sw, sh);
  rimBand(sw, sh, Math.ceil((10 + radius * 0.3) * ss), (x, y) => {
    const px = (x + 0.5) / ss - hw, py = (y + 0.5) / ss - hh;
    const { sd, nx, ny } = roundedRect(px, py, hw, hh, radius);
    const depth = -sd;
    if (depth < 0 || depth > 9) return;
    const facing = nx * LIGHT[0] + ny * LIGHT[1];
    const lobe = 0.1 + 0.9 * Math.pow(Math.max(facing, 0), 1.6) + 0.5 * Math.pow(Math.max(-facing, 0), 1.6);
    const line = Math.exp(-Math.pow(depth / 1.05, 2)) + 0.16 * Math.exp(-Math.pow(depth / 5, 2));
    const a = Math.min(1, line * lobe);
    const i = (y * sw + x) * 4;
    simg.data[i] = simg.data[i + 1] = simg.data[i + 2] = 255;
    simg.data[i + 3] = Math.round(255 * a);
  });
  sctx.putImageData(simg, 0, 0);
  return { map: mc.toDataURL("image/png"), spec: sc.toDataURL("image/png"), scale };
}
var root = null;
var active = false;
var mo = null;
var ro = null;
var scanQueued = false;
var uid = 0;
var cache = /* @__PURE__ */ new Map();
var applied = /* @__PURE__ */ new WeakMap();
var tracked = /* @__PURE__ */ new Set();
var animations = /* @__PURE__ */ new WeakMap();
var rebuild = /* @__PURE__ */ new WeakMap();
var lensAllowed = () => {
  const l = options().lens;
  return typeof l === "function" ? l() : l;
};
function supportsLens() {
  if (typeof CSS === "undefined" || typeof navigator === "undefined") return false;
  const brands = navigator.userAgentData?.brands.map((b) => b.brand) ?? [];
  const chromium = brands.includes("Chromium") || /Chrome\//.test(navigator.userAgent) && !/Edg\/.*Firefox/.test(navigator.userAgent);
  if (window.matchMedia?.("(pointer: coarse)").matches || !lensAllowed()) return false;
  return chromium && CSS.supports("backdrop-filter", "url(#x) blur(1px)");
}
function buildFilter(key, g, dpr, unique) {
  const img2 = renderLens(g, dpr);
  const id = `lg-${unique ? "u" : "k"}${++uid}`;
  const f = document.createElementNS(NS, "filter");
  f.setAttribute("id", id);
  f.setAttribute("color-interpolation-filters", "sRGB");
  f.setAttribute("filterUnits", "userSpaceOnUse");
  f.setAttribute("x", "0");
  f.setAttribute("y", "0");
  f.setAttribute("width", String(g.w));
  f.setAttribute("height", String(g.h));
  const image = document.createElementNS(NS, "feImage");
  image.setAttribute("href", img2.map);
  image.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", img2.map);
  image.setAttribute("x", "0");
  image.setAttribute("y", "0");
  image.setAttribute("width", String(g.w));
  image.setAttribute("height", String(g.h));
  image.setAttribute("preserveAspectRatio", "none");
  image.setAttribute("result", "map");
  f.appendChild(image);
  const bases = [];
  if (g.w * g.h > BIG_SHAPE) {
    const d = document.createElementNS(NS, "feDisplacementMap");
    d.setAttribute("in", "SourceGraphic");
    d.setAttribute("in2", "map");
    d.setAttribute("scale", String(img2.scale));
    d.setAttribute("xChannelSelector", "R");
    d.setAttribute("yChannelSelector", "G");
    d.setAttribute("result", "out");
    f.appendChild(d);
    bases.push({ el: d, base: img2.scale });
    root.appendChild(f);
    const probe2 = new Image();
    probe2.src = img2.map;
    const lens2 = { id, node: f, bases, spec: img2.spec, ready: (probe2.decode ? probe2.decode() : Promise.resolve()).catch(() => void 0) };
    if (!unique) cache.set(key, lens2);
    return lens2;
  }
  const bands = [["r", 1, "1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"], ["g", 0.955, "0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"], ["b", 0.91, "0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"]];
  for (const [name, k, matrix] of bands) {
    const d = document.createElementNS(NS, "feDisplacementMap");
    d.setAttribute("in", "SourceGraphic");
    d.setAttribute("in2", "map");
    d.setAttribute("scale", String(img2.scale * k));
    d.setAttribute("xChannelSelector", "R");
    d.setAttribute("yChannelSelector", "G");
    d.setAttribute("result", `d${name}`);
    f.appendChild(d);
    bases.push({ el: d, base: img2.scale * k });
    const m = document.createElementNS(NS, "feColorMatrix");
    m.setAttribute("in", `d${name}`);
    m.setAttribute("type", "matrix");
    m.setAttribute("values", matrix);
    m.setAttribute("result", name);
    f.appendChild(m);
  }
  for (const [a, b, out] of [["r", "g", "rg"], ["rg", "b", "out"]]) {
    const bl = document.createElementNS(NS, "feBlend");
    bl.setAttribute("in", a);
    bl.setAttribute("in2", b);
    bl.setAttribute("mode", "screen");
    bl.setAttribute("result", out);
    f.appendChild(bl);
  }
  root.appendChild(f);
  const probe = new Image();
  probe.src = img2.map;
  const ready = (probe.decode ? probe.decode() : Promise.resolve()).catch(() => void 0);
  const lens = { id, node: f, bases, spec: img2.spec, ready };
  if (!unique) cache.set(key, lens);
  return lens;
}
var isLiquidScope = (el2) => el2.closest("[data-ui]")?.dataset.ui === "liquid";
function cornerRadius(el2) {
  const cs = getComputedStyle(el2);
  const v = el2.matches(".bt-menu") ? "--menu-r" : el2.matches(".bt-window") ? "--win-r" : null;
  const settled = v ? parseFloat(cs.getPropertyValue(v)) : NaN;
  return Number.isFinite(settled) ? settled : parseFloat(cs.borderTopLeftRadius) || 0;
}
function apply(el2, settled = false) {
  const w = el2.offsetWidth, h = el2.offsetHeight;
  if (w < 4 || h < 4 || !isLiquidScope(el2)) return;
  const radius = Math.min(cornerRadius(el2), w / 2, h / 2);
  const dpr = window.devicePixelRatio || 1;
  const unique = el2.matches(MATERIALIZE);
  const q = (n) => Math.max(4, Math.round(n / 4) * 4);
  const key = unique ? `${w}x${h}r${Math.round(radius)}` : `${q(w)}x${q(h)}r${Math.round(radius)}@${dpr}`;
  const prev = applied.get(el2);
  if (prev?.key === key) {
    clearTimeout(rebuild.get(el2));
    rebuild.delete(el2);
    return;
  }
  if (prev && unique && !settled) {
    clearTimeout(rebuild.get(el2));
    rebuild.set(el2, window.setTimeout(() => {
      rebuild.delete(el2);
      if (el2.isConnected) apply(el2, true);
    }, 140));
    return;
  }
  const g = { w: unique ? w : q(w), h: unique ? h : q(h), r: radius };
  const lens = !unique && cache.get(key) || buildFilter(key, g, dpr, unique);
  if (prev && unique) prev.lens.node.remove();
  applied.set(el2, { key, lens });
  el2.style.setProperty("--lg-spec", `url("${lens.spec}")`);
  if (!supportsLens()) return;
  const first = !prev;
  const entering = first && unique && el2.matches(".bt-window") ? Promise.allSettled(el2.getAnimations().map((a) => a.finished)) : Promise.resolve();
  void Promise.all([lens.ready, entering]).then(() => {
    if (applied.get(el2)?.lens !== lens || !el2.isConnected) return;
    el2.style.setProperty("--lg-filter", `url(#${lens.id})`);
    if (first && unique) materialize(el2, lens);
  });
}
var STEPS = [0.28, 0.58, 0.8, 0.93, 1];
function materialize(el2, lens, ms = 300) {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const set = (k) => lens.bases.forEach(({ el: d, base }) => d.setAttribute("scale", String(base * k)));
  set(0);
  STEPS.forEach((k, i) => animations.set(el2, window.setTimeout(() => {
    if (lens.node.isConnected) set(k);
  }, (i + 1) / STEPS.length * ms)));
}
function scan() {
  scanQueued = false;
  if (!active) return;
  const found = new Set(document.querySelectorAll(TARGETS));
  for (const el2 of found) {
    if (!tracked.has(el2)) {
      tracked.add(el2);
      ro?.observe(el2);
    }
    apply(el2);
  }
  for (const el2 of [...tracked]) {
    if (!el2.isConnected) {
      tracked.delete(el2);
      ro?.unobserve(el2);
      const a = applied.get(el2);
      if (a && a.lens.id.startsWith("lg-u")) a.lens.node.remove();
      applied.delete(el2);
    }
  }
}
var queueScan = () => {
  if (!scanQueued) {
    scanQueued = true;
    requestAnimationFrame(scan);
  }
};
function onPointer(e) {
  const t = e.target?.closest?.('.btn, .bt-nav, .bt-tab, [role="menuitem"], .lg-glow');
  if (!t) return;
  const r = t.getBoundingClientRect();
  t.style.setProperty("--mx", `${e.clientX - r.left}px`);
  t.style.setProperty("--my", `${e.clientY - r.top}px`);
}
var recede = () => document.documentElement.classList.add("lg-inactive");
var restore = () => document.documentElement.classList.remove("lg-inactive");
function syncLiquidGlass(on) {
  if (typeof document === "undefined") return;
  if (on === active) {
    if (on) queueScan();
    return;
  }
  active = on;
  if (on) {
    root = document.createElementNS(NS, "svg");
    root.setAttribute("aria-hidden", "true");
    root.setAttribute("width", "0");
    root.setAttribute("height", "0");
    root.style.cssText = "position:absolute;width:0;height:0;pointer-events:none;overflow:hidden";
    root.appendChild(document.createElementNS(NS, "defs"));
    document.body.appendChild(root);
    ro = new ResizeObserver(queueScan);
    mo = new MutationObserver(queueScan);
    mo.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("blur", recede);
    window.addEventListener("focus", restore);
    if (!document.hasFocus()) recede();
    queueScan();
  } else {
    mo?.disconnect();
    ro?.disconnect();
    mo = ro = null;
    document.removeEventListener("pointermove", onPointer);
    document.removeEventListener("pointerdown", onPointer);
    window.removeEventListener("blur", recede);
    window.removeEventListener("focus", restore);
    restore();
    for (const el2 of tracked) {
      el2.style.removeProperty("--lg-filter");
      el2.style.removeProperty("--lg-spec");
      applied.delete(el2);
    }
    tracked.clear();
    cache.clear();
    root?.remove();
    root = null;
  }
}

// engine/src/effects/ripple.ts
var TARGET = ".btn, .bt-nav, .bt-tab, .bt-toplink";
var FLAG = "__turbothemesRipple";
function startRipple() {
  if (typeof document === "undefined") return;
  const doc = document;
  if (doc[FLAG]) return;
  doc[FLAG] = true;
  document.addEventListener("pointerdown", (e) => {
    if (!(e.target instanceof Element)) return;
    const host2 = e.target.closest(TARGET);
    if (!host2 || host2.disabled) return;
    const ui = host2.closest("[data-ui]")?.getAttribute("data-ui");
    if (!ui || !getStyle(ui)?.effects?.includes("ripple")) return;
    const r = host2.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2.2;
    const dot = document.createElement("span");
    dot.className = "bt-ripple";
    dot.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    host2.appendChild(dot);
    dot.addEventListener("animationend", () => dot.remove(), { once: true });
  }, { capture: true, passive: true });
}

// engine/src/effects/index.ts
function syncEffects(styleId) {
  const effects = getStyle(styleId)?.effects ?? [];
  syncLiquidGlass(effects.includes("liquid-glass"));
  startRipple();
}

// engine/src/fonts.ts
var loaded = /* @__PURE__ */ new Set();
function ensureFonts(styleId) {
  const o = options();
  if (o.fonts !== "cdn" || typeof document === "undefined") return;
  for (const need2 of getStyle(styleId)?.fonts ?? []) {
    const files = [...need2.weights.map((w) => `${w}`), ...(need2.italic ?? []).map((w) => `${w}-italic`)];
    for (const f of files) {
      const href = `${o.fontsCdn}/@fontsource/${need2.package}@5/${f}.css`;
      if (loaded.has(href)) continue;
      loaded.add(href);
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.turbothemesFont = need2.package;
      document.head.appendChild(link);
    }
  }
}

// engine/src/apply.ts
function applyAppearance(a) {
  applyTheme(a.theme);
  const root2 = document.documentElement;
  const d = config().defaults;
  const ui = effectiveUi(a.ui);
  root2.dataset.ui = isUiStyle(ui) ? ui : d.ui;
  root2.dataset.glass = a.glass === "clear" ? "clear" : "regular";
  ensureFonts(root2.dataset.ui);
  syncEffects(root2.dataset.ui);
  applyWallpaper(a.theme, { enabled: !!a.wallpaper, darkness: a.wallpaperDarkness ?? 0.3, custom: !!a.wallpaperCustom });
}
var watching = false;
function watchSystemTheme(get) {
  if (watching || typeof window === "undefined" || !window.matchMedia) return;
  watching = true;
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    const a = get();
    if (a.theme === "system" || a.theme === "auto") applyAppearance(a);
  });
}

// engine/src/hash.ts
function hashText(str, seed = 0) {
  let h1 = 3735928559 ^ seed, h2 = 1103547991 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ h1 >>> 16, 2246822507) ^ Math.imul(h2 ^ h2 >>> 13, 3266489909);
  h2 = Math.imul(h2 ^ h2 >>> 16, 2246822507) ^ Math.imul(h1 ^ h1 >>> 13, 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

// engine/src/updater.ts
var ids = (c) => [...c.palettes.map((p) => `colour:${p.id}`), ...c.styles.map((s) => `style:${s.id}`)];
var fetchBundle = async (source3) => {
  const manifest = JSON.parse(await source3.fetchText("manifest.json"));
  const [catalogText, css2] = await Promise.all([source3.fetchText(manifest.files.catalog), source3.fetchText(manifest.files.css)]);
  return { manifest, catalogText, css: css2 };
};
async function checkForUpdates(source3, o = {}) {
  const result = await tryUpdate(source3, o);
  if (result.status !== "failed") safeSet(storageKey("themesChecked"), String(Date.now()));
  return result;
}
async function tryUpdate(source3, o) {
  try {
    const head = JSON.parse(await source3.fetchText("manifest.json"));
    if (head.apiVersion > API_VERSION) return { status: "engine-too-old", message: "These themes need a newer turbothemes engine. Update the turbothemes package in this app." };
    if (head.hash === currentBundle().manifest.hash) return { status: "current", message: "Themes are up to date." };
    let got = await fetchBundle(source3);
    if (hashText(got.catalogText + "\n" + got.css) !== got.manifest.hash) {
      await new Promise((r) => setTimeout(r, o.retryDelayMs ?? 1200));
      got = await fetchBundle(source3);
      if (hashText(got.catalogText + "\n" + got.css) !== got.manifest.hash) return { status: "failed", message: "The downloaded themes do not match their checksum. Try again in a minute." };
    }
    const catalog = JSON.parse(got.catalogText);
    const problems = validateCatalog(catalog);
    if (problems.length) return { status: "failed", message: `The downloaded themes are not valid (${problems[0]}). Keeping the current ones.` };
    if (catalog.apiVersion > API_VERSION) return { status: "engine-too-old", message: "These themes need a newer turbothemes engine. Update the turbothemes package in this app." };
    const before = new Set(ids(currentBundle().catalog));
    const after = new Set(ids(catalog));
    const bundle = { manifest: got.manifest, catalog, css: got.css };
    installBundle(bundle, "downloaded");
    store(bundle);
    const added = [...after].filter((x) => !before.has(x)).map((x) => x.split(":")[1]);
    const removed = [...before].filter((x) => !after.has(x)).map((x) => x.split(":")[1]);
    return { status: "updated", message: added.length ? `Themes updated: ${added.length} new.` : "Themes updated.", added, removed };
  } catch (e) {
    return { status: "failed", message: `Could not reach the themes (${e instanceof Error ? e.message : String(e)}).` };
  }
}
var lastChecked = () => {
  const v = Number(safeGet(storageKey("themesChecked")));
  return v > 0 ? v : null;
};
var checkDue = (everyMs) => {
  const last2 = lastChecked();
  return last2 === null || Date.now() - last2 > everyMs;
};

// engine/src/source.ts
var urlSource = (base, headers) => ({
  describe: base,
  async fetchText(file) {
    const res = await fetch(`${base.replace(/\/$/, "")}/${file}`, { cache: "no-cache", headers });
    if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
    return res.text();
  }
});
function githubSource(o = {}) {
  const repo = o.repo ?? "TurboNZL/turboengine", ref = o.ref ?? "main", dir = o.dir ?? "themes/dist";
  if (!o.token) return { ...urlSource(`https://raw.githubusercontent.com/${repo}/${ref}/${dir}`), describe: `github.com/${repo}@${ref}` };
  return {
    describe: `github.com/${repo}@${ref} (private)`,
    async fetchText(file) {
      const res = await fetch(`https://api.github.com/repos/${repo}/contents/${dir}/${file}?ref=${encodeURIComponent(ref)}`, {
        cache: "no-cache",
        headers: { Accept: "application/vnd.github.raw+json", Authorization: `Bearer ${o.token}`, "X-GitHub-Api-Version": "2022-11-28" }
      });
      if (!res.ok) throw new Error(`${file}: HTTP ${res.status}${res.status === 404 || res.status === 401 ? " (is the token allowed to read the repository?)" : ""}`);
      return res.text();
    }
  };
}

// engine/src/picker.ts
var GROUPS = [["device", "Device"], ["own", "Standard"], ["colour", "Colours"], ["inspired", "Games, apps & devices"], ["platform", "Platforms"]];
var merge = (a, p) => p ? { ...a, ...p } : a;
var css = (h, s, l) => `hsl(${h} ${s}% ${l}%)`;
var triplet2 = (t) => `hsl(${t})`;
function swatch(id) {
  const p = getPalette(id);
  if (!p) return null;
  const t = tokens(p);
  const [bh, bs, bl] = p.bg, [ah, as, al] = p.primary;
  return t.bg ? { bg: triplet2(t.bg), surface: triplet2(t.surface), accent: triplet2(t.accent), text: triplet2(t.fg) } : { bg: css(bh, bs, bl), surface: css(bh, bs, Math.min(100, bl + (p.dark ? 4 : 3))), accent: css(ah, as, al), text: p.dark ? css(bh, Math.min(bs, 20), 95) : css(bh, Math.min(bs, 30), 12) };
}
function createPicker(engine, o = {}) {
  const listeners2 = /* @__PURE__ */ new Set();
  let previewPatch = null;
  let state2 = null;
  const build = () => {
    const appearance = engine.appearance();
    const shown = merge(appearance, previewPatch);
    return { appearance, shown, previewing: previewPatch !== null, revision: getRevision() };
  };
  const emit = () => {
    state2 = null;
    listeners2.forEach((fn) => fn());
  };
  engine.onAppearance(() => {
    previewPatch = null;
    emit();
  });
  subscribe(emit);
  const labels = Object.fromEntries(GROUPS.map(([id, l]) => [id, o.groupLabels?.[id] ?? l]));
  const self = {
    getState: () => state2 ??= build(),
    subscribe(fn) {
      listeners2.add(fn);
      return () => {
        listeners2.delete(fn);
      };
    },
    themes(filter = "all") {
      const ok = (t) => filter === "all" || t.dark === null || filter === "dark" === t.dark;
      const groups = new Map(GROUPS.map(([id]) => [id, []]));
      for (const t of listThemes()) {
        if (!ok(t)) continue;
        const g = t.dark === null ? "device" : t.group ?? "colour";
        groups.get(g)?.push({ id: t.id, label: t.label, note: t.note, dark: t.dark, colors: t.dark === null ? null : swatch(t.id) });
      }
      return GROUPS.map(([id]) => ({ id, label: labels[id], items: groups.get(id) })).filter((g) => g.items.length);
    },
    styles: () => listStyles().map((s) => ({ id: s.id, label: s.label, description: s.description ?? "", font: s.font ?? "system-ui", effects: s.effects, isAuto: s.id === "auto" })),
    set(patch) {
      engine.apply(merge(engine.appearance(), patch));
    },
    preview(patch) {
      previewPatch = patch;
      engine.preview(patch ? merge(engine.appearance(), patch) : null);
      emit();
    },
    matchingTheme(styleId) {
      const a = engine.appearance();
      const id = styleId ?? a.ui;
      const m = listStyles().find((s) => s.id === (id === "auto" ? deviceLook().ui : id));
      const mt = m?.matching;
      if (!mt) return null;
      return resolveTheme(a.theme).dark ? mt.dark ?? mt.light : mt.light;
    },
    useMatchingTheme() {
      const t = self.matchingTheme();
      if (t) self.set({ theme: t });
    },
    device: () => deviceLook(),
    wallpaper: {
      hasCustom: () => getCustomImage() !== null,
      getCustom: () => getCustomImage(),
      async setCustom(file) {
        await saveCustomWallpaper(file);
        self.set({ wallpaper: true, wallpaperCustom: true });
      },
      clearCustom() {
        clearCustomWallpaper();
        self.set({ wallpaperCustom: false });
      }
    },
    checkForUpdates: () => engine.update(),
    version: () => engine.version(),
    resetThemes() {
      engine.resetToBuiltin();
      emit();
    },
    resetLook() {
      self.set({ theme: "auto", ui: "auto", glass: "regular", wallpaper: false });
    }
  };
  return self;
}

// engine/src/picker-element.ts
var SECTIONS = ["theme", "ui", "wallpaper", "updates"];
var STYLE_ID2 = "turbothemes-picker-css";
var CSS2 = `
turbo-themes-picker { display: block; color: hsl(var(--fg)); font-size: 0.875rem; line-height: 1.35; }
turbo-themes-picker .tt-panel { display: grid; gap: 1rem; padding: 1rem; box-sizing: border-box; max-width: 100%; }
turbo-themes-picker .tt-sec { display: grid; gap: 0.4rem; min-width: 0; justify-items: start; }
turbo-themes-picker .tt-sec > select, turbo-themes-picker .tt-sec > .tt-tiles, turbo-themes-picker .tt-sec > .tt-group, turbo-themes-picker .tt-sec > label, turbo-themes-picker .tt-sec > .tt-hint, turbo-themes-picker .tt-sec > .tt-row { justify-self: stretch; }
turbo-themes-picker .tt-sec > h3 { margin: 0; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: hsl(var(--muted)); }
turbo-themes-picker .tt-row { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
turbo-themes-picker .tt-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr)); gap: 0.35rem; }
turbo-themes-picker .tt-group { display: grid; gap: 0.3rem; }
turbo-themes-picker .tt-group > h4 { margin: 0.25rem 0 0; font-size: 0.7rem; font-weight: 600; color: hsl(var(--muted)); }
turbo-themes-picker .tt-tile { display: flex; align-items: center; gap: 0.45rem; min-width: 0; padding: 0.3rem 0.5rem; text-align: left; cursor: pointer; font: inherit; color: inherit;
  background: hsl(var(--raised) / 0.5); border: 1px solid hsl(var(--line)); border-radius: var(--radius, 8px); }
turbo-themes-picker .tt-tile:hover, turbo-themes-picker .tt-tile:focus-visible { border-color: hsl(var(--accent)); outline: none; }
turbo-themes-picker .tt-tile[aria-checked="true"] { border-color: hsl(var(--accent)); box-shadow: 0 0 0 1px hsl(var(--accent)); }
turbo-themes-picker .tt-tile > span.tt-name { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
turbo-themes-picker .tt-sw { display: flex; flex: none; width: 2.2rem; height: 1.2rem; overflow: hidden; border-radius: 3px; border: 1px solid hsl(var(--line) / 0.6); }
turbo-themes-picker .tt-sw > i { flex: 1; }
turbo-themes-picker .tt-hint { margin: 0; color: hsl(var(--muted)); font-size: 0.8rem; }
turbo-themes-picker label { display: grid; gap: 0.2rem; }
turbo-themes-picker label.tt-inline { display: flex; align-items: center; gap: 0.5rem; }
turbo-themes-picker select.input { max-width: 100%; }
turbo-themes-picker input[type="range"] { width: 100%; }
turbo-themes-picker .tt-float { position: fixed; right: 1rem; bottom: 1rem; z-index: 2147483000; display: grid; justify-items: end; gap: 0.5rem; }
turbo-themes-picker .tt-float .tt-pop { width: min(26rem, calc(100vw - 2rem)); max-height: min(34rem, calc(100vh - 6rem)); overflow: auto; }
turbo-themes-picker .tt-float .tt-pop[hidden] { display: none; }
`;
var opt = (label, value, selected) => {
  const o = document.createElement("option");
  o.textContent = label;
  o.value = value;
  o.selected = selected;
  return o;
};
var el = (tag, props = {}, ...kids) => {
  const { class: cls, ...rest } = props;
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  Object.assign(n, rest);
  for (const k of kids) if (k) n.append(k);
  return n;
};
var Base = typeof HTMLElement !== "undefined" ? HTMLElement : class {
};
var TurboThemesPicker = class extends Base {
  picker;
  off = [];
  busy = false;
  open = false;
  message = "";
  seen = null;
  connectedCallback() {
    if (!document.getElementById(STYLE_ID2)) {
      const s = el("style");
      s.id = STYLE_ID2;
      s.textContent = CSS2;
      document.head.appendChild(s);
    }
    this.picker = getEngine().picker();
    this.off.push(this.picker.subscribe(() => {
      const st = this.picker.getState();
      if (this.busy || this.seen && this.seen.app === st.appearance && this.seen.rev === st.revision) return;
      this.render();
    }));
    const close = (e) => {
      if (this.open && this.hasAttribute("floating") && !this.contains(e.target)) {
        this.open = false;
        this.render();
      }
    };
    document.addEventListener("pointerdown", close, true);
    this.off.push(() => document.removeEventListener("pointerdown", close, true));
    this.render();
  }
  disconnectedCallback() {
    this.off.forEach((f) => f());
    this.off = [];
  }
  static get observedAttributes() {
    return ["sections", "variant", "floating"];
  }
  attributeChangedCallback() {
    if (this.isConnected && this.picker) this.render();
  }
  sections() {
    const a = this.getAttribute("sections");
    if (!a) return [...SECTIONS];
    return a.split(",").map((x) => x.trim()).filter((x) => SECTIONS.includes(x));
  }
  changed(patch) {
    this.picker.set(patch);
    this.dispatchEvent(new CustomEvent("tt-change", { detail: this.picker.getState().appearance, bubbles: true }));
  }
  render() {
    const st = this.picker.getState();
    this.seen = { app: st.appearance, rev: st.revision };
    const body = this.panel();
    this.replaceChildren();
    if (!this.hasAttribute("floating")) {
      this.append(body);
      return;
    }
    const pop = el("div", { class: "card tt-pop" }, body);
    pop.hidden = !this.open;
    const btn = el("button", { class: "btn", type: "button", textContent: this.getAttribute("label") ?? "Themes" });
    btn.setAttribute("aria-expanded", String(this.open));
    btn.addEventListener("click", () => {
      this.open = !this.open;
      this.render();
    });
    this.append(el("div", { class: "tt-float" }, pop, btn));
  }
  panel() {
    const root2 = el("div", { class: "tt-panel" });
    for (const s of this.sections()) {
      const sec = { theme: () => this.themeSection(), ui: () => this.styleSection(), wallpaper: () => this.wallpaperSection(), updates: () => this.updatesSection() }[s]();
      if (sec) root2.append(sec);
    }
    return root2;
  }
  section(title, ...kids) {
    const s = el("div", { class: "tt-sec" }, el("h3", { textContent: title }));
    for (const k of kids) if (k) s.append(k);
    return s;
  }
  select(label, items, value, onChange) {
    const sel = el("select", { class: "input" });
    for (const i of items) sel.append(opt(i.label, i.id, i.id === value));
    sel.value = value;
    sel.setAttribute("aria-label", label);
    sel.addEventListener("change", () => onChange(sel.value));
    return sel;
  }
  themeSection() {
    const p = this.picker, cur = p.getState().appearance;
    const groups = p.themes();
    if (this.getAttribute("variant") !== "tiles") {
      const sel = el("select", { class: "input" });
      for (const g of groups) {
        const og = el("optgroup");
        og.label = g.label;
        for (const t of g.items) og.append(opt(t.label, t.id, t.id === cur.theme));
        sel.append(og);
      }
      sel.value = cur.theme;
      sel.setAttribute("aria-label", "Colours");
      sel.addEventListener("change", () => this.changed({ theme: sel.value }));
      return this.section("Colours", sel, this.matchingButton());
    }
    const wrap = el("div", { class: "tt-sec" });
    wrap.addEventListener("mouseleave", () => p.preview(null));
    for (const g of groups) {
      const grid = el("div", { class: "tt-tiles", role: "radiogroup" });
      grid.setAttribute("aria-label", g.label);
      for (const t of g.items) {
        const tile = el("button", { class: "tt-tile", type: "button", title: t.note ? `${t.label}: ${t.note}` : t.label });
        tile.setAttribute("role", "radio");
        tile.setAttribute("aria-checked", String(t.id === cur.theme));
        if (t.colors) {
          const sw = el("span", { class: "tt-sw" });
          for (const c of [t.colors.bg, t.colors.surface, t.colors.accent, t.colors.text]) {
            const i = el("i");
            i.style.background = c;
            sw.append(i);
          }
          tile.append(sw);
        }
        tile.append(el("span", { class: "tt-name", textContent: t.label }));
        tile.addEventListener("click", () => this.changed({ theme: t.id }));
        tile.addEventListener("mouseenter", () => p.preview({ theme: t.id }));
        tile.addEventListener("focus", () => p.preview({ theme: t.id }));
        tile.addEventListener("blur", () => p.preview(null));
        grid.append(tile);
      }
      wrap.append(el("div", { class: "tt-group" }, el("h4", { textContent: g.label }), grid));
    }
    return this.section("Colours", wrap, this.matchingButton());
  }
  matchingButton() {
    const m = this.picker.matchingTheme();
    if (!m || m === this.picker.getState().appearance.theme) return null;
    const label = this.picker.themes().flatMap((g) => g.items).find((t) => t.id === m)?.label ?? m;
    const b = el("button", { class: "btn", type: "button", textContent: `Use matching colours (${label})` });
    b.addEventListener("click", () => {
      this.picker.useMatchingTheme();
      this.dispatchEvent(new CustomEvent("tt-change", { detail: this.picker.getState().appearance, bubbles: true }));
    });
    b.addEventListener("mouseenter", () => this.picker.preview({ theme: m }));
    b.addEventListener("mouseleave", () => this.picker.preview(null));
    return b;
  }
  styleSection() {
    const p = this.picker, cur = p.getState().appearance, styles = p.styles();
    const hint = el("p", { class: "tt-hint" });
    const describe = (id) => {
      const s = styles.find((x) => x.id === id);
      hint.textContent = s ? `${s.description}${s.isAuto ? ` On this device that is ${p.device().name}.` : ""}` : "";
    };
    describe(cur.ui);
    let control;
    if (this.getAttribute("variant") === "tiles") {
      const grid = el("div", { class: "tt-tiles", role: "radiogroup" });
      grid.setAttribute("aria-label", "UI style");
      grid.addEventListener("mouseleave", () => {
        p.preview(null);
        describe(cur.ui);
      });
      for (const s of styles) {
        const tile = el("button", { class: "tt-tile", type: "button", title: s.description }, el("span", { class: "tt-name", textContent: s.label }));
        tile.setAttribute("role", "radio");
        tile.setAttribute("aria-checked", String(s.id === cur.ui));
        tile.addEventListener("click", () => this.changed({ ui: s.id }));
        const show = () => {
          p.preview({ ui: s.id });
          describe(s.id);
        };
        tile.addEventListener("mouseenter", show);
        tile.addEventListener("focus", show);
        tile.addEventListener("blur", () => {
          p.preview(null);
          describe(cur.ui);
        });
        grid.append(tile);
      }
      control = grid;
    } else {
      const sel = this.select("UI style", styles, cur.ui, (v) => this.changed({ ui: v }));
      sel.addEventListener("change", () => describe(sel.value));
      control = sel;
    }
    const glass = cur.ui === "liquid" ? this.glassRow(cur.glass ?? "regular") : null;
    return this.section("UI style", control, hint, glass);
  }
  glassRow(v) {
    const row = el("div", { class: "tt-row" }, el("span", { textContent: "Glass" }));
    for (const g of ["regular", "clear"]) {
      const b = el("button", { class: "btn", type: "button", textContent: g });
      b.setAttribute("aria-pressed", String(v === g));
      b.addEventListener("click", () => this.changed({ glass: g }));
      row.append(b);
    }
    return row;
  }
  wallpaperSection() {
    const p = this.picker, a = p.getState().appearance;
    const on = el("input", { type: "checkbox", checked: !!a.wallpaper });
    on.addEventListener("change", () => this.changed({ wallpaper: on.checked }));
    const check = el("label", { class: "tt-inline" }, on, "Show a wallpaper");
    const dark = el("input", { type: "range", min: "0", max: "90", value: String(Math.round((a.wallpaperDarkness ?? 0.3) * 100)) });
    dark.setAttribute("aria-label", "Wallpaper darkness");
    dark.addEventListener("input", () => {
      this.busy = true;
      this.changed({ wallpaperDarkness: Number(dark.value) / 100 });
      this.busy = false;
    });
    const file = el("input", { type: "file", accept: "image/*", hidden: true });
    file.addEventListener("change", async () => {
      const f = file.files?.[0];
      if (!f) return;
      try {
        await p.wallpaper.setCustom(f);
        this.message = "";
      } catch (e) {
        this.message = e instanceof Error ? e.message : "Could not load that image";
        this.render();
      }
    });
    const load = el("label", { class: "btn" }, p.wallpaper.hasCustom() ? "Choose another picture" : "Use my own picture", file);
    const row = el("div", { class: "tt-row" }, load);
    if (p.wallpaper.hasCustom()) {
      const own = el("button", { class: "btn", type: "button", textContent: a.wallpaperCustom ? "Use the theme wallpaper" : "Use my picture" });
      own.addEventListener("click", () => this.changed({ wallpaperCustom: !a.wallpaperCustom }));
      const rm = el("button", { class: "btn", type: "button", textContent: "Remove my picture" });
      rm.addEventListener("click", () => p.wallpaper.clearCustom());
      row.append(own, rm);
    }
    return this.section("Wallpaper", check, a.wallpaper ? el("label", {}, "Darkness", dark) : null, a.wallpaper ? row : null, this.message ? el("p", { class: "tt-hint", textContent: this.message }) : null);
  }
  updatesSection() {
    const p = this.picker, v = p.version();
    const status = el("span", { class: "tt-hint", textContent: `${v.origin === "downloaded" ? "Downloaded" : "Built-in"} themes ${v.hash}` });
    const btn = el("button", { class: "btn", type: "button", textContent: "Check for newer themes" });
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      status.textContent = "Checking\u2026";
      const r = await p.checkForUpdates();
      status.textContent = r.message;
      btn.disabled = false;
    });
    return this.section("Themes", el("div", { class: "tt-row" }, btn, status));
  }
};
function definePicker() {
  if (typeof customElements === "undefined" || customElements.get("turbo-themes-picker")) return;
  customElements.define("turbo-themes-picker", TurboThemesPicker);
}

// engine/src/index.ts
var source2 = githubSource();
var last = null;
var subscribed = false;
var persisting = false;
var appearanceListeners = /* @__PURE__ */ new Set();
var DEFAULT_EVERY = 6 * 60 * 60 * 1e3;
function start(o = {}) {
  setOptions({ ...o.storagePrefix ? { storagePrefix: o.storagePrefix } : {}, ...o.fonts ? { fonts: o.fonts } : {}, ...o.lens !== void 0 ? { lens: o.lens } : {} });
  if (o.host) setHostInfo(o.host);
  if (o.source !== void 0) source2 = o.source;
  const stored = loadStored();
  if (stored) installBundle(stored, "downloaded");
  else installBundle(BUILTIN, "builtin");
  persisting = !!o.persist;
  const saved = persisting ? readSaved() : null;
  const initial = saved ?? o.appearance ?? (persisting ? { theme: "auto", ui: "auto" } : void 0);
  if (initial) {
    last = initial;
    applyAppearance(initial);
  }
  if (typeof window !== "undefined") watchSystemTheme(() => last ?? { theme: "auto", ui: "auto" });
  if (!subscribed) {
    subscribed = true;
    subscribe(() => {
      if (last) applyAppearance(last);
    });
  }
  const update = async () => {
    if (!source2) return { status: "failed", message: "Online updates are switched off in this app." };
    return checkForUpdates(source2);
  };
  if (o.autoUpdate !== false && source2 && typeof window !== "undefined") {
    const every = o.checkEveryMs ?? DEFAULT_EVERY;
    const run = () => {
      if (checkDue(every)) void update();
    };
    if (typeof requestIdleCallback === "function") requestIdleCallback(run, { timeout: 5e3 });
    else setTimeout(run, 2e3);
    window.addEventListener("online", run);
  }
  const engine = {
    apply(a) {
      last = a;
      applyAppearance(a);
      if (persisting) safeSet(storageKey("appearance"), JSON.stringify(a));
      appearanceListeners.forEach((fn) => fn(a));
    },
    appearance: () => last ?? { theme: "auto", ui: "auto" },
    preview(a) {
      const t = a ?? last;
      if (t) applyAppearance(t);
    },
    onAppearance(fn) {
      appearanceListeners.add(fn);
      return () => {
        appearanceListeners.delete(fn);
      };
    },
    picker: () => createPicker(engine),
    update,
    resetToBuiltin() {
      forgetStored();
      installBundle(BUILTIN, "builtin");
    },
    setSource(s) {
      source2 = s;
    },
    version: () => ({ hash: currentBundle().manifest.hash, built: currentBundle().manifest.built, origin: bundleSource(), checkedAt: lastChecked(), source: source2 ? source2.describe : "off" })
  };
  globalThis.__turbothemesEngine = engine;
  if (o.picker) definePicker();
  return engine;
}
var getEngine = () => {
  const e = globalThis.__turbothemesEngine;
  if (!e) throw new Error("turbothemes: call start() before using <turbo-themes-picker>.");
  return e;
};
function readSaved() {
  try {
    const a = JSON.parse(safeGet(storageKey("appearance")) ?? "null");
    return a && typeof a.theme === "string" && typeof a.ui === "string" ? a : null;
  } catch {
    return null;
  }
}
export {
  API_VERSION,
  TOKEN_NAMES,
  applyAppearance,
  applyTheme,
  applyWallpaper,
  buildPalette,
  checkForUpdates,
  clearCustomWallpaper,
  createPicker,
  definePicker,
  detectLook,
  deviceLook,
  effectiveTheme,
  effectiveUi,
  ensureFonts,
  getCatalog,
  getCustomImage,
  getEngine,
  getPalette,
  getRevision,
  getStyle,
  githubSource,
  hex,
  isTheme,
  isUiStyle,
  listPalettes,
  listStyles,
  listThemes,
  readableOn,
  resolveTheme,
  saveCustomWallpaper,
  setHostInfo,
  start,
  subscribe,
  themeStyle,
  themeWallpaper,
  toHsl,
  toTriplet,
  tokens,
  urlSource,
  watchSystemTheme
};
