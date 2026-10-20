"use strict";
var TurboThemes = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // engine/src/index.ts
  var index_exports = {};
  __export(index_exports, {
    API_VERSION: () => API_VERSION,
    TOKEN_NAMES: () => TOKEN_NAMES,
    applyAppearance: () => applyAppearance,
    applyTheme: () => applyTheme,
    applyWallpaper: () => applyWallpaper,
    buildPalette: () => buildPalette,
    checkForUpdates: () => checkForUpdates,
    clearCustomWallpaper: () => clearCustomWallpaper,
    counterpartOf: () => counterpartOf,
    createPicker: () => createPicker,
    definePicker: () => definePicker,
    detectLook: () => detectLook,
    deviceLook: () => deviceLook,
    effectiveTheme: () => effectiveTheme,
    effectiveUi: () => effectiveUi,
    enhanceSelect: () => enhanceSelect,
    enhanceSelects: () => enhanceSelects,
    ensureFonts: () => ensureFonts,
    getCatalog: () => getCatalog,
    getCustomImage: () => getCustomImage,
    getEngine: () => getEngine,
    getPalette: () => getPalette,
    getRevision: () => getRevision,
    getStyle: () => getStyle,
    githubSource: () => githubSource,
    hex: () => hex,
    isTheme: () => isTheme,
    isUiStyle: () => isUiStyle,
    listPalettes: () => listPalettes,
    listStyles: () => listStyles,
    listThemes: () => listThemes,
    readableOn: () => readableOn,
    resolveTheme: () => resolveTheme,
    saveCustomWallpaper: () => saveCustomWallpaper,
    setHostInfo: () => setHostInfo,
    start: () => start,
    subscribe: () => subscribe,
    themeStyle: () => themeStyle,
    themeWallpaper: () => themeWallpaper,
    toHsl: () => toHsl,
    toTriplet: () => toTriplet,
    tokens: () => tokens,
    urlSource: () => urlSource,
    watchSystemTheme: () => watchSystemTheme
  });

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
  function buildPairs(palettes, styles) {
    const mode = new Map(palettes.map((p) => [p.id, p.mode]));
    const out = /* @__PURE__ */ new Map();
    const join = (a, b) => {
      if (a === b || out.has(a) || out.has(b) || !mode.has(a) || !mode.has(b) || mode.get(a) === mode.get(b)) return;
      out.set(a, b);
      out.set(b, a);
    };
    for (const p of palettes) if (p.pair) join(p.id, p.pair);
    for (const s of sorted(styles)) if (s.matching?.dark) join(s.matching.light, s.matching.dark);
    return out;
  }
  function setCatalog(catalog) {
    const palettes = sorted(catalog.palettes).map((p) => buildPalette(p));
    state = { catalog, palettes, byId: new Map(palettes.map((p) => [p.id, p])), styles: new Map(catalog.styles.map((s) => [s.id, s])), pairs: buildPairs(catalog.palettes, catalog.styles) };
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
      ...s.palettes.map((p) => ({ id: p.id, label: p.label, dark: p.dark, note: p.note, group: p.group, pair: s.pairs.get(p.id) }))
    ];
  }
  function listStyles() {
    const s = need();
    return [...s.catalog.config.choices.ui.map((c) => ({ id: c.id, label: c.label, description: c.description ?? "", font: c.font ?? "system-ui" })), ...sorted(s.catalog.styles)];
  }
  var counterpartOf = (id) => need().pairs.get(id);
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
  var builtin_default = { "manifest": { "apiVersion": 2, "hash": "11uiihd28u2", "built": "2026-10-18T22:57:20.562Z", "files": { "catalog": "themes.json", "css": "themes.css" } }, "catalog": { "apiVersion": 2, "palettes": [{ "id": "default", "label": "Standard v2", "mode": "dark", "bg": [240, 12, 7], "primary": [262, 83, 66], "motif": "stars", "own": true, "note": "Dark, medium density", "group": "own", "order": 0 }, { "id": "turbomusic", "label": "TurboMusic Dark", "mode": "dark", "bg": [270, 20, 7], "primary": [271, 91, 65], "motif": "waves", "group": "own", "pair": "turbomusic-light", "note": "TurboMusic's own look, dark: the logo's purple note on near-black", "order": 2 }, { "id": "turbokeep", "label": "TurboKeep Dark", "mode": "dark", "bg": [36, 22, 7], "primary": [39, 100, 56], "motif": "hills", "group": "own", "pair": "turbokeep-light", "note": "TurboKeep's own look, dark: the logo's amber on warm near-black", "order": 3 }, { "id": "turbodocs", "label": "TurboDocs Dark", "mode": "dark", "bg": [180, 18, 8], "primary": [170, 72, 46], "motif": "grid", "group": "own", "pair": "turbodocs-light", "note": "TurboDocs' own look, dark: the logo's teal on a near-black with a hint of the same hue", "order": 4 }, { "id": "turbopantry", "label": "TurboPantry Dark", "mode": "dark", "bg": [165, 24, 7], "primary": [155, 70, 55], "motif": "hills", "group": "own", "pair": "turbopantry-light", "note": "TurboPantry's own look, dark: the jar's mint green on deep green-black", "order": 4 }, { "id": "classic", "label": "Classic", "mode": "dark", "bg": [240, 6, 4], "primary": [217, 91, 60], "motif": "grid", "own": true, "note": "The original look, tighter", "group": "own", "order": 10 }, { "id": "light", "label": "Light", "mode": "light", "bg": [40, 20, 97], "primary": [262, 70, 52], "motif": "hills", "own": true, "note": "Light, medium density", "group": "own", "order": 20 }, { "id": "turbomusic-light", "label": "TurboMusic Light", "mode": "light", "bg": [270, 30, 97], "primary": [271, 81, 53], "motif": "waves", "group": "own", "pair": "turbomusic", "note": "TurboMusic's own look, light", "order": 22 }, { "id": "turbokeep-light", "label": "TurboKeep Light", "mode": "light", "bg": [40, 45, 96], "primary": [35, 95, 44], "motif": "hills", "group": "own", "pair": "turbokeep", "note": "TurboKeep's own look, light", "order": 23 }, { "id": "turbodocs-light", "label": "TurboDocs Light", "mode": "light", "bg": [170, 30, 96], "primary": [173, 80, 28], "motif": "grid", "group": "own", "pair": "turbodocs", "note": "TurboDocs' own look, light: a deeper teal on paper white, dark enough for text and buttons", "order": 24 }, { "id": "turbopantry-light", "label": "TurboPantry Light", "mode": "light", "bg": [150, 35, 96], "primary": [158, 72, 32], "motif": "hills", "group": "own", "pair": "turbopantry", "note": "TurboPantry's own look, light", "order": 24 }, { "id": "daylight", "label": "Daylight", "mode": "light", "bg": [210, 40, 96.5], "primary": [221, 83, 48], "fg": "222 84% 5%", "mutedFg": "215 16% 42%", "motif": "waves", "group": "colour", "pair": "dark", "order": 30 }, { "id": "sand", "label": "Sand", "mode": "light", "bg": [40, 33, 95], "primary": [28, 90, 40], "fg": "28 30% 12%", "mutedFg": "30 14% 36%", "motif": "hills", "group": "colour", "order": 40 }, { "id": "dark", "label": "Slate", "mode": "dark", "bg": [222, 47, 5], "primary": [217, 91, 55], "motif": "grid", "group": "colour", "pair": "daylight", "order": 50 }, { "id": "midnight", "label": "Midnight", "mode": "dark", "bg": [232, 50, 6], "primary": [243, 85, 67], "motif": "stars", "group": "colour", "order": 60 }, { "id": "ocean", "label": "Ocean", "mode": "dark", "bg": [200, 60, 6], "primary": [188, 85, 42], "motif": "waves", "group": "colour", "order": 70 }, { "id": "forest", "label": "Forest", "mode": "dark", "bg": [160, 35, 5], "primary": [152, 69, 38], "motif": "peaks", "group": "colour", "order": 80 }, { "id": "plum", "label": "Plum", "mode": "dark", "bg": [285, 35, 6], "primary": [322, 75, 52], "motif": "dots", "group": "colour", "order": 90 }, { "id": "crimson", "label": "Crimson", "mode": "dark", "bg": [350, 40, 6], "primary": [351, 78, 52], "motif": "rays", "group": "colour", "order": 100 }, { "id": "ember", "label": "Ember", "mode": "dark", "bg": [22, 40, 6], "primary": [24, 94, 52], "motif": "peaks", "group": "colour", "order": 110 }, { "id": "graphite", "label": "Graphite", "mode": "dark", "bg": [220, 8, 9], "primary": [213, 60, 58], "motif": "grid", "step": 0.9, "group": "colour", "order": 120 }, { "id": "amoled", "label": "AMOLED black", "mode": "dark", "bg": [0, 0, 0], "primary": [190, 90, 50], "motif": "stars", "step": 1.4, "group": "colour", "order": 130 }, { "id": "nord", "label": "Nord", "mode": "dark", "bg": [220, 16, 17], "primary": [193, 43, 67], "fg": "218 27% 94%", "mutedFg": "219 15% 70%", "motif": "peaks", "step": 1.1, "group": "colour", "order": 140 }, { "id": "dracula", "label": "Dracula", "mode": "dark", "bg": [231, 15, 15], "primary": [265, 89, 72], "fg": "60 30% 96%", "mutedFg": "225 20% 72%", "motif": "dots", "step": 1.1, "group": "colour", "order": 150 }, { "id": "mocha", "label": "Mocha", "mode": "dark", "bg": [240, 21, 11], "primary": [267, 84, 78], "fg": "226 64% 88%", "mutedFg": "228 24% 72%", "motif": "hills", "step": 1.1, "group": "colour", "order": 160 }, { "id": "tokyo", "label": "Tokyo Night", "mode": "dark", "bg": [235, 22, 9], "primary": [222, 89, 70], "fg": "229 35% 82%", "mutedFg": "229 20% 62%", "motif": "stars", "step": 1.1, "group": "colour", "order": 170 }, { "id": "gruvbox", "label": "Gruvbox", "mode": "dark", "bg": [0, 0, 12], "primary": [42, 95, 55], "fg": "43 59% 81%", "mutedFg": "40 20% 62%", "motif": "hills", "step": 1.1, "group": "colour", "order": 180 }, { "id": "solarized", "label": "Solarized Dark", "mode": "dark", "bg": [193, 100, 9], "primary": [205, 69, 49], "fg": "44 87% 94%", "mutedFg": "186 13% 62%", "motif": "waves", "step": 1.2, "group": "colour", "order": 190 }, { "id": "adwaita", "label": "Adwaita", "mode": "light", "bg": "#fafafb", "primary": "#3584e4", "fg": "#2e3436", "mutedFg": "#5e5c64", "motif": "hills", "overrides": { "card": "#ffffff", "secondary": "#ebebed", "muted": "#ebebed", "accent": "#e1e1e4", "border": "#d8d8dc", "input": "#cfcfd4" }, "group": "platform", "order": 200 }, { "id": "adwaita-dark", "label": "Adwaita Dark", "mode": "dark", "bg": "#222226", "primary": "#3584e4", "onPrimary": "0 0% 100%", "fg": "0 0% 100%", "mutedFg": "#c0bfbc", "motif": "hills", "overrides": { "card": "#303030", "secondary": "#3a3a3a", "muted": "#383838", "accent": "#464646", "border": "#3d3d3d", "input": "#4a4a4a" }, "group": "platform", "order": 210 }, { "id": "breeze", "label": "Breeze", "mode": "light", "bg": "#eff0f1", "primary": "#3daee9", "onPrimary": "#ffffff", "fg": "#31363b", "mutedFg": "#6f7479", "motif": "waves", "overrides": { "card": "#fcfcfc", "secondary": "#e3e5e7", "muted": "#e3e5e7", "accent": "#d6e9f5", "border": "#bcc0c4", "input": "#bcc0c4" }, "group": "platform", "order": 220 }, { "id": "breeze-dark", "label": "Breeze Dark", "mode": "dark", "bg": "#31363b", "primary": "#3daee9", "onPrimary": "#1b1e20", "fg": "#eff0f1", "mutedFg": "#a1a9b1", "motif": "waves", "overrides": { "card": "#232629", "secondary": "#3b4045", "muted": "#3b4045", "accent": "#2f5e7a", "border": "#4d5359", "input": "#4d5359" }, "group": "platform", "order": 230 }, { "id": "win11", "label": "Windows 11", "mode": "light", "bg": "#f3f3f3", "primary": "#005fb8", "fg": "#1a1a1a", "mutedFg": "#5d5d5d", "motif": "waves", "overrides": { "card": "#fbfbfb", "secondary": "#ededed", "muted": "#ededed", "accent": "#e5e5e5", "border": "#e0e0e0", "input": "#c9c9c9" }, "group": "platform", "order": 240 }, { "id": "win11-dark", "label": "Windows 11 Dark", "mode": "dark", "bg": "#202020", "primary": "#4cc2ff", "onPrimary": "0 0% 0%", "fg": "0 0% 100%", "mutedFg": "#c5c5c5", "motif": "waves", "overrides": { "card": "#2b2b2b", "secondary": "#323232", "muted": "#323232", "accent": "#3a3a3a", "border": "#3b3b3b", "input": "#5a5a5a" }, "group": "platform", "order": 250 }, { "id": "win10", "label": "Windows 10", "mode": "light", "bg": "#ffffff", "primary": "#0078d7", "fg": "#000000", "mutedFg": "#666666", "motif": "grid", "overrides": { "card": "#f2f2f2", "secondary": "#e6e6e6", "muted": "#e6e6e6", "accent": "#cce4f7", "border": "#cccccc", "input": "#7a7a7a" }, "group": "platform", "order": 260 }, { "id": "win10-dark", "label": "Windows 10 Dark", "mode": "dark", "bg": "#1f1f1f", "primary": "#0078d7", "onPrimary": "0 0% 100%", "fg": "0 0% 100%", "mutedFg": "#b3b3b3", "motif": "grid", "overrides": { "card": "#2b2b2b", "secondary": "#333333", "muted": "#333333", "accent": "#404040", "border": "#404040", "input": "#7a7a7a" }, "group": "platform", "order": 270 }, { "id": "win7", "label": "Windows 7", "mode": "light", "bg": "#d4e3f5", "primary": "#2f6db5", "fg": "#1a2a3d", "mutedFg": "#566a82", "motif": "waves", "overrides": { "card": "#f0f4fa", "secondary": "#e3ebf5", "muted": "#e3ebf5", "accent": "#cfe2f7", "border": "#8fa9c8", "input": "#7b8da3" }, "group": "platform", "order": 280, "source": "Aero: pale glass blue desktop, #f0f0f0 control surfaces, #3399ff selection, #707070 control borders" }, { "id": "win7-dark", "label": "Windows 7 Dark", "mode": "dark", "bg": "#0d1521", "primary": "#4a90d9", "onPrimary": "0 0% 100%", "fg": "#e3edf9", "mutedFg": "#8fa6c2", "motif": "waves", "overrides": { "card": "#17222f", "secondary": "#1f2d3e", "muted": "#1c2939", "accent": "#27425f", "border": "#33506f", "input": "#3d5a7b" }, "group": "platform", "order": 290, "source": "A darkened Aero: smoked-glass navy with the same blue highlights" }, { "id": "winxp", "label": "Windows XP", "mode": "light", "bg": "#ece9d8", "primary": "#245edb", "fg": "#000000", "mutedFg": "#595959", "motif": "hills", "overrides": { "card": "#ffffff", "secondary": "#e2dfcd", "muted": "#e2dfcd", "accent": "#c1d2ee", "border": "#aca899", "input": "#7f9db9" }, "group": "platform", "order": 300, "source": "Luna (blue): #ece9d8 dialogs, white inputs, #0054e3 title bars" }, { "id": "win98", "label": "Windows 98", "mode": "light", "bg": "#008080", "primary": "#000080", "fg": "#000000", "mutedFg": "#404040", "motif": "grid", "overrides": { "card": "#c0c0c0", "secondary": "#d4d0c8", "muted": "#d4d0c8", "accent": "#a6a6a6", "border": "#808080", "input": "#808080" }, "group": "platform", "order": 310, "source": "Classic: teal desktop, #c0c0c0 windows, navy title bars" }, { "id": "macos", "label": "macOS", "mode": "light", "bg": "#f5f5f7", "primary": "#007aff", "fg": "#1d1d1f", "mutedFg": "#6e6e73", "motif": "hills", "overrides": { "card": "#ffffff", "secondary": "#ececf0", "muted": "#ececf0", "accent": "#e1e1e6", "border": "#d6d6db", "input": "#c7c7cc" }, "group": "platform", "order": 320 }, { "id": "macos-dark", "label": "macOS Dark", "mode": "dark", "bg": "#1e1e1e", "primary": "#0a84ff", "onPrimary": "0 0% 100%", "fg": "#f5f5f7", "mutedFg": "#98989d", "motif": "hills", "overrides": { "card": "#2a2a2c", "secondary": "#3a3a3c", "muted": "#323234", "accent": "#48484a", "border": "#3d3d40", "input": "#545458" }, "group": "platform", "order": 330 }, { "id": "aqua", "label": "Mac OS X Aqua", "mode": "light", "bg": "#ececec", "primary": "#3875d7", "onPrimary": "0 0% 100%", "fg": "#000000", "mutedFg": "#5a5a5a", "motif": "waves", "overrides": { "card": "#ffffff", "secondary": "#dcdcdc", "muted": "#e2e2e2", "accent": "#c7d7ee", "border": "#a5a5a5", "input": "#7f7f7f" }, "group": "platform", "order": 340, "source": "Aqua: #ececec chrome, white content, #3875d7 selection (the classic Mac OS X list highlight)" }, { "id": "holo-dark", "label": "Android Holo Dark", "mode": "dark", "bg": "#000000", "primary": "#33b5e5", "onPrimary": "0 0% 0%", "fg": "#ffffff", "mutedFg": "#a6a6a6", "motif": "grid", "overrides": { "card": "#121212", "secondary": "#2a2a2a", "muted": "#222222", "accent": "#1f3b47", "border": "#2e2e2e", "input": "#4d4d4d" }, "group": "platform", "order": 350, "source": 'Holo: the Android 4 palette. Blue #33b5e5 / #0099cc, black "background_dark", greys #1a1a1a / #333' }, { "id": "holo-light", "label": "Android Holo Light", "mode": "light", "bg": "#ffffff", "primary": "#0099cc", "onPrimary": "0 0% 100%", "fg": "#333333", "mutedFg": "#737373", "motif": "grid", "overrides": { "card": "#f3f3f3", "secondary": "#e5e5e5", "muted": "#ececec", "accent": "#cfeaf5", "border": "#d0d0d0", "input": "#a8a8a8" }, "group": "platform", "order": 360 }, { "id": "winamp", "label": "Winamp Classic", "mode": "dark", "bg": "#1c1c2a", "primary": "#00e800", "onPrimary": "0 0% 0%", "fg": "#d8dbe6", "mutedFg": "#8e96a8", "motif": "grid", "overrides": { "card": "#000000", "secondary": "#34344a", "muted": "#2a2a3c", "accent": "#000080", "border": "#46465e", "input": "#5a5a72" }, "group": "platform", "order": 370, "source": "Winamp 2.x: bluish metal chrome, a black playlist with #00ff00 text and #000080 selection (the skin's pledit.txt defaults)" }, { "id": "pipboy", "label": "Pip-Boy Green", "mode": "dark", "bg": "#04150a", "primary": "#35ff74", "onPrimary": "141 68% 5%", "fg": "#35ff74", "mutedFg": "#1fb350", "motif": "grid", "overrides": { "card": "#072214", "secondary": "#0a2e1a", "muted": "#0a2e1a", "accent": "#0f3d22", "border": "#12652f", "input": "#0a2e1a" }, "group": "inspired", "order": 380 }, { "id": "persona", "label": "Persona Red", "mode": "dark", "bg": "#0b0b0c", "primary": "#e60012", "onPrimary": "0 0% 100%", "fg": "#ffffff", "mutedFg": "#b9b9be", "motif": "rays", "overrides": { "card": "#131315", "secondary": "#1d1d20", "muted": "#1d1d20", "accent": "#4a0a10", "border": "#3a3a3e", "input": "#1d1d20" }, "group": "inspired", "order": 390 }, { "id": "dmg", "label": "DMG Green", "mode": "light", "bg": "#9bbc0f", "primary": "#306230", "onPrimary": "71 85% 40%", "fg": "#0f380f", "mutedFg": "#306230", "motif": "dots", "overrides": { "card": "#8bac0f", "secondary": "#8bac0f", "muted": "#8bac0f", "accent": "#8bac0f", "border": "#306230", "input": "#8bac0f" }, "group": "inspired", "order": 400 }, { "id": "zune", "label": "Zune Orange", "mode": "dark", "bg": "#000000", "primary": "#ee4d22", "onPrimary": "0 0% 100%", "fg": "#ffffff", "mutedFg": "#9a9a9a", "motif": "waves", "overrides": { "card": "#0f0f0f", "secondary": "#1a1a1a", "muted": "#1a1a1a", "accent": "#2a2a2a", "border": "#262626", "input": "#1d1d1d" }, "group": "inspired", "order": 410 }, { "id": "cyber", "label": "Night City", "mode": "dark", "bg": "#0a0a10", "primary": "#fcee0a", "onPrimary": "0 0% 0%", "fg": "#f2f2f2", "mutedFg": "#8c8c99", "motif": "grid", "overrides": { "card": "#12121a", "secondary": "#1c1c26", "muted": "#1c1c26", "accent": "#2b2b10", "border": "#4a4a1c", "input": "#181822" }, "group": "inspired", "order": 420 }, { "id": "inventory", "label": "Bedrock", "mode": "dark", "bg": "#484a4b", "primary": "#3c8527", "onPrimary": "0 0% 100%", "fg": "#ffffff", "mutedFg": "#c1c2c5", "motif": "peaks", "overrides": { "card": "#3d3f40", "secondary": "#58585a", "muted": "#3d3f40", "accent": "#5a5b5c", "border": "#323435", "input": "#1e1e1f" }, "group": "inspired", "order": 430, "source": "Minecraft Bedrock's dark settings screens (read off screenshots): slate panels, near-black outlines, grass-green switches and sliders" }, { "id": "lg-marshmallow", "label": "Marshmallow", "mode": "light", "bg": "#f1e5df", "primary": "#0b8fc0", "onPrimary": "0 0% 100%", "fg": "#4f3a3f", "mutedFg": "#917178", "motif": "hills", "overrides": { "card": "#fbf4f2", "secondary": "#f4dcdd", "muted": "#efdcd8", "accent": "#0b8fc0", "border": "#e3b3b9", "input": "#d99aa5" }, "group": "platform", "order": 440, "wallpaper": { "bg": [340, 75, 91], "primary": [338, 78, 62] }, "source": 'LG Optimus "Marshmallow" theme: pastel pink, cream and rose, read off a screenshot of its home screen (LG published no palette)' }, { "id": "lg-marshmallow-dark", "label": "Marshmallow Night", "mode": "dark", "bg": "#2b1224", "primary": "#33b5e5", "onPrimary": "0 0% 6%", "fg": "#ffe9f3", "mutedFg": "#d79ab8", "motif": "dots", "overrides": { "card": "#3b1b31", "secondary": "#4a2540", "muted": "#40213a", "accent": "#33b5e5", "border": "#5a2a49", "input": "#b45c8c" }, "group": "platform", "order": 450, "wallpaper": { "bg": [326, 52, 14], "primary": [326, 72, 54] } }, { "id": "fortnite-1", "label": "Fortnite Ch 1", "mode": "dark", "bg": "#41589a", "primary": "#f2e53c", "onPrimary": "230 40% 18%", "fg": "#ffffff", "mutedFg": "#c7d3f2", "motif": "waves", "overrides": { "card": "#4c66a8", "secondary": "#5d77b8", "muted": "#36508f", "accent": "#fbf6c8", "border": "#2d4078", "input": "#5f7bab" }, "group": "platform", "order": 460, "source": 'Read off screenshots (Epic does not publish its UI colours). Ch 1: muted slate blue with WHITE type, a dark navy top bar, pale lavender buttons with dark labels, cream "selected" and a soft yellow edge' }, { "id": "fortnite-2", "label": "Fortnite Ch 2-3", "mode": "dark", "bg": "#0a5db6", "primary": "#e8f03b", "onPrimary": "60 100% 6%", "fg": "#d9eeff", "mutedFg": "#9ccbf3", "motif": "grid", "overrides": { "card": "#0a4a9a", "secondary": "#0d6bcb", "muted": "#0a55a8", "accent": "#19b0f2", "border": "#22b6ff", "input": "#0b4a9a" }, "group": "platform", "order": 470, "source": "Ch 2-3: saturated royal blue, cyan outlines and selection, lime-yellow Start button, pale blue type" }, { "id": "fortnite-4", "label": "Fortnite Ch 4", "mode": "dark", "bg": "#0b3bb0", "primary": "#ffe500", "onPrimary": "0 0% 0%", "fg": "0 0% 100%", "mutedFg": "#b6c7f2", "motif": "stars", "overrides": { "card": "#0a2f94", "secondary": "#3a4254", "muted": "#2a3350", "accent": "#ffffff", "border": "#5a78d8", "input": "#161d3e" }, "group": "platform", "order": 480, "source": "Ch 4: blue again (not purple) with charcoal buttons, white outlines and a white selected row" }, { "id": "fortnite-5", "label": "Fortnite Ch 5-6", "mode": "dark", "bg": "#12151d", "primary": "#ffee00", "onPrimary": "0 0% 0%", "fg": "0 0% 100%", "mutedFg": "#a8aebb", "motif": "stars", "overrides": { "card": "#1b1f2b", "secondary": "#2a2f3d", "muted": "#262b38", "accent": "#e6e9ef", "border": "#363c4b", "input": "#222733" }, "group": "platform", "order": 490, "source": 'Ch 5-6: neutral dark glass, light grey "regular" buttons, a yellow "loud" button; no chapter colour any more' }, { "id": "zinc", "label": "Standard v1", "mode": "dark", "bg": "#09090b", "primary": "#2563eb", "onPrimary": "0 0% 100%", "fg": "#fafafa", "mutedFg": "#71717a", "motif": "grid", "overrides": { "card": "#101012", "secondary": "#18181b", "muted": "#18181b", "accent": "#27272a", "border": "#27272a", "input": "#27272a" }, "vars": { "positive": "#10b981", "negative": "#ef4444" }, "group": "platform", "order": 500, "source": "The first version of the app: Tailwind zinc on near-black (zinc-950 page, zinc-900 fields, zinc-800 borders, zinc-500 captions), blue-600 buttons" }, { "id": "material", "label": "Material You", "mode": "light", "bg": "#fef7ff", "primary": "#6750a4", "fg": "#1d1b20", "mutedFg": "#49454f", "motif": "dots", "overrides": { "card": "#f7f2fa", "secondary": "#e8def8", "muted": "#ece6f0", "accent": "#e8def8", "border": "#cac4d0", "input": "#79747e" }, "group": "platform", "order": 510 }, { "id": "material-dark", "label": "Material You Dark", "mode": "dark", "bg": "#141218", "primary": "#d0bcff", "onPrimary": "#381e72", "fg": "#e6e0e9", "mutedFg": "#cac4d0", "motif": "dots", "overrides": { "card": "#211f26", "secondary": "#4a4458", "muted": "#2b2930", "accent": "#4a4458", "border": "#49454f", "input": "#938f99" }, "group": "platform", "order": 520 }, { "id": "genius", "label": "Genius", "mode": "light", "bg": "#ffffff", "primary": "#ffff64", "onPrimary": "0 0% 0%", "fg": "#000000", "mutedFg": "#6b6b6b", "motif": "dots", "overrides": { "card": "#ffffff", "secondary": "#f5f5f5", "muted": "#f5f5f5", "accent": "#ffff64", "border": "#e0e0e0", "input": "#000000" }, "group": "inspired", "order": 530 }, { "id": "genius-dark", "label": "Genius Night", "mode": "dark", "bg": "#0a0a0a", "primary": "#ffff64", "onPrimary": "0 0% 0%", "fg": "#ffffff", "mutedFg": "#a0a0a0", "motif": "dots", "overrides": { "card": "#141414", "secondary": "#1e1e1e", "muted": "#1e1e1e", "accent": "#2a2a2a", "border": "#2c2c2c", "input": "#ffffff" }, "group": "inspired", "order": 540 }, { "id": "spotify", "label": "Spotify", "mode": "dark", "bg": "#000000", "primary": "#1ed760", "onPrimary": "0 0% 0%", "fg": "#ffffff", "mutedFg": "#b3b3b3", "motif": "waves", "overrides": { "card": "#121212", "secondary": "#1f1f1f", "muted": "#1f1f1f", "accent": "#2a2a2a", "border": "#2a2a2a", "input": "#242424" }, "group": "inspired", "order": 550 }, { "id": "ytmusic", "label": "YouTube Music", "mode": "dark", "bg": "#0f0f0f", "primary": "#ff0033", "onPrimary": "0 0% 100%", "fg": "#f1f1f1", "mutedFg": "#aaaaaa", "motif": "rays", "overrides": { "card": "#0f0f0f", "secondary": "#272727", "muted": "#272727", "accent": "#3f3f3f", "border": "#303030", "input": "#121212" }, "group": "inspired", "order": 560 }, { "id": "discord", "label": "Discord", "mode": "dark", "bg": "#313338", "primary": "#5865f2", "onPrimary": "0 0% 100%", "fg": "#f2f3f5", "mutedFg": "#949ba4", "motif": "dots", "overrides": { "card": "#2b2d31", "secondary": "#383a40", "muted": "#2b2d31", "accent": "#404249", "border": "#1e1f22", "input": "#1e1f22" }, "group": "inspired", "order": 570 }, { "id": "discord-onyx", "label": "Discord Onyx", "mode": "dark", "bg": "#000000", "primary": "#5865f2", "onPrimary": "0 0% 100%", "fg": "#f2f3f5", "mutedFg": "#80848e", "motif": "dots", "overrides": { "card": "#0a0a0b", "secondary": "#1e1e20", "muted": "#0a0a0b", "accent": "#1e1e20", "border": "#17171a", "input": "#000000" }, "group": "inspired", "order": 580 }, { "id": "discord-light", "label": "Discord Light", "mode": "light", "bg": "#ffffff", "primary": "#5865f2", "onPrimary": "0 0% 100%", "fg": "#313338", "mutedFg": "#5c5e66", "motif": "dots", "overrides": { "card": "#f2f3f5", "secondary": "#e3e5e8", "muted": "#f2f3f5", "accent": "#d7d9dd", "border": "#e3e5e8", "input": "#e3e5e8" }, "group": "inspired", "order": 590 }, { "id": "oneui", "label": "One UI", "mode": "light", "bg": "#f2f2f4", "primary": "#3e91ff", "onPrimary": "0 0% 100%", "fg": "#1a1a1c", "mutedFg": "#6b6b72", "motif": "waves", "overrides": { "card": "#ffffff", "secondary": "#e8e8ec", "muted": "#ececf0", "accent": "#dcdce2", "border": "#e0e0e6", "input": "#e8e8ec" }, "group": "inspired", "order": 600 }, { "id": "oneui-dark", "label": "One UI Dark", "mode": "dark", "bg": "#000000", "primary": "#3e91ff", "onPrimary": "0 0% 100%", "fg": "#f4f4f6", "mutedFg": "#a0a0a8", "motif": "waves", "overrides": { "card": "#1c1c1f", "secondary": "#2a2a2e", "muted": "#242427", "accent": "#38383d", "border": "#2a2a2e", "input": "#2a2a2e" }, "group": "inspired", "order": 610 }, { "id": "ado", "label": "Ado", "mode": "dark", "bg": "#04060f", "primary": "#2f6bff", "onPrimary": "0 0% 100%", "fg": "#f2f5ff", "mutedFg": "#8b97c4", "motif": "rays", "overrides": { "card": "#0a1024", "secondary": "#101a3a", "muted": "#0d1530", "accent": "#16255a", "border": "#1d2d6e", "input": "#101a3a" }, "group": "inspired", "order": 620 }, { "id": "ios", "label": "iOS", "mode": "light", "bg": "#f2f2f7", "primary": "#007aff", "onPrimary": "0 0% 100%", "fg": "#000000", "mutedFg": "#8e8e93", "motif": "hills", "overrides": { "card": "#ffffff", "secondary": "#e5e5ea", "muted": "#e5e5ea", "accent": "#d1d1d6", "border": "#c6c6c8", "input": "#e5e5ea" }, "group": "platform", "order": 630 }, { "id": "ios-dark", "label": "iOS Dark", "mode": "dark", "bg": "#000000", "primary": "#0a84ff", "onPrimary": "0 0% 100%", "fg": "#ffffff", "mutedFg": "#8e8e93", "motif": "hills", "overrides": { "card": "#1c1c1e", "secondary": "#2c2c2e", "muted": "#2c2c2e", "accent": "#3a3a3c", "border": "#38383a", "input": "#2c2c2e" }, "group": "platform", "order": 640 }, { "id": "yaru", "label": "Yaru (Ubuntu)", "mode": "light", "bg": "#fafafa", "primary": "#e95420", "onPrimary": "0 0% 100%", "fg": "#3d3d3d", "mutedFg": "#7d7d7d", "motif": "hills", "overrides": { "card": "#ffffff", "secondary": "#ebebeb", "muted": "#f0f0f0", "accent": "#e3e3e3", "border": "#dfdbd2", "input": "#dcdcdc" }, "group": "platform", "order": 650 }, { "id": "yaru-dark", "label": "Yaru Dark (Ubuntu)", "mode": "dark", "bg": "#333333", "primary": "#e95420", "onPrimary": "0 0% 100%", "fg": "#f2f2f2", "mutedFg": "#b0b0b0", "motif": "hills", "overrides": { "card": "#3d3d3d", "secondary": "#2b2b2b", "muted": "#383838", "accent": "#4a4a4a", "border": "#1f1f1f", "input": "#2b2b2b" }, "group": "platform", "order": 660 }], "styles": [{ "id": "default", "label": "Standard v2", "description": "The app's own look. Follows the colour theme's rounding and density (Classic is tighter).", "font": "Inter", "matching": { "light": "light", "dark": "default" }, "order": 10 }, { "id": "gtk4", "label": "GTK 4 (Adwaita)", "description": "libadwaita: a flush grey sidebar and flat header bar, 6 px grey buttons and entries, 12 px outlined cards and popovers, grey sidebar highlight, white round slider knobs, in Cantarell.", "font": "Cantarell", "matching": { "light": "adwaita", "dark": "adwaita-dark" }, "order": 20 }, { "id": "breeze", "label": "KDE Breeze", "description": "Plasma 6 Breeze: 5 px corners, a window-grey page with lighter panels, outlined buttons that take an accent frame on hover, solid accent selections and a light title bar in Noto Sans.", "font": "Noto Sans", "matching": { "light": "breeze", "dark": "breeze-dark" }, "fonts": [{ "package": "noto-sans", "weights": [400, 500, 600, 700] }], "order": 30 }, { "id": "win11", "label": "Windows 11", "description": "Fluent: rounded, light shadows, accent underline on fields and smooth slide-in motion in Segoe UI Variable.", "font": "Segoe UI Variable", "matching": { "light": "win11", "dark": "win11-dark" }, "fonts": [{ "package": "open-sans", "weights": [400, 600, 700] }], "order": 40 }, { "id": "win10", "label": "Windows 10", "description": "Flat and square with crisp 2 px borders and quick transitions in Segoe UI.", "font": "Segoe UI", "matching": { "light": "win10", "dark": "win10-dark" }, "fonts": [{ "package": "open-sans", "weights": [400, 600, 700] }], "order": 50 }, { "id": "win7", "label": "Windows 7", "description": "Aero: glass window frames, grey gel buttons with a blue glow and a red close button in Segoe UI.", "font": "Segoe UI", "matching": { "light": "win7", "dark": "win7-dark" }, "fonts": [{ "package": "open-sans", "weights": [400, 600, 700] }], "order": 60 }, { "id": "winxp", "label": "Windows XP", "description": "Luna: bevelled buttons, blue title bars, orange hover rings, instant menus and Tahoma.", "font": "Tahoma", "matching": { "light": "winxp" }, "order": 70 }, { "id": "win98", "label": "Windows 98", "description": "Classic: grey bevelled 3D controls, navy title bars, no animation and MS Sans Serif style type.", "font": "Tahoma", "matching": { "light": "win98" }, "order": 80 }, { "id": "macos", "label": "macOS (Big Sur to Sequoia)", "description": "Apple's flat 2020s look: 10 px windows, flat blue default buttons, a see-through sidebar and toolbar, sheet-style dialogs, in SF.", "font": "system-ui", "matching": { "light": "macos", "dark": "macos-dark" }, "order": 90 }, { "id": "aqua", "label": "Mac OS X Aqua (2001-09)", "description": "Cheetah to Snow Leopard: pinstriped windows, glossy gel capsule buttons with a pulsing default, jewel traffic lights and a blue source list in Lucida Grande.", "font": "Lucida Grande", "matching": { "light": "aqua" }, "order": 100 }, { "id": "toolbar", "label": "Standard v1", "description": "The first version's look: bordered cover tiles, uppercase black headings, a wordmark and a three-column player. Pairs with the Standard v1 colours; its toolbar arrangement is the Standard v1 layout, which any look can use.", "font": "system-ui", "matching": { "light": "zinc", "dark": "zinc" }, "order": 110 }, { "id": "liquid", "label": "macOS Liquid Glass", "description": "Apple's Liquid Glass: translucent floating bars that bend the light behind them, rim highlights, springy press and morphing menus.", "font": "SF Pro", "matching": { "light": "macos", "dark": "macos-dark" }, "effects": ["liquid-glass"], "order": 120 }, { "id": "holo", "label": "Android Holo (4.x, 2011-13)", "description": "Ice Cream Sandwich to KitKat: black and cyan, square flat controls, an action bar with a blue rule, underlined tabs and fields, blue-titled dialogs in Roboto.", "font": "Roboto", "matching": { "light": "holo-light", "dark": "holo-dark" }, "fonts": [{ "package": "roboto", "weights": [400, 500, 700] }], "order": 130 }, { "id": "winamp", "label": "Winamp 2 (classic skin)", "description": "The 1998 media player: dark bevelled metal, striped title bars, a black playlist with green LCD text and a navy selection, in tiny Arial.", "font": "Arial", "matching": { "light": "winamp" }, "order": 140 }, { "id": "lgux", "label": "LG Optimus: Marshmallow theme", "description": "The pink Marshmallow home-screen theme of LG Optimus UI 3.0 (2012-13), redone from its screenshot: flat pastel pink, thin rose frames, translucent white panels, a dark status bar and a rose page indicator.", "font": "Nunito", "matching": { "light": "lg-marshmallow", "dark": "lg-marshmallow-dark" }, "fonts": [{ "package": "nunito", "weights": [400, 600, 800] }, { "package": "fredoka", "weights": [500, 600] }], "effects": ["ripple"], "order": 150 }, { "id": "fortnite1", "label": "Fortnite Chapter 1 (2017-19)", "description": "Slanted buttons and panels, hard drop shadows, a yellow Play button and condensed capitals on bright blue.", "font": "Burbank Big Condensed", "matching": { "light": "fortnite-1", "dark": "fortnite-1" }, "fonts": [{ "package": "noto-sans", "weights": [400, 500, 600, 700] }, { "package": "barlow-condensed", "weights": [400, 600, 700, 800, 900], "italic": [700, 800, 900] }], "order": 160 }, { "id": "fortnite2", "label": "Fortnite Chapter 2-3 (2019-23)", "description": "The same slant on deep navy with see-through blue panels and a glowing Play button.", "font": "Burbank Big Condensed", "matching": { "light": "fortnite-2", "dark": "fortnite-2" }, "fonts": [{ "package": "barlow-condensed", "weights": [400, 600, 700, 800, 900], "italic": [700, 800, 900] }], "order": 170 }, { "id": "fortnite4", "label": "Fortnite Chapter 4 Rift UI (2023)", "description": "The lobby redesign: rounded shapes on purple, options down the left side, in Heading Now.", "font": "Heading Now", "matching": { "light": "fortnite-4", "dark": "fortnite-4" }, "fonts": [{ "package": "archivo", "weights": [400, 600, 700, 800, 900], "italic": [700, 800] }], "order": 180 }, { "id": "fortnite5", "label": "Fortnite Chapter 5-6 (2024-)", "description": "Rift UI refined: less rounding and blue instead of purple.", "font": "Heading Now", "matching": { "light": "fortnite-5", "dark": "fortnite-5" }, "fonts": [{ "package": "archivo", "weights": [400, 600, 700, 800, 900], "italic": [700, 800] }], "order": 190 }, { "id": "pipboy", "label": "Pip-Boy 3000 (Fallout)", "description": "Green phosphor on black: one hue, square frames, glowing type, scan lines and menus that pick by inverting.", "font": "VT323", "matching": { "light": "pipboy", "dark": "pipboy" }, "fonts": [{ "package": "vt323", "weights": [400] }], "order": 200 }, { "id": "persona", "label": "Persona 5", "description": "Black, red and white with hard offset shadows, italic capitals, solid red selection and white edges.", "font": "Anton", "matching": { "light": "persona", "dark": "persona" }, "fonts": [{ "package": "anton", "weights": [400] }, { "package": "barlow-condensed", "weights": [400, 600, 700, 800, 900], "italic": [700, 800, 900] }], "order": 210 }, { "id": "gameboy", "label": "Game Boy (DMG-01)", "description": "The four greens of the original LCD, 2 px square frames, hard shadows, inverted picks and Press Start 2P type. Covers are tinted green.", "font": "Press Start 2P", "matching": { "light": "dmg", "dark": "dmg" }, "fonts": [{ "package": "press-start-2p", "weights": [400] }, { "package": "vt323", "weights": [400] }], "order": 220 }, { "id": "zune", "label": "Zune HD (Metro)", "description": "Black with huge light lowercase titles, boxless content, white outlined controls and one orange accent that marks where you are.", "font": "Segoe UI Light", "matching": { "light": "zune", "dark": "zune" }, "fonts": [{ "package": "open-sans", "weights": [300] }], "order": 230 }, { "id": "cyber", "label": "Cyberpunk 2077", "description": "Near-black with caution-tape yellow and cyan glints, chamfered corners, condensed capitals and solid yellow selection bars.", "font": "Barlow Condensed", "matching": { "light": "cyber", "dark": "cyber" }, "fonts": [{ "package": "barlow-condensed", "weights": [400, 600, 700, 800, 900], "italic": [700, 800, 900] }], "order": 240 }, { "id": "blocky", "label": "Minecraft (Bedrock)", "description": "The game\u2019s dark settings screens: slate panels with black outlines, a light header bar, light grey buttons, two-part green on/off switches, green sliders and pixel type.", "font": "VT323", "matching": { "light": "inventory", "dark": "inventory" }, "fonts": [{ "package": "pixelify-sans", "weights": [400, 500, 700] }], "order": 250 }, { "id": "oneui", "label": "Samsung One UI", "description": "Big rounded squircle panels, frosted translucent tiles, round pill controls and thick pill sliders with a white fill. It has no colours of its own beyond the Samsung blue: the lilac in screenshots is the wallpaper, so choose a picture under Wallpaper.", "font": "Outfit", "matching": { "light": "oneui", "dark": "oneui-dark" }, "fonts": [{ "package": "outfit", "weights": [400, 500, 600] }], "order": 260 }, { "id": "genius", "label": "Genius", "description": "White pages, black type and the yellow highlighter: flat square controls with black outlines, yellow hover and selection, bold headings.", "font": "Helvetica Neue", "matching": { "light": "genius", "dark": "genius-dark" }, "order": 270 }, { "id": "spotify", "label": "Spotify", "description": "Black canvas with floating rounded dark panels, bold muted navigation, green pill buttons, tiles that lighten on hover and a white round play button.", "font": "Figtree", "matching": { "light": "spotify", "dark": "spotify" }, "fonts": [{ "package": "albert-sans", "weights": [400, 500, 600, 700, 800] }], "order": 280 }, { "id": "ytmusic", "label": "YouTube Music", "description": "Flat near-black pages, pill chips and search, rounded thumbnails, a rounded grey highlight on the current page and a red progress bar.", "font": "Roboto", "matching": { "light": "ytmusic", "dark": "ytmusic" }, "fonts": [{ "package": "roboto", "weights": [400, 500, 700] }], "order": 290 }, { "id": "discord", "label": "Discord", "description": "Layered slate panels, 4 px corners, blurple buttons, a recessed dark search field, rounded hover bars and a bold channel-list sidebar.", "font": "Noto Sans", "matching": { "light": "discord-light", "dark": "discord-onyx" }, "fonts": [{ "package": "noto-sans", "weights": [400, 500, 600, 700] }], "order": 300 }, { "id": "ado", "label": "Ado", "description": "Stage-black and electric blue with a hot red edge: condensed italic capitals, thin glowing outlines, a slash before page titles and square controls that light up.", "font": "Barlow Condensed", "matching": { "light": "ado", "dark": "ado" }, "fonts": [{ "package": "archivo", "weights": [400, 600, 700, 800, 900], "italic": [700, 800] }, { "package": "barlow-condensed", "weights": [400, 600, 700, 800, 900], "italic": [700, 800, 900] }], "order": 310 }, { "id": "yaru", "label": "Yaru (Ubuntu)", "description": "Ubuntu's GNOME theme: libadwaita shapes with the Ubuntu typeface and the orange accent.", "font": "Ubuntu", "matching": { "light": "yaru", "dark": "yaru-dark" }, "fonts": [{ "package": "ubuntu", "weights": [400, 500, 700] }], "order": 320 }, { "id": "material", "label": "Material 3", "description": "Pill buttons, tonal surfaces, filled fields with an underline and rounded dialogs in Roboto.", "font": "Roboto", "matching": { "light": "material", "dark": "material-dark" }, "fonts": [{ "package": "roboto", "weights": [400, 500, 700] }], "order": 330 }], "config": { "defaults": { "theme": "default", "ui": "default" }, "system": { "dark": "default", "light": "light" }, "choices": { "theme": [{ "id": "auto", "label": "Match this device", "note": "The palette of your device's own look, light or dark by its setting" }, { "id": "system", "label": "System", "note": "Follows your device" }], "ui": [{ "id": "auto", "label": "Match this device", "description": "Picks the look of the device you are on: Windows 11, macOS, Material (Android, Chromebooks), One UI (Samsung), the iOS palette on iPhones and iPads, GNOME/Yaru, or KDE Breeze on Linux. Follows the device's light or dark setting.", "font": "system-ui" }] }, "fallbackDevice": { "name": "Standard v2", "ui": "default", "light": "light", "dark": "default" }, "devices": [{ "name": "iOS", "when": { "any": [{ "ua": "iPhone|iPad|iPod" }, { "all": [{ "platform": "Mac" }, { "minTouchPoints": 2 }] }] }, "ui": "macos", "light": "ios", "dark": "ios-dark" }, { "name": "Samsung One UI", "when": { "all": [{ "ua": "Android" }, { "ua": "SM-|SAMSUNG|Galaxy" }] }, "ui": "oneui", "light": "oneui", "dark": "oneui-dark" }, { "name": "Material You", "when": { "ua": "Android" }, "ui": "material", "light": "material", "dark": "material-dark" }, { "name": "ChromeOS (Material)", "when": { "ua": "CrOS" }, "ui": "material", "light": "material", "dark": "material-dark" }, { "name": "Windows 11", "when": { "any": [{ "ua": "Windows" }, { "platform": "^Win" }] }, "ui": "win11", "light": "win11", "dark": "win11-dark" }, { "name": "macOS", "when": { "any": [{ "platform": "Mac" }, { "ua": "Macintosh" }] }, "ui": "macos", "light": "macos", "dark": "macos-dark" }, { "name": "KDE Breeze", "when": { "all": [{ "any": [{ "ua": "Linux|X11" }, { "platform": "Linux" }] }, { "env": "kde|plasma" }] }, "ui": "breeze", "light": "breeze", "dark": "breeze-dark" }, { "name": "Yaru (Ubuntu)", "when": { "all": [{ "any": [{ "ua": "Linux|X11" }, { "platform": "Linux" }] }, { "env": "ubuntu" }] }, "ui": "yaru", "light": "yaru", "dark": "yaru-dark" }, { "name": "GNOME (Adwaita)", "when": { "any": [{ "ua": "Linux|X11" }, { "platform": "Linux" }] }, "ui": "gtk4", "light": "adwaita", "dark": "adwaita-dark" }] } }, "css": `[data-theme=default]{--bg: 240 12% 7%;--surface: 240 10% 10%;--raised: 240 9% 14%;--line: 240 8% 20%;--hover: 240 8% 20%;--fg: 240 20% 96%;--muted: 240 8% 62%;--accent: 262 83% 66%;--accent-fg: 0 0% 100%;--good: 152 60% 50%;--warn: 42 92% 58%;--bad: 0 78% 64%;--top: 200 95% 65%;--radius: 14px;--font: "Inter", ui-sans-serif, system-ui, sans-serif;--row-y: .5rem;--grid-min: 11rem}[data-theme=light]{--bg: 40 20% 97%;--surface: 0 0% 100%;--raised: 40 15% 93%;--line: 40 10% 86%;--hover: 40 10% 86%;--fg: 240 15% 12%;--muted: 240 6% 42%;--accent: 262 70% 52%;--accent-fg: 0 0% 100%;--good: 152 60% 34%;--warn: 38 90% 40%;--bad: 0 70% 48%;--top: 210 90% 42%;--radius: 14px;--font: "Inter", ui-sans-serif, system-ui, sans-serif;--row-y: .5rem;--grid-min: 11rem}[data-theme=classic]{--bg: 240 6% 4%;--surface: 240 6% 7%;--raised: 240 4% 12%;--line: 240 4% 16%;--hover: 240 4% 16%;--fg: 0 0% 98%;--muted: 240 5% 56%;--accent: 217 91% 60%;--accent-fg: 0 0% 100%;--good: 158 64% 52%;--warn: 48 96% 53%;--bad: 0 91% 71%;--top: 213 94% 68%;--radius: 8px;--font: ui-sans-serif, system-ui, sans-serif;--row-y: .3rem;--grid-min: 8.5rem}[data-theme=classic] h1{font-weight:900;text-transform:uppercase;letter-spacing:-.025em}[data-theme=classic] h2{font-weight:900;text-transform:uppercase;letter-spacing:.1em;font-size:.875rem;line-height:1.25rem}[data-theme=classic] .card{border-radius:var(--radius);background:hsl(var(--surface) / .5)}[data-ui=gtk4] .bt-wf-close:is(:hover,:focus-visible){background:color-mix(in srgb,currentColor 22%,transparent);color:inherit}[data-ui=gtk4] .bt-wf-btn{--wf-r: 9999px;width:1.7rem;height:1.7rem}[data-ui=gtk4]{--chk-size: 1.1rem;--chk-r: 4px;--chk-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 28%, transparent);--chk-bg: transparent;--chk-hover-border: color-mix(in srgb, hsl(var(--fg)) 45%, transparent);--radius: 12px;--ctl-r: 6px;--card-r: 12px;--win-r: 12px;--menu-r: 12px;--nav-r: 6px;--font: "Adwaita Sans", "Cantarell", "Inter", system-ui, sans-serif;--dur: .15s;--ease: cubic-bezier(.25, .46, .45, .94);--tb-justify: center;--btn-bg: color-mix(in srgb, hsl(var(--fg)) 8%, transparent);--btn-hover-bg: color-mix(in srgb, hsl(var(--fg)) 13%, transparent);--btn-weight: 400;--btn-active-transform: none;--btn-active-shadow: inset 0 0 0 99px color-mix(in srgb, hsl(var(--fg)) 6%, transparent);--btn-accent-hover-bg: color-mix(in srgb, hsl(var(--accent)) 88%, white);--ghost-hover-bg: color-mix(in srgb, hsl(var(--fg)) 8%, transparent);--in-bg: color-mix(in srgb, hsl(var(--fg)) 7%, transparent);--in-border: 1px solid transparent;--in-hover-border: transparent;--in-focus-border: transparent;--in-shadow: none;--in-focus-shadow: 0 0 0 2px hsl(var(--accent) / .85);--card-bg: hsl(var(--surface));--card-border: 0 solid transparent;--card-shadow: 0 0 0 1px color-mix(in srgb, hsl(var(--fg)) 8%, transparent), 0 1px 3px rgb(0 0 0 / .1), 0 1px 2px rgb(0 0 0 / .06);--win-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 12%, transparent);--win-shadow: 0 8px 30px rgb(0 0 0 / .3), 0 2px 8px rgb(0 0 0 / .2);--dialog-anim: bt-pop .18s cubic-bezier(.2, .8, .3, 1);--tb-bg: color-mix(in srgb, hsl(var(--fg)) 5%, hsl(var(--surface)));--tb-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 12%, transparent);--tb-pad: .7rem 1rem;--tb-weight: 700;--tb-size: 1rem;--close-bg: color-mix(in srgb, hsl(var(--fg)) 8%, transparent);--close-r: 9999px;--close-hover-bg: color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--bar-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 12%, transparent);--menu-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 10%, transparent);--pop-shadow: 0 2px 10px rgb(0 0 0 / .25), 0 0 0 1px rgb(0 0 0 / .04);--menu-anim: bt-fade .12s ease-out;--menu-hi-bg: color-mix(in srgb, hsl(var(--fg)) 9%, transparent);--side-bg: color-mix(in srgb, hsl(var(--fg)) 5%, hsl(var(--bg)));--side-shadow: none;--top-bg: color-mix(in srgb, hsl(var(--fg)) 6%, hsl(var(--bg)));--top-shadow: none;--player-bg: color-mix(in srgb, hsl(var(--fg)) 6%, hsl(var(--bg)));--player-shadow: none;--nav-hover-bg: color-mix(in srgb, hsl(var(--fg)) 6%, transparent);--nav-active-bg: color-mix(in srgb, hsl(var(--fg)) 10%, transparent);--nav-active-fg: hsl(var(--fg));--row-hover: color-mix(in srgb, hsl(var(--fg)) 6%, transparent);--row-current: color-mix(in srgb, hsl(var(--fg)) 9%, transparent);--rng-appearance: none;--rng-h: .4rem;--rng-track: color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--rng-tw: 1.15rem;--rng-th: 1.15rem;--rng-thumb: #fff;--rng-ts: 0 1px 3px rgb(0 0 0 / .45), 0 0 0 1px rgb(0 0 0 / .08)}[data-ui=gtk4] .bt-titlebar{position:relative}[data-ui=gtk4] .bt-titlebar .bt-close{position:absolute;right:.6rem;top:50%;transform:translateY(-50%);padding:.3rem}html[data-ui=gtk4] ::selection{background:color-mix(in srgb,hsl(var(--accent)) 40%,transparent)}[data-ui=gtk4] .bt-shell{-webkit-backdrop-filter:none;backdrop-filter:none}[data-ui=gtk4] .bt-top{backdrop-filter:none;-webkit-backdrop-filter:none}[data-ui=gtk4] .bt-nav{font-weight:400;padding-block:.55rem;color:hsl(var(--fg))}[data-ui=gtk4] .bt-nav[aria-current=page]{font-weight:500}[data-ui=gtk4] .bt-brand{font-size:1rem;font-weight:700}[data-ui=gtk4] .btn.btn-accent{font-weight:500}[data-ui=gtk4] h1{font-weight:800;letter-spacing:0}[data-ui=gtk4] .card.overflow-hidden .bt-row+.bt-row,[data-ui=gtk4] .card.overflow-hidden>div+div{border-top:1px solid color-mix(in srgb,hsl(var(--fg)) 8%,transparent)}[data-ui=gtk4] .chip{background:color-mix(in srgb,hsl(var(--fg)) 8%,transparent)}[data-ui=gtk4]{--player-in: bt-slide-in .32s cubic-bezier(.2, .8, .3, 1) both;--player-out: bt-slide-out .22s ease-in both;--player-ms: .22s;--pop-out: bt-fade-out .15s ease-in both;--pop-ms: .15s}[data-ui=gtk4]{--page-in: bt-fade .22s ease-out backwards}[data-ui=breeze]{--wf-close-hover: #da4453}[data-ui=breeze]{--chk-size: 1rem;--chk-r: 4px;--chk-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 40%, transparent);--chk-bg: color-mix(in srgb, hsl(var(--surface)) 94%, hsl(var(--fg)));--chk-on-border: color-mix(in srgb, hsl(var(--accent)) 75%, black);--chk-focus: 0 0 0 2px color-mix(in srgb, hsl(var(--accent)) 40%, transparent);--radius: 5px;--ctl-r: 5px;--card-r: 5px;--win-r: 5px;--menu-r: 5px;--nav-r: 5px;--chip-r: 5px;--font: "Noto Sans", "Open Sans", "Oxygen", system-ui, sans-serif;--dur: .12s;--ease: ease-in-out;--btn-bg: color-mix(in srgb, hsl(var(--surface)) 90%, hsl(var(--bg)));--btn-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 24%, transparent);--btn-weight: 400;--btn-hover-bg: color-mix(in srgb, hsl(var(--surface)) 96%, hsl(var(--accent)));--btn-hover-border: hsl(var(--accent));--btn-hover-shadow: inset 0 0 0 1px hsl(var(--accent) / .55);--btn-active-shadow: inset 0 0 0 1px hsl(var(--accent)), inset 0 1px 3px rgb(0 0 0 / .18);--btn-accent-bg: hsl(var(--accent));--btn-accent-border: 1px solid color-mix(in srgb, hsl(var(--accent)) 70%, black);--btn-accent-hover-bg: color-mix(in srgb, hsl(var(--accent)) 90%, white);--btn-accent-hover-shadow: inset 0 0 0 1px rgb(255 255 255 / .25);--ghost-hover-bg: color-mix(in srgb, hsl(var(--fg)) 8%, transparent);--in-bg: hsl(var(--surface));--in-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 26%, transparent);--in-hover-border: hsl(var(--accent) / .7);--in-focus-border: hsl(var(--accent));--in-focus-shadow: inset 0 0 0 1px hsl(var(--accent));--card-bg: hsl(var(--surface));--card-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 16%, transparent);--win-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 25%, transparent);--win-shadow: 0 6px 20px rgb(0 0 0 / .35), 0 1px 3px rgb(0 0 0 / .2);--dialog-anim: bt-fade .14s ease-in-out;--tb-bg: color-mix(in srgb, hsl(var(--fg)) 8%, hsl(var(--surface)));--tb-fg: hsl(var(--fg));--tb-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--tb-pad: .5rem .9rem;--tb-size: .95rem;--tb-weight: 400;--close-fg: hsl(var(--fg));--close-r: 9999px;--close-hover-bg: #da4453;--close-hover-fg: #fff;--bar-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 16%, transparent);--menu-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 22%, transparent);--pop-shadow: 0 3px 10px rgb(0 0 0 / .3);--menu-anim: bt-drop .11s ease-in-out;--menu-hi-bg: hsl(var(--accent));--menu-hi-fg: hsl(var(--accent-fg));--side-bg: hsl(var(--bg));--top-bg: hsl(var(--bg));--player-bg: hsl(var(--bg));--nav-hover-bg: color-mix(in srgb, hsl(var(--accent)) 16%, transparent);--nav-active-bg: hsl(var(--accent));--nav-active-fg: hsl(var(--accent-fg));--nav-active-shadow: none;--row-hover: color-mix(in srgb, hsl(var(--accent)) 12%, transparent);--row-current: color-mix(in srgb, hsl(var(--accent)) 22%, transparent);--rng-appearance: none;--rng-h: .3rem;--rng-r: 3px;--rng-track: color-mix(in srgb, hsl(var(--fg)) 20%, transparent);--rng-tw: 1.1rem;--rng-th: 1.1rem;--rng-thumb: color-mix(in srgb, hsl(var(--surface)) 94%, hsl(var(--bg)));--rng-tb: 1px solid color-mix(in srgb, hsl(var(--fg)) 38%, transparent);--rng-ts: 0 1px 2px rgb(0 0 0 / .25)}html[data-ui=breeze]{font-size:14px}[data-ui=breeze] .bt-titlebar svg{color:hsl(var(--fg))}[data-ui=breeze] .bt-nav{font-weight:400;color:hsl(var(--fg))}[data-ui=breeze] .bt-nav[aria-current=page] svg{color:inherit}[data-ui=breeze] .bt-shell{backdrop-filter:none;-webkit-backdrop-filter:none}[data-ui=breeze] .bt-brand{font-weight:600}[data-ui=breeze] :is(h1,h2){font-weight:400}[data-ui=breeze] h1{font-size:1.6rem}[data-ui=breeze] .card{box-shadow:none;--card-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 12%, transparent)}[data-ui=breeze] .card .bt-row:nth-child(2n):not(:hover):not(.bt-row-current){background:color-mix(in srgb,hsl(var(--fg)) 3.5%,transparent)}[data-ui=breeze] .card .divide-y>:not([hidden])~:not([hidden]){border-color:color-mix(in srgb,hsl(var(--fg)) 9%,transparent)}[data-ui=breeze] :is(.btn,.input,.bt-nav,.bt-tab,.chip):focus-visible{outline:2px solid hsl(var(--accent));outline-offset:1px}[data-ui=breeze] .bt-nav[aria-current=page]{font-weight:400}[data-ui=breeze]{--player-in: bt-fade .16s ease-in-out both;--player-out: bt-fade-out .14s ease-in-out both;--player-ms: .14s;--pop-out: bt-fade-out .12s ease-in-out both;--pop-ms: .12s}[data-ui=breeze]{--page-in: bt-fade .12s linear backwards}[data-ui=win11] .bt-wf{padding-right:0}[data-ui=win11] .bt-wf-btns{gap:0;align-self:stretch}[data-ui=win11] .bt-wf-btn{--wf-r: 0;width:2.9rem;height:auto;align-self:stretch}[data-ui=win11] .bt-wf-close{--wf-r: 0 .4rem 0 0}[data-ui=win11]{--wf-close-hover: #c42b1c}[data-ui=win11]{--chk-size: 1.1rem;--chk-r: 4px;--chk-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 55%, transparent);--chk-bg: color-mix(in srgb, hsl(var(--fg)) 4%, transparent);--radius: 8px;--ctl-r: 4px;--card-r: 8px;--win-r: 8px;--menu-r: 8px;--nav-r: 4px;--font: "Segoe UI Variable Text", "Segoe UI Variable", "Segoe UI", "Open Sans", system-ui, sans-serif;--dur: 167ms;--ease: cubic-bezier(.1, .9, .2, 1);--btn-bg: color-mix(in srgb, hsl(var(--fg)) 5%, hsl(var(--surface)));--btn-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--btn-hover-bg: color-mix(in srgb, hsl(var(--fg)) 9%, hsl(var(--surface)));--btn-hover-border: color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--btn-active-transform: scale(.97);--btn-accent-border: 1px solid color-mix(in srgb, hsl(var(--accent)) 80%, black);--ghost-hover-bg: color-mix(in srgb, hsl(var(--fg)) 8%, transparent);--in-bg: color-mix(in srgb, hsl(var(--fg)) 5%, hsl(var(--surface)));--in-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--in-hover-border: color-mix(in srgb, hsl(var(--fg)) 24%, transparent);--in-focus-border: color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--in-shadow: inset 0 -1px 0 color-mix(in srgb, hsl(var(--fg)) 45%, transparent);--in-focus-shadow: inset 0 -2px 0 hsl(var(--accent));--card-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 8%, transparent);--card-shadow: 0 2px 6px rgb(0 0 0 / .1);--win-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--win-shadow: 0 8px 32px rgb(0 0 0 / .37);--dialog-anim: bt-pop .25s cubic-bezier(.1, .9, .2, 1);--tb-border: 0 solid transparent;--tb-weight: 600;--tb-size: 1.05rem;--close-hover-bg: #c42b1c;--close-hover-fg: #fff;--close-r: 4px;--bar-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 10%, transparent);--menu-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 10%, transparent);--pop-shadow: 0 8px 20px rgb(0 0 0 / .26);--menu-anim: bt-drop-fluent 167ms cubic-bezier(.1, .9, .2, 1);--menu-hi-bg: color-mix(in srgb, hsl(var(--fg)) 9%, transparent);--nav-hover-bg: color-mix(in srgb, hsl(var(--fg)) 7%, transparent);--nav-active-bg: color-mix(in srgb, hsl(var(--fg)) 9%, transparent);--nav-active-shadow: inset 3px 0 0 hsl(var(--accent));--row-hover: color-mix(in srgb, hsl(var(--fg)) 7%, transparent);--rng-appearance: none;--rng-h: .25rem;--rng-track: color-mix(in srgb, hsl(var(--fg)) 30%, transparent);--rng-tw: 1.25rem;--rng-th: 1.25rem;--rng-thumb: hsl(var(--accent));--rng-tb: 4px solid hsl(var(--surface));--rng-ts: 0 0 0 1px color-mix(in srgb, hsl(var(--fg)) 30%, transparent)}[data-ui=win11]{--player-in: bt-slide-in .32s cubic-bezier(.1, .9, .2, 1) both;--player-out: bt-slide-out .2s cubic-bezier(.7, 0, 1, .5) both;--player-ms: .2s;--pop-out: bt-slide-out .15s cubic-bezier(.7, 0, 1, .5) both;--pop-ms: .15s}[data-ui=win11]{--page-in: bt-page-up .32s cubic-bezier(.1, .9, .2, 1) backwards}[data-ui=win11]{--ctl-r: 4px;--menu-r: 8px;--win-r: 8px;--card-r: 8px;--nav-r: 4px;--btn-active-transform: none;--btn-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 9%, transparent);--btn-shadow: inset 0 -1px 0 color-mix(in srgb, hsl(var(--fg)) 8%, transparent);--btn-accent-border: 1px solid color-mix(in srgb, hsl(var(--accent)) 70%, black);--btn-accent-shadow: inset 0 -1px 0 rgb(0 0 0 / .2);--menu-bg: color-mix(in srgb, hsl(var(--surface)) 82%, transparent);--menu-hi-bg: color-mix(in srgb, hsl(var(--fg)) 8%, transparent);--menu-hi-fg: inherit;--side-bg: color-mix(in srgb, hsl(var(--surface)) 62%, hsl(var(--bg)));--top-bg: color-mix(in srgb, hsl(var(--bg)) 70%, transparent);--nav-active-bg: color-mix(in srgb, hsl(var(--fg)) 7%, transparent);--nav-active-shadow: none;--backdrop: rgb(0 0 0 / .42);--win-shadow: 0 32px 64px rgb(0 0 0 / .37), 0 2px 21px rgb(0 0 0 / .37);--dialog-anim: bt-pop .25s cubic-bezier(.1, .9, .2, 1)}[data-ui=win11] .btn:active:not(.btn-accent):not(.btn-ghost){background:color-mix(in srgb,hsl(var(--fg)) 3%,hsl(var(--surface)));color:hsl(var(--muted))}[data-ui=win11] .btn-accent:active{filter:brightness(.88)}[data-ui=win11] .bt-menu{padding:4px;-webkit-backdrop-filter:blur(30px) saturate(1.25);backdrop-filter:blur(30px) saturate(1.25)}[data-ui=win11] .bt-menu [role=menuitem],[data-ui=win11] .bt-menu [role=option]{border-radius:4px}[data-ui=win11] .bt-side{-webkit-backdrop-filter:blur(40px) saturate(1.2);backdrop-filter:blur(40px) saturate(1.2)}[data-ui=win11] .bt-nav{position:relative;z-index:1}[data-ui=win11] .bt-side .bt-ind{display:block;position:absolute;left:0;top:0;width:3px;height:16px;border-radius:3px;z-index:2;pointer-events:none;background:hsl(var(--accent));opacity:var(--ind-o, 0);will-change:transform;transform:translate3d(calc(var(--ind-x, 0px) + 4px),calc(var(--ind-y, 0px) + (var(--ind-h, 0px) - 16px) / 2),0)}[data-ui=win11] [data-ind-ready]>.bt-ind{transition:transform .25s cubic-bezier(.1,.9,.2,1),opacity .12s linear}[data-ui=win11] .bt-tab[aria-current=page]{border-bottom:3px solid hsl(var(--accent));border-radius:0}@keyframes bt-drop-fluent{0%{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:none}}@keyframes bt-page-up{0%{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}[data-ui=win10] .bt-wf{padding-right:0}[data-ui=win10] .bt-wf-btns{gap:0;align-self:stretch}[data-ui=win10] .bt-wf-btn{--wf-r: 0;width:2.9rem;height:auto;align-self:stretch}[data-ui=win10]{--wf-close-hover: #e81123}[data-ui=win10]{--chk-size: 1.05rem;--chk-r: 0;--chk-border: 2px solid hsl(var(--fg));--chk-bg: transparent;--chk-hover-border: hsl(var(--accent));--radius: 0px;--ctl-r: 0;--card-r: 0;--win-r: 0;--menu-r: 0;--nav-r: 0;--chip-r: 0;--font: "Segoe UI", "Open Sans", system-ui, sans-serif;--dur: .1s;--ease: linear;--btn-bg: color-mix(in srgb, hsl(var(--fg)) 12%, hsl(var(--surface)));--btn-border: 2px solid transparent;--btn-hover-bg: color-mix(in srgb, hsl(var(--fg)) 16%, hsl(var(--surface)));--btn-hover-border: color-mix(in srgb, hsl(var(--fg)) 40%, transparent);--btn-accent-border: 2px solid transparent;--btn-accent-border-color: transparent;--ghost-hover-bg: color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--in-bg: hsl(var(--surface));--in-border: 2px solid color-mix(in srgb, hsl(var(--fg)) 35%, transparent);--in-hover-border: color-mix(in srgb, hsl(var(--fg)) 60%, transparent);--in-focus-border: hsl(var(--accent));--card-border: 2px solid color-mix(in srgb, hsl(var(--fg)) 12%, transparent);--win-border: 1px solid hsl(var(--accent));--win-shadow: 0 8px 24px rgb(0 0 0 / .4);--dialog-anim: bt-pop .18s cubic-bezier(.1, .9, .2, 1);--tb-border: 0 solid transparent;--tb-weight: 400;--tb-size: 1.3rem;--close-r: 0;--close-hover-bg: #e81123;--close-hover-fg: #fff;--menu-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 25%, transparent);--pop-shadow: 0 4px 10px rgb(0 0 0 / .4);--menu-anim: bt-reveal .15s cubic-bezier(.1, .9, .2, 1);--menu-hi-bg: color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--nav-hover-bg: color-mix(in srgb, hsl(var(--fg)) 10%, transparent);--nav-active-bg: color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--nav-active-shadow: inset 4px 0 0 hsl(var(--accent));--row-hover: color-mix(in srgb, hsl(var(--fg)) 10%, transparent);--rng-appearance: none;--rng-h: .25rem;--rng-r: 0;--rng-track: color-mix(in srgb, hsl(var(--fg)) 30%, transparent);--rng-tw: .5rem;--rng-th: 1.5rem;--rng-tr: 0;--rng-thumb: hsl(var(--accent))}[data-ui=win10]{--player-in: bt-fade .14s linear both;--player-out: bt-fade-out .11s linear both;--player-ms: .11s;--pop-out: bt-fade-out 90ms linear both;--pop-ms: 90ms}[data-ui=win10]{--page-in: bt-fade .12s linear backwards}[data-ui=win7] .bt-wf-btns{gap:0;align-self:flex-start;margin-right:.15rem}[data-ui=win7] .bt-wf-btn{--wf-r: 0 0 4px 4px;--wf-border: 1px solid rgb(0 0 0 / .5);--wf-bg: linear-gradient(to bottom, rgb(255 255 255 / .55) 0, rgb(255 255 255 / .2) 49.9%, rgb(0 0 0 / .08) 50%, rgb(255 255 255 / .3) 100%);--wf-hover: linear-gradient(to bottom, rgb(190 225 255 / .9) 0, rgb(120 190 255 / .55) 49.9%, rgb(40 130 230 / .6) 50%, rgb(130 210 255 / .75) 100%);--wf-shadow: inset 0 0 0 1px rgb(255 255 255 / .5);--wf-shadow-hover: inset 0 0 0 1px rgb(255 255 255 / .6), 0 0 6px rgb(120 200 255 / .8);width:1.7rem;height:1.2rem;color:#fff;border-top:0;margin-left:-1px}[data-ui=win7] .bt-wf-close{width:2.9rem;--wf-bg: linear-gradient(to bottom, #ecb7ab 0, #e08b7b 49.9%, #c8412a 50%, #de6e42 100%)}[data-ui=win7] .bt-wf-close:is(:hover,:focus-visible){background:linear-gradient(to bottom,#f6cdc3 0,#ef9f8e 49.9%,#de3a1c 50%,#f77f45);box-shadow:inset 0 0 0 1px #fff9,0 0 6px #ff785ae6}[data-ui=win7]{--w7-w: #fff;--w7-paper: color-mix(in srgb, hsl(var(--surface)) 50%, #fff);--w7-glow: color-mix(in srgb, hsl(var(--accent)) 42%, #3db7f2);--w7-edge: color-mix(in srgb, hsl(var(--fg)) 50%, #a0a0a0);--w7-sel-edge: color-mix(in srgb, hsl(var(--accent)) 50%, var(--w7-w));--w7-sel: linear-gradient(to bottom, color-mix(in srgb, hsl(var(--accent)) 10%, var(--w7-w)), color-mix(in srgb, hsl(var(--accent)) 24%, var(--w7-w)));--w7-hov: linear-gradient(to bottom, color-mix(in srgb, hsl(var(--accent)) 5%, var(--w7-w)), color-mix(in srgb, hsl(var(--accent)) 13%, var(--w7-w)));--w7-glass: linear-gradient(to bottom, color-mix(in srgb, var(--w7-glow) 22%, var(--w7-w)) 0, color-mix(in srgb, var(--w7-glow) 34%, var(--w7-w)) 49.9%, color-mix(in srgb, hsl(var(--accent)) 26%, var(--w7-w)) 50%, color-mix(in srgb, var(--w7-glow) 32%, var(--w7-w)) 100%);--chk-size: .95rem;--chk-r: 3px;--chk-border: 1px solid var(--w7-edge);--chk-bg: linear-gradient(135deg, color-mix(in srgb, hsl(var(--raised)) 85%, #000), var(--w7-w) 60%);--chk-shadow: inset 0 0 0 1px rgb(255 255 255 / .9);--chk-hover-border: hsl(var(--accent));--chk-on-bg: var(--chk-bg);--chk-on-border: var(--w7-edge);--chk-on-fg: #2a6a2f;--chk-radio-on-bg: var(--chk-bg);--chk-dot: color-mix(in srgb, hsl(var(--accent)) 80%, #1b7fd0);--chk-focus: 0 0 0 2px color-mix(in srgb, var(--w7-glow) 70%, transparent);--radius: 4px;--ctl-r: 3px;--card-r: 4px;--win-r: 7px 7px 3px 3px;--menu-r: 3px;--nav-r: 3px;--chip-r: 3px;--font: "Segoe UI", "Selawik", "Open Sans", system-ui, sans-serif;--dur: .2s;--ease: ease-out;--gel: linear-gradient(to bottom, color-mix(in srgb, hsl(var(--raised)) 38%, var(--w7-w)) 0, color-mix(in srgb, hsl(var(--raised)) 66%, var(--w7-w)) 49.9%, color-mix(in srgb, hsl(var(--raised)) 90%, #000) 50%, color-mix(in srgb, hsl(var(--raised)) 78%, #000) 100%);--gel-hot: linear-gradient(to bottom, color-mix(in srgb, var(--w7-glow) 14%, var(--w7-w)) 0, color-mix(in srgb, var(--w7-glow) 24%, var(--w7-w)) 49.9%, color-mix(in srgb, var(--w7-glow) 44%, var(--w7-w)) 50%, color-mix(in srgb, var(--w7-glow) 62%, var(--w7-w)) 100%);--gel-down: linear-gradient(to bottom, color-mix(in srgb, var(--w7-glow) 28%, var(--w7-w)) 0, color-mix(in srgb, var(--w7-glow) 40%, var(--w7-w)) 49.9%, color-mix(in srgb, var(--w7-glow) 62%, var(--w7-w)) 50%, color-mix(in srgb, var(--w7-glow) 80%, var(--w7-w)) 100%);--btn-bg: var(--gel);--btn-border: 1px solid var(--w7-edge);--btn-shadow: inset 0 0 0 1px rgb(255 255 255 / .7);--btn-hover-bg: var(--gel-hot);--btn-hover-border: color-mix(in srgb, hsl(var(--accent)) 85%, #3c7fb1);--btn-hover-shadow: inset 0 0 0 1px rgb(255 255 255 / .75), 0 0 3px color-mix(in srgb, var(--w7-glow) 55%, transparent);--btn-active-shadow: inset 0 1px 3px rgb(0 0 0 / .35), inset 0 0 0 1px color-mix(in srgb, var(--w7-glow) 50%, transparent);--btn-accent-bg: linear-gradient(to bottom, color-mix(in srgb, var(--w7-glow) 40%, var(--w7-w)) 0, color-mix(in srgb, hsl(var(--accent)) 62%, var(--w7-w)) 49.9%, hsl(var(--accent)) 50%, color-mix(in srgb, hsl(var(--accent)) 60%, var(--w7-glow)) 100%);--btn-accent-border: 1px solid color-mix(in srgb, hsl(var(--accent)) 70%, #000);--btn-accent-border-color: color-mix(in srgb, hsl(var(--accent)) 70%, #000);--btn-accent-shadow: inset 0 0 0 1px rgb(255 255 255 / .5), inset 0 -7px 8px -5px color-mix(in srgb, var(--w7-glow) 90%, transparent), 0 1px 2px rgb(0 0 0 / .25);--btn-accent-text-shadow: 0 -1px 0 rgb(0 0 0 / .45);--btn-accent-hover-bg: linear-gradient(to bottom, color-mix(in srgb, var(--w7-glow) 55%, var(--w7-w)) 0, color-mix(in srgb, hsl(var(--accent)) 52%, var(--w7-w)) 49.9%, color-mix(in srgb, hsl(var(--accent)) 90%, var(--w7-glow)) 50%, color-mix(in srgb, var(--w7-glow) 85%, var(--w7-w)) 100%);--btn-accent-hover-shadow: inset 0 0 0 1px rgb(255 255 255 / .7), 0 0 7px var(--w7-glow);--ghost-hover-bg: var(--w7-hov);--in-bg: color-mix(in srgb, hsl(var(--surface)) 40%, var(--w7-w));--in-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 30%, #b4bfcf);--in-shadow: inset 0 1px 1px rgb(0 0 0 / .1);--in-hover-border: color-mix(in srgb, var(--w7-glow) 80%, #4a86b6);--in-focus-border: color-mix(in srgb, hsl(var(--accent)) 85%, #3d7bad);--in-focus-shadow: inset 0 1px 1px rgb(0 0 0 / .1), 0 0 4px color-mix(in srgb, var(--w7-glow) 70%, transparent);--card-bg: hsl(var(--surface));--card-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 22%, #a9bad2);--card-shadow: inset 0 0 0 1px rgb(255 255 255 / .75), 0 1px 2px rgb(0 0 0 / .1);--backdrop: rgb(10 26 52 / .32);--win-bg: color-mix(in srgb, color-mix(in srgb, hsl(var(--accent)) 30%, #b9d3f0) 74%, transparent);--win-border: 1px solid rgb(0 0 0 / .62);--win-shadow: inset 0 0 0 1px rgb(255 255 255 / .7), 0 6px 22px rgb(0 0 0 / .5), 0 0 1px rgb(255 255 255 / .4);--dialog-anim: bt-pop .2s ease-out;--tb-border: 0 solid transparent;--tb-pad: 6px 6px 8px 16px;--tb-size: .92rem;--tb-weight: 400;--tb-justify: space-between;--tb-text-shadow: 0 0 12px #fff, 0 0 5px #fff, 0 0 2px #fff;--body-bg: hsl(var(--surface));--close-fg: #fff;--close-border: 1px solid rgb(0 0 0 / .6);--close-r: 0 0 5px 5px;--close-bg: linear-gradient(to bottom, #ecb7ab 0, #e08b7b 49.9%, #c8412a 50%, #de6e42 100%);--close-hover-bg: linear-gradient(to bottom, #f6cdc3 0, #ef9f8e 49.9%, #de3a1c 50%, #f77f45 100%);--close-hover-fg: #fff;--close-shadow: inset 0 0 0 1px rgb(255 255 255 / .5), 0 0 3px rgb(0 0 0 / .3);--bar-border: 1px solid color-mix(in srgb, hsl(var(--accent)) 22%, #98acc6);--menu-bg: color-mix(in srgb, hsl(var(--surface)) 55%, var(--w7-w));--menu-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 40%, #8a8a8a);--pop-shadow: 2px 3px 4px rgb(0 0 0 / .38), inset 0 0 0 1px rgb(255 255 255 / .85);--menu-anim: bt-fade .14s ease-out;--menu-hi-bg: var(--w7-sel);--menu-hi-fg: inherit;--top-bg: var(--w7-glass);--top-shadow: inset 0 1px 0 rgb(255 255 255 / .75), inset 0 -1px 0 rgb(255 255 255 / .35), 0 2px 5px rgb(0 0 0 / .18);--side-bg: linear-gradient(to bottom, color-mix(in srgb, hsl(var(--surface)) 40%, var(--w7-w)), color-mix(in srgb, hsl(var(--accent)) 8%, hsl(var(--surface))));--side-shadow: inset -1px 0 0 rgb(255 255 255 / .8);--player-bg: linear-gradient(to bottom, rgb(255 255 255 / .3) 0, rgb(255 255 255 / .08) 49.9%, rgb(0 0 0 / .22) 50%, rgb(0 0 0 / 0) 100%), color-mix(in srgb, #1a2b49 86%, hsl(var(--accent)));--player-shadow: inset 0 1px 0 rgb(255 255 255 / .55), 0 -2px 8px rgb(0 0 0 / .3);--nav-hover-bg: var(--w7-hov);--nav-active-bg: var(--w7-sel);--nav-active-shadow: inset 0 0 0 1px var(--w7-sel-edge), inset 0 0 0 2px rgb(255 255 255 / .55);--row-hover: var(--w7-hov);--row-current: var(--w7-sel);--panel-tb-bg: linear-gradient(to bottom, var(--w7-w), color-mix(in srgb, hsl(var(--accent)) 12%, var(--w7-w)));--panel-tb-fg: color-mix(in srgb, hsl(var(--accent)) 70%, #0b2547);--panel-tb-margin: -1.25rem -1.25rem .5rem;--panel-tb-pad: .45rem 1.25rem;--rng-appearance: none;--rng-h: .375rem;--rng-r: 3px;--rng-border: 1px solid var(--w7-edge);--rng-shadow: inset 0 1px 2px rgb(0 0 0 / .3);--rng-track: color-mix(in srgb, hsl(var(--fg)) 12%, hsl(var(--surface)));--rng-fill: var(--w7-glow);--rng-tw: .8rem;--rng-th: 1.25rem;--rng-tr: 3px;--rng-tb: 1px solid var(--w7-edge);--rng-thumb: var(--gel)}[data-ui=win7][data-mode=dark]{--w7-w: color-mix(in srgb, #fff 20%, hsl(var(--surface)));--w7-paper: hsl(var(--surface));--w7-edge: color-mix(in srgb, hsl(var(--fg)) 40%, hsl(var(--surface)));--win-bg: color-mix(in srgb, color-mix(in srgb, hsl(var(--accent)) 35%, #1c2d48) 78%, transparent);--tb-text-shadow: 0 0 10px rgb(0 0 0 / .9), 0 0 3px rgb(0 0 0 / .9);--menu-bg: hsl(var(--surface));--in-bg: hsl(var(--raised));--btn-shadow: inset 0 0 0 1px rgb(255 255 255 / .12)}[data-ui=win7] .bt-window{padding:0 8px 8px;-webkit-backdrop-filter:blur(9px) saturate(1.5);backdrop-filter:blur(9px) saturate(1.5);background-image:linear-gradient(to bottom,#fff6,#fff0 42px),linear-gradient(113deg,rgb(255 255 255 / .42) 0 22%,transparent 22.2% 50%,rgb(255 255 255 / .2) 50.2% 58%,transparent 58.2%)}[data-ui=win7][data-mode=dark] .bt-window{background-image:linear-gradient(to bottom,rgb(255 255 255 / .18),transparent 42px),linear-gradient(113deg,rgb(255 255 255 / .12) 0 22%,transparent 22.2% 50%,rgb(255 255 255 / .06) 50.2% 58%,transparent 58.2%)}[data-ui=win7] .bt-titlebar{margin:0 -8px}[data-ui=win7] .bt-body{border:1px solid rgb(0 0 0 / .5);box-shadow:0 0 0 1px #ffffff80}[data-ui=win7] .bt-footer{background:linear-gradient(to bottom,color-mix(in srgb,hsl(var(--surface)) 70%,var(--w7-w)),hsl(var(--surface)));border:1px solid rgb(0 0 0 / .5);border-top:1px solid color-mix(in srgb,hsl(var(--fg)) 14%,hsl(var(--surface)));box-shadow:inset 0 1px #fffc}[data-ui=win7] .bt-close{width:47px;height:19px;padding:0;align-self:flex-start;margin:-6px -2px 0 0;border-top-width:0}[data-ui=win7] .bt-close svg{width:13px;height:13px;stroke-width:3;filter:drop-shadow(0 0 2px rgb(0 0 0 / .65))}[data-ui=win7] .bt-close:active{filter:brightness(.86)}html[data-ui=win7]:not([data-wallpaper=on]) main{background:var(--w7-paper)}[data-ui=win7] .bt-top{border-bottom-color:color-mix(in srgb,hsl(var(--accent)) 35%,#7f9bc0)}[data-ui=win7] .bt-side{border-right-color:color-mix(in srgb,hsl(var(--accent)) 28%,#a2b6d0)}[data-ui=win7] .bt-nav:hover:not([aria-current=page]){box-shadow:inset 0 0 0 1px color-mix(in srgb,hsl(var(--accent)) 28%,var(--w7-w)),inset 0 0 0 2px #ffffff80}[data-ui=win7] .bt-nav[aria-current=page]{color:hsl(var(--fg))}[data-ui=win7] .bt-row:hover{box-shadow:inset 0 0 0 1px color-mix(in srgb,hsl(var(--accent)) 26%,var(--w7-w))}[data-ui=win7] .bt-row-current{box-shadow:inset 0 0 0 1px var(--w7-sel-edge),inset 0 0 0 2px #ffffff80}[data-ui=win7] :is([role=menuitem],[role=option]):is(:hover,:focus-visible,.bt-select-hi){box-shadow:inset 0 0 0 1px var(--w7-sel-edge),inset 0 0 0 2px #ffffff8c}[data-ui=win7] :is([role=menuitem],[role=option]){border-radius:3px}[data-ui=win7] .btn:focus-visible{outline:1px dotted color-mix(in srgb,hsl(var(--fg)) 80%,transparent);outline-offset:-4px}[data-ui=win7] .btn:active:not(:disabled):not(.btn-accent):not(.btn-ghost){background:var(--gel-down);border-color:color-mix(in srgb,hsl(var(--accent)) 70%,#2c628b)}[data-ui=win7] .bt-panel-title{border-bottom:1px solid color-mix(in srgb,hsl(var(--accent)) 22%,#c4d1e4);font-weight:600}[data-ui=win7] [role=toolbar]{background:linear-gradient(to bottom,var(--w7-w) 0,color-mix(in srgb,hsl(var(--accent)) 5%,var(--w7-w)) 49.9%,color-mix(in srgb,hsl(var(--accent)) 10%,var(--w7-w)) 50%,color-mix(in srgb,hsl(var(--accent)) 6%,var(--w7-w)) 100%);border-bottom-color:color-mix(in srgb,hsl(var(--accent)) 25%,#bccbe0)}[data-ui=win7] :is(.bt-player,.bt-tabbar){--fg: 0 0% 100%;--muted: 212 32% 80%;color:#fff;-webkit-backdrop-filter:blur(8px) saturate(1.4);backdrop-filter:blur(8px) saturate(1.4)}[data-ui=win7] .bt-player .btn:not(.btn-accent):not(.btn-ghost){background:linear-gradient(to bottom,#ffffff47 0,#ffffff1a 49.9%,#0003 50%,#ffffff14);border-color:#ffffff73;color:#fff;box-shadow:inset 0 0 0 1px #ffffff2e}[data-ui=win7] .bt-player .btn:not(.btn-accent):not(.btn-ghost):hover{background:linear-gradient(to bottom,#96d7ff8c 0,#64beff47 49.9%,#1e78d280 50%,#6ecdff8c);border-color:#beebffd9;box-shadow:inset 0 0 0 1px #fff6,0 0 8px #6ecdff8c}[data-ui=win7] .bt-player .btn-ghost:hover{background:linear-gradient(to bottom,#ffffff47,#ffffff14);box-shadow:inset 0 0 0 1px #ffffff59}[data-ui=win7] .bt-tab[aria-current=page]{color:#fff;text-shadow:0 0 6px var(--w7-glow)}[data-ui=win7] *{scrollbar-width:auto;scrollbar-color:auto}[data-ui=win7] ::-webkit-scrollbar{width:15px;height:15px}[data-ui=win7] ::-webkit-scrollbar-button{display:none}[data-ui=win7] ::-webkit-scrollbar-corner{background:color-mix(in srgb,hsl(var(--surface)) 80%,var(--w7-w))}[data-ui=win7] ::-webkit-scrollbar-track{background:linear-gradient(to right,color-mix(in srgb,hsl(var(--fg)) 8%,hsl(var(--surface))),color-mix(in srgb,hsl(var(--surface)) 50%,var(--w7-w)) 60%,color-mix(in srgb,hsl(var(--fg)) 4%,hsl(var(--surface))));border-left:1px solid color-mix(in srgb,hsl(var(--fg)) 14%,hsl(var(--surface)))}[data-ui=win7] ::-webkit-scrollbar-track:horizontal{background:linear-gradient(to bottom,color-mix(in srgb,hsl(var(--fg)) 8%,hsl(var(--surface))),color-mix(in srgb,hsl(var(--surface)) 50%,var(--w7-w)) 60%,color-mix(in srgb,hsl(var(--fg)) 4%,hsl(var(--surface))));border-left:0;border-top:1px solid color-mix(in srgb,hsl(var(--fg)) 14%,hsl(var(--surface)))}[data-ui=win7] ::-webkit-scrollbar-thumb{background:linear-gradient(to right,color-mix(in srgb,hsl(var(--raised)) 40%,var(--w7-w)),color-mix(in srgb,hsl(var(--raised)) 80%,var(--w7-w)) 48%,color-mix(in srgb,hsl(var(--raised)) 92%,#000) 52%,color-mix(in srgb,hsl(var(--raised)) 80%,#000));border:1px solid var(--w7-edge);border-radius:3px;box-shadow:inset 0 0 0 1px #fff9;min-height:36px;min-width:36px}[data-ui=win7] ::-webkit-scrollbar-thumb:hover{background:linear-gradient(to right,color-mix(in srgb,var(--w7-glow) 16%,var(--w7-w)),color-mix(in srgb,var(--w7-glow) 28%,var(--w7-w)) 48%,color-mix(in srgb,var(--w7-glow) 50%,var(--w7-w)) 52%,color-mix(in srgb,var(--w7-glow) 66%,var(--w7-w)));border-color:color-mix(in srgb,hsl(var(--accent)) 85%,#3c7fb1)}[data-ui=win7]{--player-in: bt-fade .3s ease-out both;--player-out: bt-fade-out .24s ease-in both;--player-ms: .24s;--pop-out: bt-fade-out .2s ease-in both;--pop-ms: .2s}[data-ui=win7]{--page-in: bt-fade .12s linear backwards}[data-ui=winxp] .bt-wf-btn{--wf-r: 3px;--wf-border: 1px solid #fff;--wf-bg: linear-gradient(135deg, rgb(255 255 255 / .4), rgb(255 255 255 / .12));--wf-hover: linear-gradient(135deg, rgb(255 255 255 / .85), rgb(255 255 255 / .5));--wf-shadow-hover: 0 0 4px rgb(255 255 255 / .9);width:1.35rem;height:1.35rem;color:#fff}[data-ui=winxp] .bt-wf-close{--wf-bg: linear-gradient(135deg, #e8a08a, #d4452a 55%, #b3290f)}[data-ui=winxp] .bt-wf-close:is(:hover,:focus-visible){background:linear-gradient(135deg,#f0b09a,#e4553a 55%,#c3392f)}[data-ui=winxp]{--chk-size: .95rem;--chk-r: 0;--chk-border: 1px solid #1c5180;--chk-bg: linear-gradient(135deg, #dcdcd7, #fff 60%);--chk-hover-border: #f5a623;--chk-on-bg: linear-gradient(135deg, #dcdcd7, #fff 60%);--chk-on-border: #1c5180;--chk-on-fg: #21a121;--chk-radio-on-bg: linear-gradient(135deg, #dcdcd7, #fff 60%);--chk-dot: #21a121;--chk-focus: 0 0 0 1px #f5a623;--radius: 4px;--ctl-r: 3px;--card-r: 4px;--win-r: 8px 8px 0 0;--menu-r: 0;--nav-r: 0;--chip-r: 3px;--xp-frame: color-mix(in srgb, hsl(var(--accent)) 75%, black);--font: Tahoma, "DejaVu Sans", Verdana, system-ui, sans-serif;--title-font: "Trebuchet MS", Tahoma, "DejaVu Sans", sans-serif;--dur: 0ms;--luna: linear-gradient(to bottom, color-mix(in srgb, hsl(var(--surface)) 70%, white) 0%, hsl(var(--surface)) 70%, color-mix(in srgb, hsl(var(--surface)) 85%, black) 100%);--luna-bar: linear-gradient(to bottom, color-mix(in srgb, hsl(var(--accent)) 55%, white) 0%, hsl(var(--accent)) 12%, hsl(var(--accent)) 80%, color-mix(in srgb, hsl(var(--accent)) 75%, black) 100%);--btn-bg: var(--luna);--btn-border: 1px solid var(--xp-frame);--btn-hover-bg: var(--luna);--btn-hover-border: var(--xp-frame);--btn-hover-shadow: inset 0 0 0 2px #f8b330;--btn-active-shadow: inset 1px 1px 3px rgb(0 0 0 / .5);--btn-accent-bg: linear-gradient(to bottom, color-mix(in srgb, hsl(var(--accent)) 60%, white) 0%, hsl(var(--accent)) 20%, hsl(var(--accent)) 75%, color-mix(in srgb, hsl(var(--accent)) 80%, black) 100%);--btn-accent-border: 1px solid var(--xp-frame);--btn-accent-border-color: var(--xp-frame);--btn-accent-hover-shadow: inset 0 0 0 2px #f8b330;--ghost-hover-bg: color-mix(in srgb, hsl(var(--accent)) 25%, transparent);--in-bg: hsl(var(--surface));--in-border: 1px solid color-mix(in srgb, hsl(var(--accent)) 45%, gray);--in-hover-border: var(--xp-frame);--in-focus-border: var(--xp-frame);--card-border: 2px solid var(--xp-frame);--card-shadow: 2px 3px 5px rgb(0 0 0 / .3);--win-bg: hsl(var(--bg));--win-border: 3px solid var(--xp-frame);--win-shadow: 3px 4px 8px rgb(0 0 0 / .5);--dialog-anim: bt-none 1ms;--backdrop: rgb(0 0 0 / .3);--tb-bg: var(--luna-bar);--tb-fg: hsl(var(--accent-fg));--tb-border: 1px solid var(--xp-frame);--tb-pad: .35rem .6rem;--tb-size: .95rem;--tb-weight: 700;--tb-text-shadow: 1px 1px 0 rgb(0 0 0 / .4);--body-bg: hsl(var(--bg));--close-fg: #fff;--close-bg: linear-gradient(135deg, #e8a08a, #d4452a 55%, #b3290f);--close-border: 1px solid #fff;--close-r: .2rem;--close-hover-bg: linear-gradient(135deg, #f0b09a, #e4553a 55%, #c3392f);--close-hover-fg: #fff;--bar-border: 1px solid var(--xp-frame);--menu-bg: hsl(var(--surface));--menu-border: 1px solid #000;--pop-shadow: 2px 2px 3px rgb(0 0 0 / .5);--menu-anim: bt-fade .12s linear;--menu-hi-bg: hsl(var(--accent));--menu-hi-fg: hsl(var(--accent-fg));--top-bg: linear-gradient(to bottom, color-mix(in srgb, hsl(var(--accent)) 30%, hsl(var(--bg))), color-mix(in srgb, hsl(var(--accent)) 10%, hsl(var(--bg))));--nav-hover-bg: color-mix(in srgb, hsl(var(--accent)) 22%, transparent);--nav-active-bg: hsl(var(--accent));--nav-active-fg: hsl(var(--accent-fg));--row-hover: hsl(var(--accent));--row-hover-fg: hsl(var(--accent-fg));--panel-tb-bg: var(--luna-bar);--panel-tb-fg: hsl(var(--accent-fg));--panel-tb-margin: -1.25rem -1.25rem .25rem;--panel-tb-pad: .4rem 1rem;--rng-appearance: none;--rng-h: .3rem;--rng-r: 0;--rng-border: 1px solid var(--xp-frame);--rng-shadow: inset 1px 1px 2px rgb(0 0 0 / .3);--rng-track: hsl(var(--surface));--rng-tw: .75rem;--rng-th: 1.3rem;--rng-tr: 0 0 .4rem .4rem;--rng-tb: 1px solid var(--xp-frame);--rng-thumb: linear-gradient(to right, white, color-mix(in srgb, hsl(var(--raised)) 80%, white))}html[data-ui=winxp]{font-size:14.5px}[data-ui=winxp] *,[data-ui=winxp] :before,[data-ui=winxp] :after{transition-duration:0s!important}[data-ui=winxp] .bt-row:hover *{color:hsl(var(--accent-fg))}[data-ui=winxp] .bt-panel{overflow:hidden;border:3px solid var(--xp-frame);border-radius:.5rem .5rem .2rem .2rem}[data-ui=winxp] .bt-titlebar svg{color:#fff}[data-ui=winxp]{--side-bg: linear-gradient(to bottom, color-mix(in srgb, hsl(var(--accent)) 62%, white), color-mix(in srgb, hsl(var(--accent)) 80%, #5a6fd0));--side-shadow: none;--nav-hover-bg: color-mix(in srgb, hsl(var(--accent)) 12%, white);--nav-active-bg: #fff;--nav-active-fg: color-mix(in srgb, hsl(var(--accent)) 70%, black)}[data-ui=winxp] .bt-side{padding:.75rem .6rem;gap:0;border-right:1px solid var(--xp-frame)}[data-ui=winxp] .bt-side .bt-nav{border-radius:0;padding:.3rem .7rem;background:#d6dff7;color:color-mix(in srgb,hsl(var(--accent)) 75%,black);font-weight:400}[data-ui=winxp] .bt-side .bt-nav:first-of-type{border-radius:.4rem .4rem 0 0}[data-ui=winxp] .bt-side .bt-nav:last-of-type{border-radius:0 0 .3rem .3rem}[data-ui=winxp] .bt-side .bt-nav:hover{background:#d6dff7;color:color-mix(in srgb,hsl(var(--accent)) 70%,white);text-decoration:underline}[data-ui=winxp] .bt-side .bt-nav[aria-current=page]{background:#fff;color:color-mix(in srgb,hsl(var(--accent)) 70%,black);font-weight:700}[data-ui=winxp] .bt-titlebar h2{font-style:italic}[data-ui=winxp] ::selection{background:hsl(var(--accent));color:hsl(var(--accent-fg))}[data-ui=winxp]{--vote-ms: 0ms;--player-in: none;--player-out: none;--player-ms: 0ms;--pop-out: none;--pop-ms: 0ms}[data-ui=winxp]{--page-in: none}[data-ui=winxp] .bt-side>div:last-child{color:#fff}[data-ui=win98] .bt-wf-btn{--wf-r: 0;--wf-bg: #c0c0c0;--wf-hover: #c0c0c0;--wf-active: #c0c0c0;--wf-shadow: inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px #808080, inset 2px 2px #dfdfdf;width:1.15rem;height:1rem;color:#000}[data-ui=win98] .bt-wf-btn:active{box-shadow:inset 1px 1px #0a0a0a,inset -1px -1px #fff,inset 2px 2px gray,inset -2px -2px #dfdfdf}[data-ui=win98] .bt-wf-close:is(:hover,:focus-visible){background:silver;color:#000}[data-ui=win98]{--chk-size: .95rem;--chk-r: 0;--chk-border: 0 solid transparent;--chk-bg: #fff;--chk-shadow: inset -1px -1px #fff, inset 1px 1px #808080, inset -2px -2px #dfdfdf, inset 2px 2px #000;--chk-hover-border: transparent;--chk-on-bg: #fff;--chk-on-border: transparent;--chk-on-fg: #000;--chk-radio-on-bg: #fff;--chk-dot: #000;--chk-focus: inset -1px -1px #fff, inset 1px 1px #808080, inset -2px -2px #dfdfdf, inset 2px 2px #000, 0 0 0 1px #000;--radius: 0px;--ctl-r: 0;--card-r: 0;--win-r: 0;--menu-r: 0;--nav-r: 0;--chip-r: 0;--font: "MS Sans Serif", "Microsoft Sans Serif", Tahoma, "DejaVu Sans", Verdana, sans-serif;--title-font: var(--font);--b98-raised: inset -1px -1px #0a0a0a, inset 1px 1px #ffffff, inset -2px -2px #808080, inset 2px 2px #dfdfdf;--b98-sunken: inset -1px -1px #ffffff, inset 1px 1px #808080, inset -2px -2px #dfdfdf, inset 2px 2px #0a0a0a;--b98-title: linear-gradient(90deg, hsl(var(--accent)), #1084d0);--dur: 0ms;--dialog-anim: bt-none 1ms;--menu-anim: none;--btn-bg: hsl(var(--surface));--btn-fg: #000;--btn-border: 0 solid transparent;--btn-shadow: var(--b98-raised);--btn-weight: 400;--btn-hover-bg: hsl(var(--surface));--btn-active-shadow: var(--b98-sunken);--btn-accent-bg: hsl(var(--surface));--btn-accent-fg: #000;--btn-accent-shadow: var(--b98-raised);--btn-accent-hover-bg: hsl(var(--surface));--btn-accent-hover-shadow: var(--b98-raised);--ghost-hover-bg: transparent;--in-bg: #fff;--in-border: 0 solid transparent;--in-shadow: var(--b98-sunken);--in-focus-shadow: var(--b98-sunken);--card-bg: hsl(var(--surface));--card-border: 0 solid transparent;--card-shadow: var(--b98-raised);--backdrop: rgb(0 0 0 / .25);--win-bg: hsl(var(--surface));--win-border: 0 solid transparent;--win-shadow: var(--b98-raised), 3px 3px 0 rgb(0 0 0 / .45);--tb-bg: var(--b98-title);--tb-fg: #fff;--tb-border: 0 solid transparent;--tb-pad: .2rem .35rem;--tb-size: .9rem;--tb-weight: 700;--close-fg: #000;--close-bg: hsl(var(--surface));--close-shadow: var(--b98-raised);--close-hover-bg: hsl(var(--surface));--close-hover-fg: #000;--close-r: 0;--bar-border: 0 solid transparent;--menu-bg: hsl(var(--surface));--menu-border: 0 solid transparent;--pop-shadow: var(--b98-raised), 2px 2px 0 rgb(0 0 0 / .4);--menu-hi-bg: hsl(var(--accent));--menu-hi-fg: #fff;--side-shadow: var(--b98-raised);--top-bg: hsl(var(--surface));--top-shadow: var(--b98-raised);--player-shadow: var(--b98-raised);--nav-hover-bg: transparent;--nav-active-bg: hsl(var(--accent));--nav-active-fg: #fff;--row-hover: hsl(var(--accent));--row-hover-fg: #fff;--row-current: color-mix(in srgb, hsl(var(--accent)) 25%, transparent);--panel-tb-bg: var(--b98-title);--panel-tb-fg: #fff;--panel-tb-margin: -1.25rem -1.25rem .25rem;--panel-tb-pad: .2rem .5rem;--rng-appearance: none;--rng-h: .3rem;--rng-r: 0;--rng-shadow: var(--b98-sunken);--rng-track: #fff;--rng-fill: hsl(var(--accent));--rng-tw: .7rem;--rng-th: 1.3rem;--rng-tr: 0;--rng-thumb: hsl(var(--surface));--rng-ts: var(--b98-raised)}html[data-ui=win98]{font-size:14px}[data-ui=win98] *,[data-ui=win98] :before,[data-ui=win98] :after{transition-duration:0s!important;border-radius:0!important}[data-ui=win98] .bt-row:hover *{color:#fff}[data-ui=win98] .card:not([class*=" p-"]):not([class*=" px-"]):not([class*=" py-"]):not(.bt-panel){padding:2px}[data-ui=win98] .bt-titlebar svg{display:none}[data-ui=win98] .bt-close{padding:0 .2rem}[data-ui=win98] .bt-window{padding:2px}[data-ui=win98] ::selection{background:hsl(var(--accent));color:#fff}[data-ui=win98]{--vote-ms: 0ms;--player-in: none;--player-out: none;--player-ms: 0ms;--pop-out: none;--pop-ms: 0ms}[data-ui=win98] .bt-sel[data-selected]{outline:1px dotted #000;outline-offset:-4px;background-image:linear-gradient(hsl(var(--accent) / .18),hsl(var(--accent) / .18))}[data-ui=win98]{--page-in: none}[data-ui=macos]{--wf-order: -1}[data-ui=macos] .bt-wf{padding-left:.75rem}[data-ui=macos] .bt-wf-title{text-align:center;margin-right:3.6rem}[data-ui=macos] .bt-wf{background:color-mix(in srgb,hsl(var(--fg)) 3%,hsl(var(--surface)))}[data-ui=macos] .bt-wf-btns{gap:8px}[data-ui=macos] .bt-wf-close{order:-1}[data-ui=macos] .bt-wf-btn{--wf-r: 9999px;position:relative;width:12px;height:12px;padding:0;color:transparent;--wf-glyph: #995700;--wf-border: .5px solid #e1a73e;--wf-bg: #febc2e;--wf-hover: #febc2e;--wf-active: #c49a22}[data-ui=macos] .bt-wf-btn[aria-label=Maximise],[data-ui=macos] .bt-wf-btn[aria-label=Restore]{--wf-glyph: #006500;--wf-border: .5px solid #2dac2f;--wf-bg: #28c840;--wf-hover: #28c840;--wf-active: #1f9a30}[data-ui=macos] .bt-wf-close{--wf-glyph: #4d0000;--wf-border: .5px solid #e2463f;--wf-bg: #ff5f57;--wf-close-hover: #ff5f57;--wf-close-active: #bf4943}[data-ui=macos] .bt-wf-btn svg{display:none}[data-ui=macos] .bt-wf-btn:after{content:"";position:absolute;inset:0;margin:auto;width:8px;height:8px;background:var(--wf-glyph);opacity:0;transition:opacity .08s;-webkit-mask:var(--glyph) center / contain no-repeat;mask:var(--glyph) center / contain no-repeat}[data-ui=macos] .bt-wf-btns:hover .bt-wf-btn:after,[data-ui=macos] .bt-wf-btns:focus-within .bt-wf-btn:after{opacity:.85}[data-ui=macos] .bt-wf-btn{--glyph: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M1 4h6' stroke='%23000' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E")}[data-ui=macos] .bt-wf-close{--glyph: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M1.3 1.3l5.4 5.4M6.7 1.3L1.3 6.7' stroke='%23000' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E")}[data-ui=macos] .bt-wf-btn[aria-label=Maximise]{--glyph: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M.8 .8h3.6L.8 4.4zM7.2 7.2H3.6l3.6-3.6z'/%3E%3C/svg%3E")}[data-ui=macos] .bt-wf-btn[aria-label=Restore]{--glyph: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M1 4.2h2.8V1.4zM7 3.8H4.2v2.8z'/%3E%3C/svg%3E")}[data-ui=macos]{--chk-size: 1rem;--chk-r: 4px;--chk-border: .5px solid color-mix(in srgb, hsl(var(--fg)) 32%, transparent);--chk-bg: hsl(var(--surface));--chk-shadow: 0 .5px 1px rgb(0 0 0 / .2);--chk-on-bg: linear-gradient(to bottom, color-mix(in srgb, hsl(var(--accent)) 82%, white), hsl(var(--accent)));--chk-on-border: color-mix(in srgb, hsl(var(--accent)) 70%, black);--chk-focus: 0 0 0 3.5px color-mix(in srgb, hsl(var(--accent)) 40%, transparent);--radius: 10px;--ctl-r: 6px;--card-r: 12px;--win-r: 12px;--menu-r: 10px;--nav-r: 6px;--font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", "Inter", system-ui, sans-serif;--dur: .18s;--ease: cubic-bezier(.25, .1, .25, 1);--btn-bg: color-mix(in srgb, hsl(var(--surface)) 94%, white);--btn-border: .5px solid color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--btn-shadow: 0 .5px 1px rgb(0 0 0 / .18);--btn-hover-bg: color-mix(in srgb, hsl(var(--fg)) 5%, hsl(var(--surface)));--btn-hover-border: color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--btn-accent-bg: linear-gradient(to bottom, color-mix(in srgb, hsl(var(--accent)) 82%, white), hsl(var(--accent)));--btn-accent-border: .5px solid color-mix(in srgb, hsl(var(--accent)) 70%, black);--btn-accent-shadow: 0 .5px 1px rgb(0 0 0 / .18);--ghost-hover-bg: color-mix(in srgb, hsl(var(--fg)) 7%, transparent);--in-bg: hsl(var(--surface));--in-border: .5px solid color-mix(in srgb, hsl(var(--fg)) 16%, transparent);--in-shadow: 0 .5px 1px rgb(0 0 0 / .08);--in-hover-border: color-mix(in srgb, hsl(var(--fg)) 25%, transparent);--in-focus-border: hsl(var(--accent));--in-focus-shadow: 0 0 0 3.5px color-mix(in srgb, hsl(var(--accent)) 40%, transparent);--card-border: .5px solid color-mix(in srgb, hsl(var(--fg)) 12%, transparent);--card-shadow: 0 1px 3px rgb(0 0 0 / .08);--win-border: .5px solid color-mix(in srgb, hsl(var(--fg)) 22%, transparent);--win-shadow: 0 22px 60px rgb(0 0 0 / .4), 0 0 0 .5px rgb(0 0 0 / .3);--dialog-anim: bt-pop-spring .32s cubic-bezier(.2, .9, .3, 1);--tb-bg: radial-gradient(circle 6px at 40px 50%, #febc2e 96%, transparent) no-repeat, radial-gradient(circle 6px at 60px 50%, #28c840 96%, transparent) no-repeat, color-mix(in srgb, hsl(var(--fg)) 3%, hsl(var(--surface)));--tb-border: .5px solid color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--tb-pad: .8rem 1rem .7rem 5rem;--tb-size: .9rem;--tb-weight: 600;--tb-justify: flex-start;--close-margin: 0;--close-size: 13px;--close-pad: 0;--close-bg: #ff5f57;--close-fg: transparent;--close-hover-bg: #ff5f57;--close-hover-fg: rgb(0 0 0 / .65);--close-r: 9999px;--close-border: .5px solid rgb(0 0 0 / .2);--bar-border: .5px solid color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--menu-bg: color-mix(in srgb, hsl(var(--surface)) 92%, transparent);--menu-border: .5px solid color-mix(in srgb, hsl(var(--fg)) 16%, transparent);--pop-shadow: 0 10px 30px rgb(0 0 0 / .28);--menu-anim: bt-fade .13s ease-out;--menu-hi-bg: hsl(var(--accent));--menu-hi-fg: hsl(var(--accent-fg));--top-bg: hsl(var(--bg) / .72);--nav-hover-bg: color-mix(in srgb, hsl(var(--fg)) 6%, transparent);--nav-active-bg: color-mix(in srgb, hsl(var(--accent)) 22%, transparent);--nav-active-fg: hsl(var(--fg));--row-hover: color-mix(in srgb, hsl(var(--accent)) 12%, transparent);--rng-appearance: none;--rng-h: .25rem;--rng-track: color-mix(in srgb, hsl(var(--fg)) 18%, transparent);--rng-tw: 1.1rem;--rng-th: 1.1rem;--rng-thumb: #fff;--rng-tb: .5px solid rgb(0 0 0 / .2);--rng-ts: 0 1px 3px rgb(0 0 0 / .35)}[data-ui=macos] .bt-top{backdrop-filter:saturate(180%) blur(20px)}[data-ui=macos] .bt-titlebar svg{display:none}[data-ui=macos]{--player-in: bt-slide-in .38s cubic-bezier(.2, .9, .3, 1) both;--player-out: bt-slide-out .24s ease-in both;--player-ms: .24s;--pop-out: bt-fade-out .16s ease-in both;--pop-ms: .16s}[data-ui=macos]{--page-in: bt-fade .22s ease-out backwards}[data-ui=macos]{--radius: 10px;--ctl-r: 6px;--card-r: 10px;--win-r: 10px;--menu-r: 8px;--nav-r: 6px;--btn-accent-bg: hsl(var(--accent));--btn-accent-border: .5px solid color-mix(in srgb, hsl(var(--accent)) 75%, black);--btn-accent-shadow: 0 .5px 1px rgb(0 0 0 / .2);--btn-accent-hover-bg: color-mix(in srgb, hsl(var(--accent)) 92%, white);--btn-bg: color-mix(in srgb, hsl(var(--fg)) 4%, hsl(var(--surface)));--btn-active-transform: none;--side-bg: color-mix(in srgb, hsl(var(--surface)) 55%, transparent);--top-bg: color-mix(in srgb, hsl(var(--bg)) 70%, transparent);--nav-active-bg: color-mix(in srgb, hsl(var(--fg)) 11%, transparent);--nav-active-fg: hsl(var(--fg));--nav-hover-bg: color-mix(in srgb, hsl(var(--fg)) 5%, transparent);--menu-bg: color-mix(in srgb, hsl(var(--surface)) 80%, transparent);--menu-hi-bg: hsl(var(--accent));--menu-hi-fg: hsl(var(--accent-fg));--dialog-anim: bt-sheet .3s cubic-bezier(.2, .9, .3, 1)}[data-ui=macos] .bt-side{-webkit-backdrop-filter:saturate(180%) blur(30px);backdrop-filter:saturate(180%) blur(30px)}[data-ui=macos] .bt-menu{padding:5px;-webkit-backdrop-filter:saturate(180%) blur(24px);backdrop-filter:saturate(180%) blur(24px)}[data-ui=macos] .bt-menu [role=menuitem],[data-ui=macos] .bt-menu [role=option]{border-radius:5px}[data-ui=macos] .btn:focus-visible,[data-ui=macos] .input:focus{outline:none;box-shadow:0 0 0 3.5px color-mix(in srgb,hsl(var(--accent)) 45%,transparent)}@keyframes bt-pop-spring{0%{opacity:0;transform:scale(.88)}60%{opacity:1;transform:scale(1.015)}to{opacity:1;transform:none}}[data-ui=aqua]{--wf-order: -1}[data-ui=aqua] .bt-wf{padding-left:.75rem}[data-ui=aqua] .bt-wf-title{text-align:center;margin-right:3.6rem}[data-ui=aqua] .bt-wf{background:linear-gradient(to bottom,color-mix(in srgb,hsl(var(--bg)) 40%,white),color-mix(in srgb,hsl(var(--bg)) 85%,black))}[data-ui=aqua] .bt-wf-btns{gap:8px}[data-ui=aqua] .bt-wf-close{order:-1}[data-ui=aqua] .bt-wf-btn{--wf-r: 9999px;position:relative;width:12px;height:12px;padding:0;color:transparent;--wf-glyph: #995700;--wf-border: .5px solid #e1a73e;--wf-bg: #febc2e;--wf-hover: #febc2e;--wf-active: #c49a22}[data-ui=aqua] .bt-wf-btn[aria-label=Maximise],[data-ui=aqua] .bt-wf-btn[aria-label=Restore]{--wf-glyph: #006500;--wf-border: .5px solid #2dac2f;--wf-bg: #28c840;--wf-hover: #28c840;--wf-active: #1f9a30}[data-ui=aqua] .bt-wf-close{--wf-glyph: #4d0000;--wf-border: .5px solid #e2463f;--wf-bg: #ff5f57;--wf-close-hover: #ff5f57;--wf-close-active: #bf4943}[data-ui=aqua] .bt-wf-btn svg{display:none}[data-ui=aqua] .bt-wf-btn:after{content:"";position:absolute;inset:0;margin:auto;width:8px;height:8px;background:var(--wf-glyph);opacity:0;transition:opacity .08s;-webkit-mask:var(--glyph) center / contain no-repeat;mask:var(--glyph) center / contain no-repeat}[data-ui=aqua] .bt-wf-btns:hover .bt-wf-btn:after,[data-ui=aqua] .bt-wf-btns:focus-within .bt-wf-btn:after{opacity:.85}[data-ui=aqua] .bt-wf-btn{--glyph: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M1 4h6' stroke='%23000' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E")}[data-ui=aqua] .bt-wf-close{--glyph: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M1.3 1.3l5.4 5.4M6.7 1.3L1.3 6.7' stroke='%23000' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E")}[data-ui=aqua] .bt-wf-btn[aria-label=Maximise]{--glyph: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M.8 .8h3.6L.8 4.4zM7.2 7.2H3.6l3.6-3.6z'/%3E%3C/svg%3E")}[data-ui=aqua] .bt-wf-btn[aria-label=Restore]{--glyph: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M1 4.2h2.8V1.4zM7 3.8H4.2v2.8z'/%3E%3C/svg%3E")}[data-ui=aqua] .bt-wf-btn[aria-label=Maximise],[data-ui=aqua] .bt-wf-btn[aria-label=Restore]{--glyph: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M1 4h6M4 1v6' stroke='%23000' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E")}[data-ui=aqua] .bt-wf-btn{--wf-bg: radial-gradient(circle at 50% 18%, #fff0b8 0, #f7c23c 40%, #c98c10 100%);--wf-hover: radial-gradient(circle at 50% 18%, #fff0b8 0, #f7c23c 40%, #c98c10 100%);--wf-border: 1px solid #8a6310;--wf-shadow: inset 0 1px 1px rgb(255 255 255 / .6)}[data-ui=aqua] .bt-wf-btn[aria-label=Maximise],[data-ui=aqua] .bt-wf-btn[aria-label=Restore]{--wf-bg: radial-gradient(circle at 50% 18%, #d6ffc9 0, #55d246 40%, #1e8a1a 100%);--wf-hover: radial-gradient(circle at 50% 18%, #d6ffc9 0, #55d246 40%, #1e8a1a 100%);--wf-border: 1px solid #1a6a17}[data-ui=aqua] .bt-wf-close{--wf-bg: radial-gradient(circle at 50% 18%, #ffd0cc 0, #ff6b63 35%, #cf2a22 100%);--wf-close-hover: radial-gradient(circle at 50% 18%, #ffd0cc 0, #ff6b63 35%, #cf2a22 100%);--wf-border: 1px solid #8e1e19}[data-ui=aqua]{--page-in: none}[data-ui=aqua]{--radius: 6px;--ctl-r: 9999px;--card-r: 6px;--win-r: 7px 7px 3px 3px;--menu-r: 0 0 6px 6px;--nav-r: 4px;--chip-r: 9999px;--in-r: 4px;--font: "Lucida Grande", "Lucida Sans Unicode", "Lucida Sans", "Segoe UI", "DejaVu Sans", system-ui, sans-serif;--title-font: var(--font);--dur: .18s;--ease: ease-out;--aq-gel: linear-gradient(to bottom, color-mix(in srgb, hsl(var(--raised)) 40%, white) 0%, color-mix(in srgb, hsl(var(--raised)) 78%, white) 49%, color-mix(in srgb, hsl(var(--raised)) 94%, black) 51%, color-mix(in srgb, hsl(var(--raised)) 70%, white) 100%);--aq-blue: linear-gradient(to bottom, color-mix(in srgb, hsl(var(--accent)) 55%, white) 0%, color-mix(in srgb, hsl(var(--accent)) 90%, white) 49%, color-mix(in srgb, hsl(var(--accent)) 86%, black) 51%, color-mix(in srgb, hsl(var(--accent)) 60%, white) 100%);--btn-bg: var(--aq-gel);--btn-fg: hsl(var(--fg));--btn-weight: 400;--btn-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 45%, transparent);--btn-shadow: inset 0 1px 0 rgb(255 255 255 / .85), 0 1px 2px rgb(0 0 0 / .3);--btn-hover-bg: var(--aq-gel);--btn-hover-border: color-mix(in srgb, hsl(var(--fg)) 60%, transparent);--btn-hover-shadow: inset 0 1px 0 rgb(255 255 255 / .85), 0 1px 3px rgb(0 0 0 / .4);--btn-active-shadow: inset 0 2px 4px rgb(0 0 0 / .35);--btn-active-transform: none;--btn-accent-bg: var(--aq-blue);--btn-accent-fg: #fff;--btn-accent-text-shadow: 0 -1px 0 rgb(0 0 0 / .3);--btn-accent-border: 1px solid color-mix(in srgb, hsl(var(--accent)) 60%, black);--btn-accent-border-color: color-mix(in srgb, hsl(var(--accent)) 60%, black);--btn-accent-shadow: inset 0 1px 0 rgb(255 255 255 / .55), 0 1px 3px rgb(0 0 0 / .4);--btn-accent-hover-bg: var(--aq-blue);--btn-accent-hover-shadow: inset 0 1px 0 rgb(255 255 255 / .55), 0 1px 4px rgb(0 0 0 / .5);--ghost-hover-bg: color-mix(in srgb, hsl(var(--fg)) 10%, transparent);--in-bg: hsl(var(--surface));--in-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 50%, transparent);--in-shadow: inset 0 1px 3px rgb(0 0 0 / .35);--in-hover-border: color-mix(in srgb, hsl(var(--fg)) 50%, transparent);--in-focus-border: color-mix(in srgb, hsl(var(--accent)) 70%, black);--in-focus-shadow: inset 0 1px 3px rgb(0 0 0 / .35), 0 0 0 3px color-mix(in srgb, hsl(var(--accent)) 55%, transparent), 0 0 6px 3px color-mix(in srgb, hsl(var(--accent)) 40%, transparent);--card-bg: hsl(var(--surface));--card-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 38%, transparent);--card-shadow: 0 1px 2px rgb(0 0 0 / .25);--backdrop: rgb(0 0 0 / .3);--win-bg: repeating-linear-gradient(to bottom, hsl(var(--bg)) 0 2px, color-mix(in srgb, hsl(var(--bg)) 95%, black) 2px 4px);--win-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 55%, transparent);--win-shadow: 0 10px 28px rgb(0 0 0 / .5), 0 0 0 .5px rgb(0 0 0 / .4);--dialog-anim: bt-sheet .26s ease-out;--tb-bg: radial-gradient(circle 6.5px at 40px 50%, #f4bc32 0 94%, transparent 100%) no-repeat, radial-gradient(circle 6.5px at 60px 50%, #4fd24a 0 94%, transparent 100%) no-repeat, linear-gradient(to bottom, color-mix(in srgb, hsl(var(--bg)) 40%, white), color-mix(in srgb, hsl(var(--bg)) 85%, black));--tb-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 45%, transparent);--tb-pad: .45rem 1rem .45rem 5rem;--tb-size: .9rem;--tb-weight: 400;--tb-justify: flex-start;--close-margin: 0;--close-size: 13px;--close-pad: 0;--close-r: 9999px;--close-fg: transparent;--close-hover-fg: rgb(0 0 0 / .6);--close-bg: radial-gradient(circle at 50% 18%, #ffd0cc 0, #ff6b63 35%, #cf2a22 100%);--close-hover-bg: radial-gradient(circle at 50% 18%, #ffd0cc 0, #ff6b63 35%, #cf2a22 100%);--close-border: 1px solid #8e1e19;--close-shadow: inset 0 1px 1px rgb(255 255 255 / .6);--bar-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 45%, transparent);--menu-bg: color-mix(in srgb, hsl(var(--surface)) 94%, transparent);--menu-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 40%, transparent);--pop-shadow: 2px 4px 8px rgb(0 0 0 / .4);--menu-anim: bt-fade .11s linear;--menu-hi-bg: linear-gradient(to bottom, color-mix(in srgb, hsl(var(--accent)) 60%, white), hsl(var(--accent)));--menu-hi-fg: #fff;--side-bg: color-mix(in srgb, hsl(var(--accent)) 7%, hsl(var(--bg)));--side-shadow: inset -1px 0 0 rgb(255 255 255 / .6);--top-bg: linear-gradient(to bottom, color-mix(in srgb, hsl(var(--bg)) 35%, white), color-mix(in srgb, hsl(var(--bg)) 82%, black));--top-shadow: inset 0 1px 0 rgb(255 255 255 / .8);--player-bg: linear-gradient(to bottom, color-mix(in srgb, hsl(var(--bg)) 35%, white), color-mix(in srgb, hsl(var(--bg)) 82%, black));--player-shadow: inset 0 1px 0 rgb(255 255 255 / .8);--nav-hover-bg: color-mix(in srgb, hsl(var(--accent)) 12%, transparent);--nav-active-bg: linear-gradient(to bottom, color-mix(in srgb, hsl(var(--accent)) 62%, white), hsl(var(--accent)));--nav-active-fg: #fff;--nav-active-shadow: inset 0 1px 0 rgb(255 255 255 / .4);--row-hover: linear-gradient(to bottom, color-mix(in srgb, hsl(var(--accent)) 62%, white), hsl(var(--accent)));--row-hover-fg: #fff;--row-current: color-mix(in srgb, hsl(var(--accent)) 22%, transparent);--panel-tb-bg: linear-gradient(to bottom, color-mix(in srgb, hsl(var(--bg)) 40%, white), color-mix(in srgb, hsl(var(--bg)) 85%, black));--panel-tb-margin: -1.25rem -1.25rem .25rem;--panel-tb-pad: .35rem 1rem;--tb-text-shadow: 0 1px 0 rgb(255 255 255 / .7);--chk-size: 1rem;--chk-r: 3px;--chk-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 55%, transparent);--chk-bg: var(--aq-gel);--chk-shadow: inset 0 1px 0 rgb(255 255 255 / .85), 0 1px 1px rgb(0 0 0 / .2);--chk-on-bg: var(--aq-blue);--chk-on-border: color-mix(in srgb, hsl(var(--accent)) 60%, black);--chk-on-fg: #fff;--chk-radio-on-bg: var(--aq-blue);--chk-dot: #fff;--chk-hover-border: hsl(var(--accent));--chk-focus: 0 0 0 3px color-mix(in srgb, hsl(var(--accent)) 55%, transparent);--rng-appearance: none;--rng-h: 5px;--rng-r: 3px;--rng-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 45%, transparent);--rng-shadow: inset 0 1px 2px rgb(0 0 0 / .3);--rng-track: color-mix(in srgb, hsl(var(--bg)) 80%, white);--rng-fill: hsl(var(--accent));--rng-tw: 1rem;--rng-th: 1rem;--rng-tr: 9999px;--rng-tb: 1px solid color-mix(in srgb, hsl(var(--fg)) 50%, transparent);--rng-thumb: var(--aq-gel);--rng-ts: 0 1px 2px rgb(0 0 0 / .4)}[data-ui=aqua] .bt-titlebar{position:relative;justify-content:center;padding-left:5rem;padding-right:5rem}[data-ui=aqua] .bt-titlebar svg{display:none}[data-ui=aqua] .bt-close{position:absolute;left:13.5px;top:50%;transform:translateY(-50%)}[data-ui=aqua] .bt-window .btn-accent:not(:disabled){animation:aq-pulse 1.6s ease-in-out infinite}[data-ui=aqua] .bt-nav{font-size:.8125rem}html[data-ui=aqua] ::selection{background:#b5d5ff;color:#000}@keyframes aq-pulse{0%,to{filter:brightness(1)}50%{filter:brightness(1.14) saturate(1.1)}}[data-ui=toolbar]{--radius: 8px;--ctl-r: 6px;--card-r: 8px;--win-r: 8px;--menu-r: 6px;--nav-r: 6px;--in-r: 8px;--font: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";--dur: .15s;--ease: cubic-bezier(.4, 0, .2, 1);--row-y: .75rem;--grid-min: 10rem;--btn-bg: hsl(var(--raised) / .5);--btn-border: 1px solid hsl(var(--line));--btn-weight: 700;--btn-hover-bg: hsl(var(--hover));--btn-accent-bg: hsl(var(--accent));--btn-accent-border: 0 solid transparent;--btn-accent-weight: 700;--btn-accent-hover-bg: color-mix(in srgb, hsl(var(--accent)) 76%, hsl(var(--top)));--ghost-hover-bg: hsl(var(--hover));--in-bg: hsl(var(--raised) / .5);--in-border: 1px solid hsl(var(--line));--in-hover-border: hsl(var(--line));--in-focus-border: hsl(var(--accent));--in-focus-shadow: none;--in-py: .5rem;--card-bg: hsl(var(--raised) / .4);--card-border: 1px solid hsl(var(--line));--backdrop: rgb(0 0 0 / .8);--win-bg: hsl(var(--bg));--win-border: 1px solid hsl(var(--line));--win-shadow: 0 10px 15px -3px rgb(0 0 0 / .4), 0 4px 6px -4px rgb(0 0 0 / .4);--dialog-anim: bt-pop .2s var(--ease);--tb-bg: transparent;--tb-border: 0 solid transparent;--tb-pad: 1.5rem 3rem .25rem 1.5rem;--tb-weight: 900;--tb-size: 1.25rem;--tb-justify: flex-start;--close-fg: hsl(var(--fg));--close-r: 2px;--menu-bg: hsl(var(--bg));--menu-border: 1px solid hsl(var(--line));--pop-shadow: 0 4px 6px -1px rgb(0 0 0 / .4), 0 2px 4px -2px rgb(0 0 0 / .4);--menu-anim: bt-pop .12s var(--ease);--menu-hi-bg: hsl(var(--hover));--side-bg: hsl(var(--bg));--top-bg: hsl(var(--bg));--player-bg: hsl(var(--bg));--nav-hover-bg: hsl(var(--raised) / .5);--nav-active-bg: hsl(var(--raised));--nav-active-fg: hsl(var(--fg));--row-hover: hsl(var(--raised) / .3);--row-current: hsl(var(--accent) / .1);--player-in: none;--player-out: none;--player-ms: 0ms;--pop-out: none;--pop-ms: 0ms;--rng-appearance: none;--rng-h: .5rem;--rng-r: 9999px;--rng-border: 1px solid hsl(var(--line) / .5);--rng-track: hsl(var(--line));--rng-fill: hsl(var(--raised));--rng-tw: 1rem;--rng-th: 1rem;--rng-thumb: hsl(var(--bg));--rng-tb: 2px solid hsl(var(--muted));--rng-ts: none}[data-ui=toolbar] .btn{font-size:.75rem}[data-ui=toolbar] .btn-accent{font-weight:var(--btn-accent-weight);text-transform:uppercase;letter-spacing:.05em}[data-ui=toolbar] .btn-ghost{font-weight:500}[data-ui=toolbar] .input:focus-visible,[data-ui=toolbar] .input:focus{box-shadow:0 0 0 1px hsl(var(--accent))}[data-ui=toolbar] .bt-brand{padding:1.5rem .5rem;margin-bottom:0;font-size:1.25rem;line-height:1.75rem;font-weight:700;letter-spacing:-.05em;text-transform:uppercase}[data-ui=toolbar] .bt-brand img{display:none}[data-ui=toolbar] .bt-side .bt-nav{color:color-mix(in srgb,hsl(var(--fg)) 63%,hsl(var(--bg)))}[data-ui=toolbar] .bt-side .bt-nav:hover,[data-ui=toolbar] .bt-side .bt-nav[aria-current=page]{color:hsl(var(--fg))}[data-ui=toolbar] .bt-tabbar .bt-tab{font-weight:700}[data-ui=toolbar] main h1{font-size:1.875rem;line-height:2.25rem;font-weight:900;letter-spacing:-.025em;text-transform:uppercase}[data-ui=toolbar] main h1>span{font-size:.875rem;letter-spacing:0}[data-ui=toolbar] main h2:not([class*=text-2xl]){font-size:.875rem;line-height:1.25rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}[data-ui=toolbar] main .card h2:not([class*=text-2xl]){font-size:.75rem}[data-ui=toolbar] .bt-label{font-size:10px;line-height:1rem;font-weight:900;letter-spacing:.1em;text-transform:uppercase}[data-ui=toolbar] .bt-titlebar{position:relative}[data-ui=toolbar] .bt-titlebar h2{text-transform:uppercase;letter-spacing:-.025em}[data-ui=toolbar] .bt-titlebar .bt-close{position:absolute;right:1rem;top:1rem;opacity:.7;padding:.15rem}[data-ui=toolbar] .bt-titlebar .bt-close:hover{opacity:1}[data-ui=toolbar] .bt-window .bt-body{padding:1.25rem 1.5rem 1.5rem}[data-ui=toolbar] .bt-footer{border-top:0;justify-content:flex-end;padding:0 1.5rem 1.5rem}[data-ui=toolbar] .bt-menu [role=menuitem],[data-ui=toolbar] .bt-menu [role=option]{font-size:.75rem;font-weight:700}[data-ui=toolbar] .bt-tile{background:hsl(var(--raised) / .4);border:1px solid hsl(var(--line));border-radius:var(--card-r);overflow:hidden;padding-bottom:.75rem;text-align:left;transition:border-color var(--dur) var(--ease)}[data-ui=toolbar] .bt-tile:hover{border-color:color-mix(in srgb,hsl(var(--line)) 88%,hsl(var(--fg)))}[data-ui=toolbar] .bt-tile .bt-cover{border-radius:0;transition-duration:.5s}[data-ui=toolbar] .bt-tile:hover .bt-cover{transform:scale(1.05)}[data-ui=toolbar] .bt-cap-t,[data-ui=toolbar] .bt-cap{padding-inline:.75rem}[data-ui=toolbar] .bt-cap-t{margin-top:0;padding-top:.75rem;font-weight:700}[data-ui=toolbar] .bt-cap{padding-top:.125rem}[data-ui=toolbar] .bt-tile .bt-cover[data-kind=artist] img{filter:grayscale(1);transition:filter .5s var(--ease)}[data-ui=toolbar] .bt-tile:hover .bt-cover[data-kind=artist] img{filter:none}[data-ui=toolbar] .bt-tile .bt-cover[data-kind=artist]:after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.6;background:linear-gradient(to top,rgb(0 0 0 / .8),transparent)}[data-ui=toolbar] .card.overflow-hidden{border-radius:1rem;border-color:hsl(var(--raised));background:hsl(var(--raised) / .2)}[data-ui=toolbar] .divide-y>:not([hidden])~:not([hidden]){border-color:hsl(var(--raised) / .5)}@media(min-width:768px){[data-ui=toolbar] .bt-pbar{min-height:6rem;padding:0 1.5rem;gap:1.5rem}}[data-ui=toolbar] .bt-cover-btn .bt-cover{width:3.5rem;height:3.5rem;border-radius:.5rem;border:1px solid hsl(var(--line));box-shadow:0 10px 15px -3px #0006}[data-ui=toolbar] .bt-ptitle{font-weight:900;letter-spacing:-.025em;text-transform:uppercase}[data-ui=toolbar] .bt-partist{font-weight:700;letter-spacing:.1em;text-transform:uppercase;font-size:.75rem}[data-ui=toolbar] .bt-player .btn-accent{background:hsl(var(--fg));color:hsl(var(--bg))}[data-ui=toolbar] .bt-player .btn-accent:hover{background:color-mix(in srgb,hsl(var(--fg)) 84%,hsl(var(--bg)))}[data-ui=toolbar] .bt-times{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}[data-ui=liquid]{--wf-order: -1}[data-ui=liquid] .bt-wf{padding-left:.75rem}[data-ui=liquid] .bt-wf-title{text-align:center;margin-right:3.6rem}[data-ui=liquid] .bt-wf-btns{gap:8px}[data-ui=liquid] .bt-wf-close{order:-1}[data-ui=liquid] .bt-wf-btn{--wf-r: 9999px;position:relative;width:12px;height:12px;padding:0;color:transparent;--wf-glyph: #995700;--wf-border: .5px solid #e1a73e;--wf-bg: #febc2e;--wf-hover: #febc2e;--wf-active: #c49a22}[data-ui=liquid] .bt-wf-btn[aria-label=Maximise],[data-ui=liquid] .bt-wf-btn[aria-label=Restore]{--wf-glyph: #006500;--wf-border: .5px solid #2dac2f;--wf-bg: #28c840;--wf-hover: #28c840;--wf-active: #1f9a30}[data-ui=liquid] .bt-wf-close{--wf-glyph: #4d0000;--wf-border: .5px solid #e2463f;--wf-bg: #ff5f57;--wf-close-hover: #ff5f57;--wf-close-active: #bf4943}[data-ui=liquid] .bt-wf-btn svg{display:none}[data-ui=liquid] .bt-wf-btn:after{content:"";position:absolute;inset:0;margin:auto;width:8px;height:8px;background:var(--wf-glyph);opacity:0;transition:opacity .08s;-webkit-mask:var(--glyph) center / contain no-repeat;mask:var(--glyph) center / contain no-repeat}[data-ui=liquid] .bt-wf-btns:hover .bt-wf-btn:after,[data-ui=liquid] .bt-wf-btns:focus-within .bt-wf-btn:after{opacity:.85}[data-ui=liquid] .bt-wf-btn{--glyph: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M1 4h6' stroke='%23000' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E")}[data-ui=liquid] .bt-wf-close{--glyph: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M1.3 1.3l5.4 5.4M6.7 1.3L1.3 6.7' stroke='%23000' stroke-width='1.2' stroke-linecap='round'/%3E%3C/svg%3E")}[data-ui=liquid] .bt-wf-btn[aria-label=Maximise]{--glyph: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M.8 .8h3.6L.8 4.4zM7.2 7.2H3.6l3.6-3.6z'/%3E%3C/svg%3E")}[data-ui=liquid] .bt-wf-btn[aria-label=Restore]{--glyph: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath d='M1 4.2h2.8V1.4zM7 3.8H4.2v2.8z'/%3E%3C/svg%3E")}[data-ui=liquid]{--radius: 22px;--ctl-r: 9999px;--card-r: 24px;--win-r: 34px;--menu-r: 24px;--nav-r: 18px;--in-r: 14px;--in-px: .9rem;--font: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", system-ui, sans-serif;--dur: .18s;--ease: cubic-bezier(.32, .72, 0, 1);--spring: cubic-bezier(.34, 1.56, .64, 1);--lg-fill: hsl(var(--surface) / .34);--lg-fill-strong: hsl(var(--surface) / .6);--lg-sheen: linear-gradient(140deg, rgb(255 255 255 / .14), rgb(255 255 255 / .015) 44%, rgb(255 255 255 / .06));--lg-shadow: 0 12px 38px rgb(0 0 0 / .36), 0 2px 8px rgb(0 0 0 / .24);--lg-rim: inset 0 0 0 .5px rgb(255 255 255 / .14);--lg-blur: 14px;--lg-blur-sm: 8px;--lg-sat: 1.7;--lg-bright: 1.05;--lg-dim: transparent;--lg-hover: rgb(255 255 255 / .12);--lg-press: rgb(255 255 255 / .2);--btn-fg: inherit;--btn-weight: 600;--in-bg: hsl(var(--raised) / .5);--in-border: .5px solid rgb(255 255 255 / .14);--in-shadow: inset 0 1px 2px rgb(0 0 0 / .18);--in-hover-border: rgb(255 255 255 / .28);--in-focus-border: hsl(var(--accent));--in-focus-shadow: 0 0 0 4px hsl(var(--accent) / .32);--card-bg: hsl(var(--surface) / .46);--card-border: .5px solid rgb(255 255 255 / .1);--card-shadow: 0 6px 24px rgb(0 0 0 / .16);--backdrop: rgb(0 0 0 / .34);--dialog-anim: lg-open .38s cubic-bezier(.22, 1, .36, 1) both;--menu-anim: lg-menu .3s cubic-bezier(.22, 1, .36, 1) both;--tb-bg: transparent;--tb-border: 0 solid transparent;--tb-pad: 1.2rem 1.5rem .4rem;--tb-size: 1.2rem;--tb-weight: 700;--close-size: 2rem;--close-pad: 0;--close-bg: rgb(255 255 255 / .13);--close-r: 9999px;--close-hover-bg: rgb(255 255 255 / .24);--bar-border: .5px solid rgb(255 255 255 / .1);--row-hover: rgb(255 255 255 / .07);--row-current: hsl(var(--accent) / .16);--nav-hover-bg: rgb(255 255 255 / .08);--nav-active-fg: hsl(var(--fg));--rng-appearance: none;--rng-h: 6px;--rng-track: rgb(255 255 255 / .2);--rng-fill: hsl(var(--accent));--rng-tw: 1.75rem;--rng-th: 1.1rem;--rng-tr: 9999px;--rng-thumb: linear-gradient(#fff, #eceef4);--rng-ts: 0 2px 8px rgb(0 0 0 / .4), inset 0 0 0 .5px rgb(0 0 0 / .1);--chk-size: 1.2rem;--chk-r: 7px;--chk-border: .5px solid rgb(255 255 255 / .3);--chk-bg: linear-gradient(140deg, rgb(255 255 255 / .2), rgb(255 255 255 / .06));--chk-shadow: inset 0 .5px 0 rgb(255 255 255 / .4), 0 1px 3px rgb(0 0 0 / .25);--chk-on-bg: linear-gradient(140deg, hsl(var(--accent) / .95), hsl(var(--accent) / .7));--chk-on-border: hsl(var(--accent) / .6);--chk-focus: 0 0 0 4px hsl(var(--accent) / .32)}[data-ui=liquid][data-mode=light]{--lg-fill: hsl(var(--surface) / .46);--lg-fill-strong: hsl(var(--surface) / .74);--lg-sheen: linear-gradient(140deg, rgb(255 255 255 / .6), rgb(255 255 255 / .1) 46%, rgb(255 255 255 / .32));--lg-shadow: 0 12px 34px rgb(40 52 90 / .2), 0 1px 5px rgb(40 52 90 / .14);--lg-rim: inset 0 0 0 .5px rgb(255 255 255 / .75), inset 0 0 0 1px rgb(40 52 90 / .07);--lg-sat: 1.9;--lg-bright: 1.04;--lg-hover: rgb(255 255 255 / .5);--lg-press: rgb(255 255 255 / .75);--in-bg: hsl(var(--surface) / .55);--in-border: .5px solid rgb(0 0 0 / .1);--in-shadow: inset 0 1px 2px rgb(40 52 90 / .1);--in-hover-border: rgb(0 0 0 / .22);--card-bg: hsl(var(--surface) / .62);--card-border: .5px solid rgb(255 255 255 / .7);--card-shadow: 0 6px 22px rgb(40 52 90 / .12);--backdrop: rgb(20 28 50 / .28);--close-bg: rgb(0 0 0 / .07);--close-hover-bg: rgb(0 0 0 / .14);--bar-border: .5px solid rgb(0 0 0 / .08);--row-hover: rgb(0 0 0 / .05);--nav-hover-bg: rgb(0 0 0 / .05);--rng-track: rgb(0 0 0 / .14);--rng-thumb: linear-gradient(#fff, #f4f5f9);--chk-border: .5px solid rgb(0 0 0 / .25);--chk-bg: linear-gradient(140deg, #fff, rgb(255 255 255 / .5))}html[data-glass=clear][data-ui=liquid]{--lg-fill: hsl(var(--surface) / .05);--lg-fill-strong: hsl(var(--surface) / .2);--lg-blur: 2px;--lg-blur-sm: 1px;--lg-sat: 1.25;--lg-bright: 1;--lg-dim: rgb(0 0 0 / .22)}html[data-glass=clear][data-ui=liquid][data-mode=light]{--lg-dim: rgb(0 0 0 / .12)}html.lg-inactive[data-ui=liquid]{--lg-sat: 1.05;--lg-blur: 12px;--lg-shadow: 0 6px 18px rgb(0 0 0 / .18)}html.lg-inactive[data-ui=liquid] .bt-shell{opacity:.86}html[data-ui=liquid]:not([data-wallpaper=on]) body{background-color:hsl(var(--bg));background-attachment:fixed;background-image:radial-gradient(60rem 40rem at 6% -8%,hsl(var(--accent) / .4),transparent 62%),radial-gradient(52rem 38rem at 98% 6%,hsl(var(--top) / .3),transparent 60%),radial-gradient(56rem 40rem at 62% 112%,hsl(var(--bad) / .18),transparent 62%),radial-gradient(40rem 30rem at 30% 60%,hsl(var(--good) / .1),transparent 60%)}html[data-ui=liquid][data-mode=light]:not([data-wallpaper=on]) body{background-image:radial-gradient(60rem 40rem at 6% -8%,hsl(var(--accent) / .46),transparent 62%),radial-gradient(52rem 38rem at 98% 6%,hsl(var(--top) / .38),transparent 60%),radial-gradient(56rem 40rem at 62% 112%,hsl(var(--bad) / .22),transparent 62%),radial-gradient(40rem 30rem at 30% 60%,hsl(var(--good) / .16),transparent 60%)}:is(html,div)[data-ui=liquid] .bt-side,:is(html,div)[data-ui=liquid] .bt-player,:is(html,div)[data-ui=liquid] .bt-tabbar,:is(html,div)[data-ui=liquid] .bt-menu,:is(html,div)[data-ui=liquid] .bt-window{background:var(--lg-spec, none) center / 100% 100% no-repeat,var(--lg-sheen),var(--lg-fill);-webkit-backdrop-filter:blur(var(--lg-blur)) saturate(var(--lg-sat));backdrop-filter:blur(var(--lg-blur)) var(--lg-filter, saturate(1)) saturate(var(--lg-sat)) brightness(var(--lg-bright));border:0;box-shadow:var(--lg-shadow),var(--lg-rim),inset 0 0 0 999px var(--lg-dim)}:is(html,div)[data-ui=liquid] .bt-window{background:var(--lg-spec, none) center / 100% 100% no-repeat,var(--lg-sheen),var(--lg-fill-strong);box-shadow:0 30px 80px #00000073,0 4px 14px #00000040,var(--lg-rim),inset 0 0 0 999px var(--lg-dim)}:is(html,div)[data-ui=liquid] .bt-backdrop{animation:bt-fade .3s ease-out both}:is(html,div)[data-ui=liquid] .bt-menu{padding:6px;background:var(--lg-spec, none) center / 100% 100% no-repeat,var(--lg-sheen),var(--lg-fill-strong)}:is(html,div)[data-ui=liquid] .bt-menu [role=menuitem]{width:100%;border-radius:calc(var(--menu-r) - 8px);padding-inline:.8rem}:is(html,div)[data-ui=liquid] .bt-menu [role=menuitem]:hover:not(:disabled),:is(html,div)[data-ui=liquid] .bt-menu [role=menuitem]:focus-visible{background:radial-gradient(circle at var(--mx, 50%) var(--my, 50%),var(--lg-press),var(--lg-hover) 70%);color:inherit;box-shadow:inset 0 0 0 .5px #ffffff2e}:is(html,div)[data-ui=liquid] .bt-window .bt-body{background:none}:is(html,div)[data-ui=liquid] .bt-footer{border-top:var(--bar-border)}:is(html,div)[data-ui=liquid] .bt-side.bt-shell{margin:12px 0 12px 12px;border-radius:30px;padding:12px;animation:lg-bar-in .42s var(--ease) both}:is(html,div)[data-ui=liquid] .bt-player.bt-shell{position:fixed;z-index:30;left:12px;right:12px;bottom:12px;border-radius:30px;overflow:hidden}:is(html,div)[data-ui=liquid] .bt-player.bt-shell>div:last-child{padding-block:.4rem}:is(html,div)[data-ui=liquid] .bt-tabbar.bt-shell{position:fixed;z-index:31;left:12px;right:12px;bottom:12px;border-radius:9999px;padding:4px 6px}:is(html,div)[data-ui=liquid] .bt-tab{position:relative;z-index:1;border-radius:9999px;transition:color var(--dur) var(--ease)}:is(html,div)[data-ui=liquid] .bt-tab[aria-current=page]{background:none}:is(html,div)[data-ui=liquid] .bt-ind{display:block;position:absolute;left:0;top:0;z-index:0;pointer-events:none;width:var(--ind-w, 0);height:var(--ind-h, 0);opacity:var(--ind-o, 0);transform:translate3d(var(--ind-x, 0),var(--ind-y, 0),0);border-radius:var(--nav-r);background:var(--lg-sheen),#ffffff21;box-shadow:inset 0 0 0 .5px #ffffff3d,0 2px 10px #00000024;will-change:transform}:is(html,div)[data-ui=liquid] [data-ind-ready]>.bt-ind{transition:transform .42s cubic-bezier(.22,1,.36,1),width .46s var(--spring),height .46s var(--spring),opacity .16s ease}:is(html,div)[data-ui=liquid] .bt-tabbar .bt-ind{border-radius:9999px}[data-ui=liquid][data-mode=light] .bt-ind{background:var(--lg-sheen),#ffffffbf;box-shadow:inset 0 0 0 .5px #0000000f,0 2px 10px #28345a24}@media(min-width:768px){:is(html,div)[data-ui=liquid] .bt-player.bt-shell{left:calc(14rem + 24px)}}@media(max-width:767.98px){:is(html,div)[data-ui=liquid] .bt-player.bt-shell{bottom:calc(12px + 3.9rem)}}:is(html,div)[data-ui=liquid] main{padding-bottom:1.5rem}:is(html,div)[data-ui=liquid] main.has-player{padding-bottom:7.25rem}@media(max-width:767.98px){:is(html,div)[data-ui=liquid] main{padding-bottom:6rem}:is(html,div)[data-ui=liquid] main.has-player{padding-bottom:11.75rem}}:is(html,div)[data-ui=liquid] .bt-top.bt-shell{background:none;border:0;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none;isolation:isolate}:is(html,div)[data-ui=liquid] .bt-scrim{display:block;position:fixed;z-index:5;left:0;right:0;top:0;height:5.25rem;pointer-events:none;background:linear-gradient(hsl(var(--bg) / .7),hsl(var(--bg) / 0));-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);-webkit-mask-image:linear-gradient(#000 55%,transparent);mask-image:linear-gradient(#000 55%,transparent)}:is(html,div)[data-ui=liquid][data-mode=light] .bt-scrim,[data-mode=light] [data-ui=liquid] .bt-scrim{background:linear-gradient(#ffffff80,#fff0)}:is(html,div)[data-ui=liquid] .bt-side.bt-shell{position:relative;z-index:6}:is(html,div)[data-ui=liquid] .bt-top .input{border-radius:9999px;border:0;padding-block:.55rem;background:var(--lg-spec, none) center / 100% 100% no-repeat,var(--lg-sheen),var(--lg-fill);-webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:var(--lg-shadow),var(--lg-rim)}:is(html,div)[data-ui=liquid] .bt-top .input:focus{box-shadow:var(--lg-shadow),0 0 0 4px hsl(var(--accent) / .32)}:is(html,div)[data-ui=liquid] .btn,:is(html,div)[data-ui=liquid] .btn:hover,:is(html,div)[data-ui=liquid] .btn:active{--lg-btn-fill: var(--lg-fill);background:var(--lg-spec, none) center / 100% 100% no-repeat,var(--lg-sheen),var(--lg-btn-fill);border:0;color:inherit;text-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:0 3px 12px #00000029,var(--lg-rim);transition:transform .36s var(--spring),box-shadow .24s var(--ease)}:is(html,div)[data-ui=liquid] .btn:not(.absolute):not(.fixed){position:relative;isolation:isolate}:is(html,div)[data-ui=liquid] .btn:before{content:"";position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none;opacity:0;background:radial-gradient(circle at var(--mx, 50%) var(--my, 50%),rgb(255 255 255 / .5),rgb(255 255 255 / .12) 55%,transparent 80%);transition:opacity .26s var(--ease)}:is(html,div)[data-ui=liquid] .btn:hover:before{opacity:.55}:is(html,div)[data-ui=liquid] .btn:active:before{opacity:1;transition-duration:90ms}:is(html,div)[data-ui=liquid] .btn:active{transform:scale(.93);transition:transform .1s ease-out,box-shadow .14s;box-shadow:0 1px 4px #0003,var(--lg-rim)}:is(html,div)[data-ui=liquid] .btn:focus-visible{outline:none;box-shadow:0 0 0 4px hsl(var(--accent) / .4),var(--lg-rim)}:is(html,div)[data-ui=liquid] .btn.btn-accent,:is(html,div)[data-ui=liquid] .btn.btn-accent:hover,:is(html,div)[data-ui=liquid] .btn.btn-accent:active{--lg-btn-fill: linear-gradient(160deg, hsl(var(--accent) / .92), hsl(var(--accent) / .66));color:hsl(var(--accent-fg));box-shadow:0 4px 16px hsl(var(--accent) / .35),0 1px 3px #0003,var(--lg-rim)}:is(html,div)[data-ui=liquid] .btn.btn-ghost:not(:hover):not(:focus-visible):not(:active){background:none;-webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:none}:is(html,div)[data-ui=liquid] .btn:disabled{opacity:.4}:is(html,div)[data-ui=liquid] .bt-nav,:is(html,div)[data-ui=liquid] .bt-nav:hover{transition:background-color var(--dur) var(--ease),transform .42s var(--spring)}:is(html,div)[data-ui=liquid] .bt-nav:active{transform:scale(.96)}:is(html,div)[data-ui=liquid] .bt-nav{position:relative;z-index:1}:is(html,div)[data-ui=liquid] .bt-nav[aria-current=page]{background:none;box-shadow:none}:is(html,div)[data-ui=liquid] .bt-range::-webkit-slider-thumb{transition:transform .36s var(--spring)}:is(html,div)[data-ui=liquid] .bt-range:active::-webkit-slider-thumb{transform:scale(1.14)}:is(html,div)[data-ui=liquid] .card{background:var(--lg-sheen),var(--card-bg);border:0;box-shadow:var(--card-shadow),var(--lg-rim),inset 0 .5px #ffffff4d;-webkit-backdrop-filter:none;backdrop-filter:none}:is(html,div)[data-ui=liquid] .card .card{background:var(--lg-sheen),hsl(var(--surface) / .3);-webkit-backdrop-filter:none;backdrop-filter:none}:is(html,div)[data-ui=liquid] textarea.input{border-radius:18px}:is(html,div)[data-ui=liquid] .chip{background:#ffffff1a;box-shadow:inset 0 0 0 .5px #ffffff1f}[data-ui=liquid][data-mode=light] .chip{background:#0000000d;box-shadow:inset 0 0 0 .5px #0000000f}html[data-ui=liquid] ::selection{background:hsl(var(--accent) / .4)}@media(prefers-reduced-transparency:reduce){[data-ui=liquid]{--lg-fill: hsl(var(--surface) / .96);--lg-fill-strong: hsl(var(--surface));--lg-sheen: none;--card-bg: hsl(var(--surface))}:is(html,div)[data-ui=liquid] .bt-side,:is(html,div)[data-ui=liquid] .bt-player,:is(html,div)[data-ui=liquid] .bt-tabbar,:is(html,div)[data-ui=liquid] .bt-menu,:is(html,div)[data-ui=liquid] .bt-window,:is(html,div)[data-ui=liquid] .btn,:is(html,div)[data-ui=liquid] .card,:is(html,div)[data-ui=liquid] .bt-top .input,:is(html,div)[data-ui=liquid] .bt-backdrop{-webkit-backdrop-filter:none;backdrop-filter:none}}[data-ui=liquid]{--player-in: lg-bar-in .42s var(--ease) both;--player-out: lg-bar-out .26s cubic-bezier(.5, 0, .75, 0) both;--player-ms: .26s;--pop-out: lg-menu-out .2s cubic-bezier(.5, 0, .75, 0) both;--pop-ms: .2s}[data-ui=liquid]{--page-in: bt-page-glass .34s cubic-bezier(.22, 1, .36, 1) backwards}:is(html,div)[data-ui=liquid] .bt-cover[data-kind=artist]{border-radius:min(30px,28%)!important}@keyframes lg-open{0%{opacity:0;transform:scale(.72);-webkit-backdrop-filter:none;backdrop-filter:none}38%{opacity:1}68%{transform:scale(1.018)}99%{-webkit-backdrop-filter:none;backdrop-filter:none}to{opacity:1;transform:none;-webkit-backdrop-filter:blur(var(--lg-blur)) saturate(var(--lg-sat));backdrop-filter:blur(var(--lg-blur)) var(--lg-filter, saturate(1)) saturate(var(--lg-sat)) brightness(var(--lg-bright))}}@keyframes lg-menu{0%{opacity:0;transform:scale(.6)}30%{opacity:1}70%{transform:scale(1.012)}to{opacity:1;transform:none}}@keyframes lg-pill{0%{transform:scale(.82);opacity:.2}60%{transform:scale(1.04);opacity:1}to{transform:none}}@keyframes lg-bar-out{0%{opacity:1;transform:none}to{opacity:0;transform:translateY(18px) scale(.97)}}@keyframes lg-bar-in{0%{opacity:0;transform:translateY(18px) scale(.97)}to{opacity:1;transform:none}}@keyframes lg-menu-out{0%{opacity:1;transform:none}to{opacity:0;transform:scale(.7)}}@keyframes bt-page-glass{0%{opacity:0;transform:scale(.985) translateY(6px)}to{opacity:1;transform:none}}[data-ui=holo] .bt-wf-close:is(:hover,:focus-visible){background:color-mix(in srgb,currentColor 22%,transparent);color:inherit}[data-ui=holo] .bt-wf-btn{--wf-r: 9999px;width:1.7rem;height:1.7rem}[data-ui=holo]{--page-in: bt-fade .12s linear backwards}[data-ui=holo]{--radius: 2px;--ctl-r: 2px;--card-r: 2px;--win-r: 2px;--menu-r: 2px;--nav-r: 0;--chip-r: 2px;--in-r: 0;--font: Roboto, "Noto Sans", "Droid Sans", "Segoe UI", system-ui, sans-serif;--title-font: var(--font);--dur: .15s;--ease: cubic-bezier(.4, 0, .2, 1);--btn-bg: color-mix(in srgb, hsl(var(--fg)) 14%, hsl(var(--surface)));--btn-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--btn-weight: 400;--btn-hover-bg: color-mix(in srgb, hsl(var(--fg)) 20%, hsl(var(--surface)));--btn-hover-border: color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--btn-accent-bg: color-mix(in srgb, hsl(var(--fg)) 14%, hsl(var(--surface)));--btn-accent-fg: hsl(var(--fg));--btn-accent-border: 1px solid hsl(var(--accent));--btn-accent-border-color: hsl(var(--accent));--btn-accent-hover-bg: color-mix(in srgb, hsl(var(--accent)) 25%, hsl(var(--surface)));--ghost-hover-bg: color-mix(in srgb, hsl(var(--fg)) 12%, transparent);--in-bg: transparent;--in-border: 0 solid transparent;--in-shadow: inset 0 -1px 0 color-mix(in srgb, hsl(var(--fg)) 45%, transparent);--in-hover-border: transparent;--in-focus-border: transparent;--in-focus-shadow: inset 0 -2px 0 hsl(var(--accent)), 0 1px 0 hsl(var(--accent) / .5);--in-px: .25rem;--card-bg: hsl(var(--surface));--card-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 12%, transparent);--backdrop: rgb(0 0 0 / .6);--win-bg: hsl(var(--surface));--win-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--win-shadow: 0 6px 24px rgb(0 0 0 / .6);--dialog-anim: bt-pop .16s cubic-bezier(.4, 0, .2, 1);--tb-bg: transparent;--tb-fg: hsl(var(--accent));--tb-border: 2px solid hsl(var(--accent));--tb-pad: .9rem 1.1rem .45rem;--tb-size: 1.35rem;--tb-weight: 300;--tb-justify: flex-start;--close-fg: hsl(var(--muted));--close-hover-bg: color-mix(in srgb, hsl(var(--fg)) 12%, transparent);--close-r: 2px;--close-margin: 0 0 0 auto;--bar-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 10%, transparent);--menu-bg: hsl(var(--surface));--menu-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 16%, transparent);--pop-shadow: 0 4px 12px rgb(0 0 0 / .55);--menu-anim: bt-fade .12s linear;--menu-hi-bg: color-mix(in srgb, hsl(var(--accent)) 35%, transparent);--menu-hi-fg: inherit;--side-bg: hsl(var(--bg));--top-bg: hsl(var(--surface));--top-shadow: inset 0 -2px 0 hsl(var(--accent));--player-bg: hsl(var(--surface));--player-shadow: inset 0 2px 0 hsl(var(--accent));--nav-hover-bg: color-mix(in srgb, hsl(var(--fg)) 8%, transparent);--nav-active-bg: color-mix(in srgb, hsl(var(--accent)) 14%, transparent);--nav-active-fg: hsl(var(--accent));--nav-active-shadow: inset 3px 0 0 hsl(var(--accent));--row-hover: color-mix(in srgb, hsl(var(--accent)) 16%, transparent);--row-current: color-mix(in srgb, hsl(var(--accent)) 24%, transparent);--panel-tb-fg: hsl(var(--accent));--panel-tb-margin: 0 0 .5rem;--panel-tb-pad: 0 0 .4rem;--panel-tb-bg: transparent;--chk-size: 1.2rem;--chk-r: 2px;--chk-border: 2px solid color-mix(in srgb, hsl(var(--fg)) 55%, transparent);--chk-bg: transparent;--chk-hover-border: hsl(var(--accent));--chk-on-bg: transparent;--chk-on-border: hsl(var(--accent));--chk-on-fg: hsl(var(--accent));--chk-radio-on-bg: transparent;--chk-dot: hsl(var(--accent));--chk-focus: 0 0 0 3px hsl(var(--accent) / .3);--rng-appearance: none;--rng-h: 2px;--rng-r: 0;--rng-track: color-mix(in srgb, hsl(var(--fg)) 28%, transparent);--rng-fill: hsl(var(--accent));--rng-tw: .9rem;--rng-th: .9rem;--rng-tr: 9999px;--rng-thumb: hsl(var(--accent));--rng-ts: 0 0 0 6px hsl(var(--accent) / .25)}[data-ui=holo] .btn:active:not(:disabled){background:hsl(var(--accent));color:hsl(var(--accent-fg))}[data-ui=holo] .bt-titlebar svg{display:none}[data-ui=holo] .bt-tab[aria-current=page]{box-shadow:inset 0 -3px hsl(var(--accent))}[data-ui=holo] .bt-top .input{box-shadow:inset 0 -1px color-mix(in srgb,hsl(var(--fg)) 45%,transparent)}[data-ui=winamp] .bt-wf-close:is(:hover,:focus-visible){background:color-mix(in srgb,currentColor 22%,transparent);color:inherit}[data-ui=winamp] .bt-wf-btn{--wf-r: 0;--wf-bg: var(--wa-metal);--wf-shadow: var(--wa-up);width:1.1rem;height:1rem}[data-ui=winamp]{--page-in: none}[data-ui=winamp]{--radius: 0px;--ctl-r: 0;--card-r: 0;--win-r: 0;--menu-r: 0;--nav-r: 0;--chip-r: 0;--in-r: 0;--font: Arial, "Liberation Sans", Helvetica, sans-serif;--title-font: var(--font);--wa-up: inset 1px 1px 0 rgb(255 255 255 / .22), inset -1px -1px 0 rgb(0 0 0 / .75);--wa-down: inset 1px 1px 0 rgb(0 0 0 / .75), inset -1px -1px 0 rgb(255 255 255 / .18);--wa-metal: linear-gradient(to bottom, color-mix(in srgb, hsl(var(--raised)) 88%, white), hsl(var(--raised)) 55%, color-mix(in srgb, hsl(var(--raised)) 80%, black));--wa-stripe: repeating-linear-gradient(to bottom, color-mix(in srgb, hsl(var(--raised)) 70%, white) 0 1px, color-mix(in srgb, hsl(var(--raised)) 70%, black) 1px 2px);--dur: 0ms;--ease: linear;--dialog-anim: none;--menu-anim: none;--btn-bg: var(--wa-metal);--btn-fg: hsl(var(--fg));--btn-weight: 400;--btn-border: 1px solid #000;--btn-shadow: var(--wa-up);--btn-hover-bg: var(--wa-metal);--btn-hover-border: #000;--btn-hover-shadow: var(--wa-up);--btn-active-shadow: var(--wa-down);--btn-active-transform: none;--btn-accent-bg: var(--wa-metal);--btn-accent-fg: hsl(var(--accent));--btn-accent-border: 1px solid #000;--btn-accent-border-color: #000;--btn-accent-shadow: var(--wa-up);--btn-accent-hover-bg: var(--wa-metal);--btn-accent-hover-shadow: var(--wa-up);--ghost-hover-bg: color-mix(in srgb, hsl(var(--fg)) 10%, transparent);--in-bg: #000;--in-border: 1px solid #000;--in-shadow: var(--wa-down);--in-hover-border: #000;--in-focus-border: hsl(var(--accent));--in-focus-shadow: var(--wa-down);--card-bg: #000;--card-border: 1px solid #000;--card-shadow: var(--wa-down);--backdrop: rgb(0 0 0 / .55);--win-bg: hsl(var(--bg));--win-border: 1px solid #000;--win-shadow: var(--wa-up), 3px 3px 0 rgb(0 0 0 / .6);--tb-bg: var(--wa-stripe);--tb-fg: hsl(var(--fg));--tb-border: 1px solid #000;--tb-pad: .15rem .4rem;--tb-size: .7rem;--tb-weight: 700;--tb-justify: space-between;--close-fg: hsl(var(--fg));--close-bg: var(--wa-metal);--close-shadow: var(--wa-up);--close-border: 1px solid #000;--close-hover-bg: var(--wa-metal);--close-hover-fg: hsl(var(--accent));--close-r: 0;--bar-border: 1px solid #000;--menu-bg: hsl(var(--bg));--menu-border: 1px solid #000;--pop-shadow: var(--wa-up), 2px 2px 0 rgb(0 0 0 / .6);--menu-hi-bg: #000080;--menu-hi-fg: #fff;--side-bg: #000;--side-shadow: var(--wa-down);--top-bg: hsl(var(--bg));--top-shadow: var(--wa-up);--player-bg: hsl(var(--bg));--player-shadow: var(--wa-up);--nav-hover-bg: transparent;--nav-active-bg: #000080;--nav-active-fg: #fff;--row-hover: #000080;--row-hover-fg: #fff;--row-current: #000080;--panel-tb-bg: var(--wa-stripe);--panel-tb-fg: hsl(var(--fg));--panel-tb-margin: -1.25rem -1.25rem .5rem;--panel-tb-pad: .15rem .5rem;--chk-size: .85rem;--chk-r: 0;--chk-border: 1px solid #000;--chk-bg: #000;--chk-shadow: var(--wa-down);--chk-hover-border: #000;--chk-on-bg: #000;--chk-on-border: #000;--chk-on-fg: hsl(var(--accent));--chk-radio-on-bg: #000;--chk-dot: hsl(var(--accent));--chk-focus: 0 0 0 1px hsl(var(--accent));--rng-appearance: none;--rng-h: 6px;--rng-r: 0;--rng-shadow: var(--wa-down);--rng-track: #000;--rng-fill: hsl(var(--accent));--rng-tw: .7rem;--rng-th: .8rem;--rng-tr: 0;--rng-thumb: var(--wa-metal);--rng-ts: var(--wa-up);--rng-tb: 1px solid #000;--vote-ms: 0ms;--player-in: none;--player-out: none;--player-ms: 0ms;--pop-out: none;--pop-ms: 0ms}html[data-ui=winamp]{font-size:13px}[data-ui=winamp] *,[data-ui=winamp] :before,[data-ui=winamp] :after{transition-duration:0s!important;border-radius:0!important}[data-ui=winamp] .bt-titlebar h2,[data-ui=winamp] .bt-panel-title{text-transform:uppercase;letter-spacing:.22em;font-size:.68rem}[data-ui=winamp] .bt-titlebar svg{display:none}[data-ui=winamp] .bt-row,[data-ui=winamp] .card .text-muted{color:hsl(var(--accent))}[data-ui=winamp] .bt-row:hover,[data-ui=winamp] .bt-row:hover *{color:#fff}[data-ui=winamp] .card:not(.bt-panel):not([class*=" p-"]):not([class*=" px-"]):not([class*=" py-"]){padding:2px}[data-ui=winamp] .bt-player [role=slider],[data-ui=winamp] .bt-player .tabular-nums{color:hsl(var(--accent));font-family:ui-monospace,DejaVu Sans Mono,monospace}html[data-ui=winamp] ::selection{background:navy;color:#fff}[data-ui=lgux] .bt-wf-close:is(:hover,:focus-visible){background:color-mix(in srgb,currentColor 22%,transparent);color:inherit}[data-ui=lgux] .bt-wf-btn{--wf-r: 9999px;width:1.7rem;height:1.7rem}[data-ui=lgux]{--radius: 2px;--ctl-r: 2px;--card-r: 2px;--win-r: 2px;--menu-r: 2px;--nav-r: 0;--chip-r: 2px;--in-r: 0;--font: Roboto, "Noto Sans", "Droid Sans", "Segoe UI", system-ui, sans-serif;--title-font: var(--font);--dur: .15s;--ease: cubic-bezier(.4, 0, .2, 1);--btn-bg: color-mix(in srgb, hsl(var(--fg)) 14%, hsl(var(--surface)));--btn-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--btn-weight: 400;--btn-hover-bg: color-mix(in srgb, hsl(var(--fg)) 20%, hsl(var(--surface)));--btn-hover-border: color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--btn-accent-bg: color-mix(in srgb, hsl(var(--fg)) 14%, hsl(var(--surface)));--btn-accent-fg: hsl(var(--fg));--btn-accent-border: 1px solid hsl(var(--accent));--btn-accent-border-color: hsl(var(--accent));--btn-accent-hover-bg: color-mix(in srgb, hsl(var(--accent)) 25%, hsl(var(--surface)));--ghost-hover-bg: color-mix(in srgb, hsl(var(--fg)) 12%, transparent);--in-bg: transparent;--in-border: 0 solid transparent;--in-shadow: inset 0 -1px 0 color-mix(in srgb, hsl(var(--fg)) 45%, transparent);--in-hover-border: transparent;--in-focus-border: transparent;--in-focus-shadow: inset 0 -2px 0 hsl(var(--accent)), 0 1px 0 hsl(var(--accent) / .5);--in-px: .25rem;--card-bg: hsl(var(--surface));--card-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 12%, transparent);--backdrop: rgb(0 0 0 / .6);--win-bg: hsl(var(--surface));--win-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--win-shadow: 0 6px 24px rgb(0 0 0 / .6);--dialog-anim: bt-pop .16s cubic-bezier(.4, 0, .2, 1);--tb-bg: transparent;--tb-pad: .9rem 1.1rem .45rem;--tb-size: 1.35rem;--tb-weight: 300;--tb-justify: flex-start;--close-fg: hsl(var(--muted));--close-hover-bg: color-mix(in srgb, hsl(var(--fg)) 12%, transparent);--close-r: 2px;--close-margin: 0 0 0 auto;--bar-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 10%, transparent);--menu-bg: hsl(var(--surface));--menu-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 16%, transparent);--pop-shadow: 0 4px 12px rgb(0 0 0 / .55);--menu-anim: bt-fade .12s linear;--menu-hi-bg: color-mix(in srgb, hsl(var(--accent)) 35%, transparent);--menu-hi-fg: inherit;--side-bg: hsl(var(--bg));--top-bg: hsl(var(--surface));--player-bg: hsl(var(--surface));--nav-hover-bg: color-mix(in srgb, hsl(var(--fg)) 8%, transparent);--nav-active-bg: color-mix(in srgb, hsl(var(--accent)) 14%, transparent);--nav-active-fg: hsl(var(--accent));--nav-active-shadow: inset 3px 0 0 hsl(var(--accent));--row-hover: color-mix(in srgb, hsl(var(--accent)) 16%, transparent);--row-current: color-mix(in srgb, hsl(var(--accent)) 24%, transparent);--panel-tb-fg: hsl(var(--accent));--panel-tb-margin: 0 0 .5rem;--panel-tb-pad: 0 0 .4rem;--panel-tb-bg: transparent;--chk-size: 1.2rem;--chk-r: 2px;--chk-border: 2px solid color-mix(in srgb, hsl(var(--fg)) 55%, transparent);--chk-bg: transparent;--chk-hover-border: hsl(var(--accent));--chk-on-bg: transparent;--chk-on-border: hsl(var(--accent));--chk-on-fg: hsl(var(--accent));--chk-radio-on-bg: transparent;--chk-dot: hsl(var(--accent));--chk-focus: 0 0 0 3px hsl(var(--accent) / .3);--rng-appearance: none;--rng-h: 2px;--rng-r: 0;--rng-track: color-mix(in srgb, hsl(var(--fg)) 28%, transparent);--rng-fill: hsl(var(--accent));--rng-tw: .9rem;--rng-th: .9rem;--rng-tr: 9999px;--rng-thumb: hsl(var(--accent));--rng-ts: 0 0 0 6px hsl(var(--accent) / .25);--mm-frame: color-mix(in srgb, hsl(var(--pink, 347 68% 60%)) 45%, hsl(var(--bg)));--mm-soft: color-mix(in srgb, hsl(var(--pink, 347 68% 60%)) 14%, hsl(var(--surface)));--mm-glass: color-mix(in srgb, hsl(var(--surface)) 72%, transparent);--btn-bg: color-mix(in srgb, hsl(var(--fg)) 9%, hsl(var(--surface)));--btn-fg: hsl(var(--fg));--btn-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 16%, transparent);--btn-hover-bg: color-mix(in srgb, hsl(var(--accent)) 20%, hsl(var(--surface)));--btn-hover-border: hsl(var(--accent));--btn-accent-bg: hsl(var(--accent));--btn-accent-fg: hsl(var(--accent-fg));--btn-accent-border: 1px solid color-mix(in srgb, hsl(var(--accent)) 78%, black);--btn-accent-border-color: color-mix(in srgb, hsl(var(--accent)) 78%, black);--btn-accent-hover-bg: color-mix(in srgb, hsl(var(--accent)) 88%, white);--card-bg: var(--mm-glass);--card-border: 1px solid var(--mm-frame);--win-bg: color-mix(in srgb, hsl(var(--surface)) 96%, transparent);--win-border: 1px solid var(--mm-frame);--win-shadow: 0 8px 24px color-mix(in srgb, hsl(var(--pink, 347 68% 60%)) 25%, transparent);--menu-bg: color-mix(in srgb, hsl(var(--surface)) 97%, transparent);--menu-border: 1px solid var(--mm-frame);--pop-shadow: 0 4px 14px color-mix(in srgb, hsl(var(--pink, 347 68% 60%)) 24%, transparent);--menu-hi-bg: color-mix(in srgb, hsl(var(--accent)) 22%, transparent);--menu-hi-fg: hsl(var(--fg));--bar-border: 1px solid var(--mm-frame);--side-bg: color-mix(in srgb, hsl(var(--surface)) 55%, transparent);--side-shadow: none;--top-bg: #231a1d;--top-shadow: inset 0 -2px 0 hsl(var(--accent));--player-bg: color-mix(in srgb, hsl(var(--surface)) 82%, transparent);--player-shadow: inset 0 2px 0 hsl(var(--accent));--tb-fg: hsl(var(--accent));--tb-border: 2px solid hsl(var(--accent))}[data-ui=lgux] .bt-top{color:#fff;--fg: 0 0% 100%;--muted: 340 20% 78%}[data-ui=lgux] .bt-top .input{color:hsl(var(--fg));background:#ffffff1f;border-color:#ffffff59}[data-ui=lgux] .bt-top .input::placeholder{color:#fff9}[data-ui=lgux] .bt-top .btn:not(.btn-accent){color:#fff;background:transparent;border-color:#ffffff59}[data-ui=lgux] .bt-top .btn-accent{background:hsl(var(--accent));color:hsl(var(--accent-fg))}[data-ui=lgux] .bt-top .btn:not(.btn-accent) svg{color:#fff}[data-ui=lgux] .bt-tab[aria-current=page]{box-shadow:inset 0 -3px hsl(var(--accent))}[data-ui=lgux] .bt-titlebar svg{display:none}[data-ui=lgux] .bt-menu,[data-ui=lgux] .bt-menu svg{color:hsl(var(--fg))}[data-ui=lgux] .btn-ghost{color:hsl(var(--fg))}[data-ui=lgux] :is(.btn,.bt-nav,.bt-tab,.bt-toplink):not(.absolute):not(.fixed){position:relative;overflow:hidden}[data-ui=lgux] .bt-brand img,[data-ui=lgux] .bt-top>.bt-topin>img{border-radius:22%}[data-ui=lgux]{--pink: 347 68% 60%}html[data-mode=dark][data-ui=lgux]{--pink: 330 100% 71%}[data-ui=lgux] :is(.card,.bt-window,.bt-menu){--accent: var(--pink);--accent-fg: 0 0% 100%;--btn-bg: var(--mm-soft);--btn-border: 1px solid var(--mm-frame);--btn-hover-bg: color-mix(in srgb, hsl(var(--pink)) 22%, hsl(var(--surface)));--btn-hover-border: hsl(var(--pink));--btn-accent-bg: hsl(var(--pink));--btn-accent-fg: #fff;--btn-accent-border: 1px solid color-mix(in srgb, hsl(var(--pink)) 78%, black);--btn-accent-border-color: color-mix(in srgb, hsl(var(--pink)) 78%, black);--btn-accent-hover-bg: color-mix(in srgb, hsl(var(--pink)) 88%, white);--in-focus-shadow: inset 0 -2px 0 hsl(var(--pink)), 0 1px 0 hsl(var(--pink) / .5);--chk-on-border: hsl(var(--pink));--chk-on-fg: hsl(var(--pink));--chk-dot: hsl(var(--pink));--chk-hover-border: hsl(var(--pink));--rng-fill: hsl(var(--pink));--rng-thumb: hsl(var(--pink));--rng-ts: 0 0 0 6px hsl(var(--pink) / .25);--row-hover: hsl(var(--pink) / .12);--row-current: hsl(var(--pink) / .2);--tb-fg: hsl(var(--pink));--tb-border: 2px solid hsl(var(--pink));--menu-hi-bg: hsl(var(--pink) / .2)}[data-ui=lgux] :is(.bt-nav,.bt-tab)>svg{box-sizing:content-box;width:22px;height:22px;padding:0;margin:2px;stroke:url(#mm-g1);stroke-width:3.1;stroke-linecap:round;stroke-linejoin:round;paint-order:stroke;fill:none;background:none;box-shadow:none;border-radius:0;filter:drop-shadow(0 1px 0 rgb(255 255 255 / .9)) drop-shadow(0 2.5px 1.5px rgb(0 0 0 / .28));transition:transform .18s cubic-bezier(.34,1.7,.5,1)}[data-ui=lgux] :is(.bt-nav,.bt-tab)[href="/"]>svg{stroke:url(#mm-g1)}[data-ui=lgux] :is(.bt-nav,.bt-tab)[href="/albums"]>svg{stroke:url(#mm-g2)}[data-ui=lgux] :is(.bt-nav,.bt-tab)[href="/singles"]>svg{stroke:url(#mm-g3)}[data-ui=lgux] :is(.bt-nav,.bt-tab)[href="/eras"]>svg{stroke:url(#mm-g4)}[data-ui=lgux] :is(.bt-nav,.bt-tab)[href="/artists"]>svg{stroke:url(#mm-g5)}[data-ui=lgux] :is(.bt-nav,.bt-tab)[href="/tracks"]>svg{stroke:url(#mm-g6)}[data-ui=lgux] :is(.bt-nav,.bt-tab)[href="/vote"]>svg{stroke:url(#mm-g7)}[data-ui=lgux] :is(.bt-nav,.bt-tab)[href="/playlists"]>svg{stroke:url(#mm-g1)}[data-ui=lgux] :is(.bt-nav,.bt-tab)[href="/queue"]>svg{stroke:url(#mm-g2)}[data-ui=lgux] :is(.bt-nav,.bt-tab)[href="/notes"]>svg{stroke:url(#mm-g3)}[data-ui=lgux] :is(.bt-nav,.bt-tab)[href="/discover"]>svg{stroke:url(#mm-g4)}[data-ui=lgux] :is(.bt-nav,.bt-tab)[href="/stats"]>svg{stroke:url(#mm-g5)}[data-ui=lgux] :is(.bt-nav,.bt-tab)[href="/health"]>svg{stroke:url(#mm-g6)}[data-ui=lgux] :is(.bt-nav,.bt-tab)[href="/settings"]>svg{stroke:url(#mm-g7)}[data-ui=lgux] :is(.bt-nav,.bt-tab):active>svg{transform:scale(1.12,.84)}[data-ui=lgux] :is(.bt-nav,.bt-tab):hover>svg{transform:translateY(-1px) scale(1.06)}[data-ui=lgux] .bt-nav{gap:.75rem;padding-block:.3rem}[data-ui=lgux] .bt-tab>svg{margin-bottom:2px}@media(prefers-reduced-motion:reduce){[data-ui=lgux] :is(.bt-nav,.bt-tab)>svg{transition:none}}[data-ui=fortnite1]{--dur: .12s;--ease: cubic-bezier(.2, .9, .3, 1);--btn-weight: 800;--btn-border: 0 solid transparent;--ghost-hover-bg: hsl(var(--fg) / .14);--in-focus-shadow: none;--tb-border: 0 solid transparent;--tb-pad: .6rem 1.25rem;--tb-size: 1.35rem;--tb-weight: 900;--tb-justify: space-between;--close-hover-bg: rgb(0 0 0 / .18);--panel-tb-margin: 0 0 .5rem;--panel-tb-pad: 0;--chk-size: 1.2rem;--vote-ms: .38s;--rng-appearance: none;--rng-h: 8px;--rng-tw: 1rem;--rng-th: 1rem}html[data-ui=fortnite1]{font-size:15px}[data-ui=fortnite1]{text-transform:uppercase;letter-spacing:.02em;font-weight:700}[data-ui=fortnite1] :is(button,.btn,select,[role=menuitem],[role=option],h1,h2,h3,label,summary){text-transform:inherit;letter-spacing:inherit}[data-ui=fortnite1] :is(.input,input,textarea,code,pre,p,.font-mono,[contenteditable]){text-transform:none;letter-spacing:0}[data-ui=fortnite1] :is(h1,h2,h3,.bt-titlebar h2){font-family:var(--title-font);font-weight:800}[data-ui=fortnite1] .btn{font-weight:800;letter-spacing:.04em}[data-ui=fortnite1] .btn:hover:not(:disabled){transform:translateY(-1px)}[data-ui=fortnite1] .btn:active:not(:disabled){transform:translateY(1px)}[data-ui=fortnite1] .btn-accent{font-style:italic}[data-ui=fortnite1] .bt-titlebar svg{display:none}[data-ui=fortnite1] .btn.btn-accent{font-size:1rem}[data-ui=fortnite1]{--fn-weight: 700}[data-ui=fortnite1] :is(.font-light,.font-normal,.font-medium,.font-semibold,.bt-nav,.bt-tab,.chip,th,label,[role=menuitem],[role=option],.btn){font-weight:var(--fn-weight)}[data-ui=fortnite1] :is(.font-bold,.font-extrabold,h1,h2,h3,.bt-titlebar h2){font-weight:900}[data-ui=fortnite1]{--radius: 2px;--ctl-r: 2px;--card-r: 2px;--win-r: 2px;--menu-r: 2px;--nav-r: 2px;--chip-r: 2px;--in-r: 2px;--display: "Burbank Big Condensed", "Barlow Condensed", Oswald, "Arial Narrow", sans-serif;--font: "Noto Sans", "Burbank Small", "Open Sans", "Segoe UI", system-ui, sans-serif;--title-font: var(--font);--btn-weight: 600;--tb-weight: 400;--tb-size: 1.5rem;--btn-bg: #d4dbea;--btn-fg: #121830;--btn-shadow: inset 0 1px 0 #fff, 0 3px 0 rgb(40 52 96 / .45);--btn-hover-bg: #e3e8f4;--btn-hover-shadow: inset 0 1px 0 #fff, 0 3px 0 rgb(40 52 96 / .45);--btn-active-shadow: inset 0 2px 0 rgb(24 34 70 / .25);--btn-active-transform: translateY(2px);--btn-accent-bg: #fbf6c8;--btn-accent-fg: #1b2342;--btn-accent-shadow: inset 0 -3px 0 #f0e02c, 0 3px 0 rgb(40 52 96 / .45);--btn-accent-hover-bg: #fffbe3;--btn-accent-hover-shadow: inset 0 -3px 0 #f0e02c, 0 3px 0 rgb(40 52 96 / .45);--in-bg: #5f7bab;--in-border: 0 solid transparent;--in-shadow: inset 0 2px 0 rgb(10 20 60 / .25);--in-hover-border: transparent;--in-focus-border: transparent;--card-bg: #4c66a8;--card-border: 0 solid transparent;--card-shadow: 0 2px 0 rgb(20 30 70 / .45);--win-bg: #3c5391;--win-border: 0 solid transparent;--win-shadow: 0 18px 40px rgb(10 16 40 / .5);--dialog-anim: bt-pop .16s cubic-bezier(.2, .9, .3, 1);--tb-bg: #222c4e;--tb-fg: #fff;--close-fg: #fff;--close-hover-fg: #fff;--bar-border: 0 solid transparent;--menu-bg: #36508f;--menu-border: 0 solid transparent;--pop-shadow: 0 6px 0 rgb(20 30 70 / .45), 0 16px 30px rgb(10 16 40 / .5);--menu-anim: bt-pop .12s cubic-bezier(.2, .9, .3, 1);--menu-hi-bg: #5f7bab;--menu-hi-fg: #fff;--side-bg: #222c4e;--top-bg: #222c4e;--player-bg: #222c4e;--player-shadow: none;--nav-hover-bg: rgb(255 255 255 / .08);--nav-active-bg: #8b9cc6;--nav-active-fg: #fff;--nav-active-shadow: none;--row-hover: rgb(255 255 255 / .12);--row-current: rgb(251 246 200 / .22);--panel-tb-fg: #fff;--chk-border: 2px solid #fff;--chk-on-fg: #1b2342;--rng-track: #1d2646;--rng-fill: #1aa0ff;--rng-thumb: #d4dbea;--rng-ts: 0 2px 0 rgb(24 34 70 / .4)}[data-ui=fortnite1]{text-transform:none;letter-spacing:0;font-weight:500;--fn-weight: 600}[data-ui=fortnite1] :is(h1,h2,h3,.bt-titlebar h2){font-weight:400;font-style:normal;letter-spacing:0}[data-ui=fortnite1] :is(.btn,.bt-nav,.bt-tab,.chip,th,[role=menuitem],[role=option]){letter-spacing:0}[data-ui=fortnite1] .btn{font-weight:600;letter-spacing:0}[data-ui=fortnite1] .btn.btn-accent{font-family:var(--display);font-weight:900;font-style:italic;text-transform:uppercase;letter-spacing:.04em;font-size:1.2rem}[data-ui=fortnite1] .bt-side .mb-3{font-family:var(--display);font-weight:900;text-transform:uppercase;letter-spacing:.04em}[data-ui=fortnite1] :is(.bt-side,.bt-top,.bt-player,.bt-tabbar,.bt-titlebar){--fg: 0 0% 100%;--muted: 222 30% 82%;color:#fff}[data-ui=fortnite1] .bt-nav{font-weight:500}[data-ui=fortnite1] .bt-nav[aria-current=page]{font-weight:600}[data-ui=fortnite1] .input{color:#fff;font-weight:600}[data-ui=fortnite1] .input::placeholder{color:#ffffffb8;font-weight:500}[data-ui=fortnite1] .bt-top .input{background:#36427a}[data-ui=fortnite1] .bt-top .btn:not(.btn-accent),[data-ui=fortnite1] .bt-player .btn:not(.btn-accent){background:#36427a;color:#fff;box-shadow:inset 0 -3px #ffffff2e}[data-ui=fortnite1] :is(.btn,.bt-nav,.bt-tab,.chip,.bt-row,.input,.bt-close,[role=menuitem],[role=option],a.card,button.card){outline:3px solid transparent;outline-offset:0;transition:outline-color var(--dur) var(--ease),background-color var(--dur) var(--ease),box-shadow var(--dur) var(--ease),transform var(--dur) var(--ease)}[data-ui=fortnite1] :is(.btn,.bt-nav,.bt-tab,.chip,.bt-row,.input,.bt-close,a.card,button.card):is(:hover,:focus-visible):not(:disabled){outline-color:#f6ee2a}[data-ui=fortnite1] :is([role=menuitem],[role=option]):is(:hover,:focus-visible){outline:3px solid #f6ee2a;outline-offset:-3px}[data-ui=fortnite1] .bt-row:is(:hover,:focus-visible){outline-offset:-3px}[data-ui=fortnite1] .btn:hover:not(:disabled){transform:none}[data-ui=fortnite1] .btn:active:not(:disabled){transform:translateY(2px)}[data-ui=fortnite2]{--dur: .12s;--ease: cubic-bezier(.2, .9, .3, 1);--btn-weight: 800;--btn-border: 0 solid transparent;--ghost-hover-bg: hsl(var(--fg) / .14);--in-focus-shadow: none;--tb-border: 0 solid transparent;--tb-pad: .6rem 1.25rem;--tb-size: 1.35rem;--tb-weight: 900;--tb-justify: space-between;--close-hover-bg: rgb(0 0 0 / .18);--panel-tb-margin: 0 0 .5rem;--panel-tb-pad: 0;--chk-size: 1.2rem;--vote-ms: .38s;--rng-appearance: none;--rng-h: 8px;--rng-tw: 1rem;--rng-th: 1rem}html[data-ui=fortnite2]{font-size:17px}[data-ui=fortnite2]{text-transform:uppercase;letter-spacing:.02em;font-weight:700}[data-ui=fortnite2] :is(button,.btn,select,[role=menuitem],[role=option],h1,h2,h3,label,summary){text-transform:inherit;letter-spacing:inherit}[data-ui=fortnite2] :is(.input,input,textarea,code,pre,p,.font-mono,[contenteditable]){text-transform:none;letter-spacing:0}[data-ui=fortnite2] :is(h1,h2,h3,.bt-titlebar h2){font-family:var(--title-font);font-weight:800}[data-ui=fortnite2] .btn{font-weight:800;letter-spacing:.04em}[data-ui=fortnite2] .btn:hover:not(:disabled){transform:translateY(-1px)}[data-ui=fortnite2] .btn:active:not(:disabled){transform:translateY(1px)}[data-ui=fortnite2] .btn-accent{font-style:italic}[data-ui=fortnite2] .bt-titlebar svg{display:none}[data-ui=fortnite2] .btn.btn-accent{font-size:1rem}[data-ui=fortnite2]{--fn-weight: 700}[data-ui=fortnite2]{--fn-weight: 900;font-weight:900}[data-ui=fortnite2] :is(.font-light,.font-normal,.font-medium,.font-semibold,.bt-nav,.bt-tab,.chip,th,label,[role=menuitem],[role=option],.btn){font-weight:var(--fn-weight)}[data-ui=fortnite2] :is(.font-bold,.font-extrabold,h1,h2,h3,.bt-titlebar h2){font-weight:900}[data-ui=fortnite2] :is(.btn,.bt-nav,.bt-tab){letter-spacing:.05em}[data-ui=fortnite2]{--radius: 0px;--ctl-r: 0;--card-r: 0;--win-r: 0;--menu-r: 0;--nav-r: 0;--chip-r: 0;--in-r: 0;--font: "Burbank Big Condensed", "Barlow Condensed", Oswald, "Arial Narrow", sans-serif;--title-font: var(--font);--btn-bg: #1685e0;--btn-fg: #fff;--btn-shadow: inset 0 0 0 2px #5fd0ff;--btn-hover-bg: #2b9bf5;--btn-hover-shadow: inset 0 0 0 2px #b4ecff;--btn-active-shadow: inset 0 0 0 2px #fff;--btn-active-transform: none;--btn-accent-bg: #e8f03b;--btn-accent-fg: #262a00;--btn-accent-shadow: inset 0 0 0 3px rgb(255 255 255 / .55);--btn-accent-hover-bg: #f3fa6a;--btn-accent-hover-shadow: inset 0 0 0 3px rgb(255 255 255 / .8);--in-bg: #0a4a9a;--in-border: 2px solid #22b6ff;--in-hover-border: #7ee0ff;--in-focus-border: #e8f03b;--card-bg: rgb(10 74 154 / .78);--card-border: 0 solid transparent;--card-shadow: none;--win-bg: #0a58b0;--win-border: 0 solid transparent;--win-shadow: 0 20px 50px rgb(0 20 70 / .6);--dialog-anim: bt-pop .14s cubic-bezier(.2, .9, .3, 1);--tb-bg: #0a4a9a;--tb-fg: #cfeaff;--close-fg: #cfeaff;--close-hover-fg: #fff;--bar-border: 0 solid transparent;--menu-bg: #0a4a9a;--menu-border: 2px solid #22b6ff;--pop-shadow: 0 12px 30px rgb(0 20 70 / .55);--menu-anim: bt-pop .12s cubic-bezier(.2, .9, .3, 1);--menu-hi-bg: #19b0f2;--menu-hi-fg: #fff;--side-bg: linear-gradient(to bottom, #0a62c0, #0a85dc);--top-bg: #0a56b0;--player-bg: #0a4a9a;--player-shadow: inset 0 2px 0 #22b6ff;--nav-hover-bg: rgb(34 182 255 / .3);--nav-active-bg: #19b0f2;--nav-active-fg: #fff;--nav-active-shadow: inset 0 0 0 2px #fff;--row-hover: rgb(34 182 255 / .22);--row-current: rgb(232 240 59 / .2);--panel-tb-fg: #9ee3ff;--chk-border: 2px solid #22c4ff;--chk-on-fg: #262a00;--rng-track: #0a4a9a;--rng-fill: #19b0f2;--rng-thumb: #e8f03b;--rng-ts: none}[data-ui=fortnite2] .chip{clip-path:polygon(8px 0,100% 0,calc(100% - 8px) 100%,0 100%)}[data-ui=fortnite2] .bt-titlebar{clip-path:polygon(0 0,100% 0,calc(100% - 14px) 100%,0 100%)}[data-ui=fortnite2] .btn{padding-inline:1.2rem;font-size:1.05rem}[data-ui=fortnite2]{--slant: -14deg}[data-ui=fortnite2] :is(.btn:not(.btn-ghost),.bt-nav){isolation:isolate;background:transparent;border-color:transparent;box-shadow:none;transform-style:flat}[data-ui=fortnite2] :is(.btn:not(.btn-ghost):not(.absolute),.bt-nav){position:relative}[data-ui=fortnite2] .btn:not(.btn-ghost):is(:hover,:active){background:transparent;border-color:transparent;box-shadow:none}[data-ui=fortnite2] .bt-nav:is(:hover,[aria-current=page]){background:transparent;box-shadow:none}[data-ui=fortnite2] :is(.btn:not(.btn-ghost),.bt-nav):before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;transform:skew(var(--slant));border-radius:var(--ctl-r);transition:background-color var(--dur) var(--ease),border-color var(--dur) var(--ease),box-shadow var(--dur) var(--ease)}[data-ui=fortnite2] .btn:not(.btn-ghost):before{background:var(--btn-bg);border:var(--btn-border);box-shadow:var(--btn-shadow)}[data-ui=fortnite2] .btn:not(.btn-ghost):hover:not(:disabled):before{background:var(--btn-hover-bg);border-color:var(--btn-hover-border);box-shadow:var(--btn-hover-shadow)}[data-ui=fortnite2] .btn:not(.btn-ghost):active:not(:disabled):before{box-shadow:var(--btn-active-shadow)}[data-ui=fortnite2] .btn.btn-accent:before{background:var(--btn-accent-bg);border:var(--btn-accent-border);box-shadow:var(--btn-accent-shadow)}[data-ui=fortnite2] .btn.btn-accent:hover:not(:disabled):before{background:var(--btn-accent-hover-bg);border-color:var(--btn-accent-border-color, transparent);box-shadow:var(--btn-accent-hover-shadow)}[data-ui=fortnite2] .bt-nav:before{background:transparent;border:0;box-shadow:none}[data-ui=fortnite2] .bt-nav:hover:before{background:var(--nav-hover-bg)}[data-ui=fortnite2] .bt-nav[aria-current=page]:before{background:var(--nav-active-bg);box-shadow:var(--nav-active-shadow)}[data-ui=fortnite2] .btn:not(.btn-ghost){padding-inline:1.2rem}[data-ui=fortnite4]{--dur: .12s;--ease: cubic-bezier(.2, .9, .3, 1);--btn-weight: 800;--btn-border: 0 solid transparent;--ghost-hover-bg: hsl(var(--fg) / .14);--in-focus-shadow: none;--tb-border: 0 solid transparent;--tb-pad: .6rem 1.25rem;--tb-size: 1.35rem;--tb-weight: 900;--tb-justify: space-between;--close-hover-bg: rgb(0 0 0 / .18);--panel-tb-margin: 0 0 .5rem;--panel-tb-pad: 0;--chk-size: 1.2rem;--vote-ms: .38s;--rng-appearance: none;--rng-h: 8px;--rng-tw: 1rem;--rng-th: 1rem}html[data-ui=fortnite4]{font-size:14px}[data-ui=fortnite4]{text-transform:uppercase;letter-spacing:.02em;font-weight:700}[data-ui=fortnite4] :is(button,.btn,select,[role=menuitem],[role=option],h1,h2,h3,label,summary){text-transform:inherit;letter-spacing:inherit}[data-ui=fortnite4] :is(.input,input,textarea,code,pre,p,.font-mono,[contenteditable]){text-transform:none;letter-spacing:0}[data-ui=fortnite4] :is(h1,h2,h3,.bt-titlebar h2){font-family:var(--title-font);font-weight:800}[data-ui=fortnite4] .btn{font-weight:800;letter-spacing:.04em}[data-ui=fortnite4] .btn:hover:not(:disabled){transform:translateY(-1px)}[data-ui=fortnite4] .btn:active:not(:disabled){transform:translateY(1px)}[data-ui=fortnite4] .bt-titlebar svg{display:none}[data-ui=fortnite4] .btn.btn-accent{font-size:1rem}[data-ui=fortnite4]{--fn-weight: 700}[data-ui=fortnite4] :is(.font-light,.font-normal,.font-medium,.font-semibold,.bt-nav,.bt-tab,.chip,th,label,[role=menuitem],[role=option],.btn){font-weight:var(--fn-weight)}[data-ui=fortnite4] :is(.font-bold,.font-extrabold,h1,h2,h3,.bt-titlebar h2){font-weight:900}[data-ui=fortnite4]{--radius: 3px;--ctl-r: 3px;--card-r: 4px;--win-r: 4px;--menu-r: 3px;--nav-r: 3px;--chip-r: 3px;--in-r: 3px;--font: "Heading Now", Archivo, Montserrat, "Segoe UI", system-ui, sans-serif;--title-font: "Heading Now", Archivo, Montserrat, "Segoe UI", system-ui, sans-serif;--btn-weight: 700;--btn-bg: #3a4254;--btn-fg: #fff;--btn-border: 1px solid rgb(255 255 255 / .22);--btn-shadow: none;--btn-hover-bg: #4b5570;--btn-hover-border: rgb(255 255 255 / .5);--btn-active-shadow: none;--btn-active-transform: none;--btn-accent-bg: #ffe500;--btn-accent-fg: #000;--btn-accent-border: 1px solid #fff4a0;--btn-accent-border-color: #fff4a0;--btn-accent-shadow: none;--btn-accent-hover-bg: #fff04d;--btn-accent-hover-shadow: none;--in-bg: #161d3e;--in-border: 1px solid rgb(255 255 255 / .3);--in-hover-border: rgb(255 255 255 / .6);--in-focus-border: #fff;--card-bg: rgb(10 47 148 / .7);--card-border: 1px solid rgb(255 255 255 / .18);--card-shadow: none;--win-bg: #0b3bb0;--win-border: 1px solid rgb(255 255 255 / .35);--win-shadow: 0 24px 60px rgb(0 10 60 / .6);--dialog-anim: bt-pop .16s cubic-bezier(.2, .9, .3, 1);--tb-bg: #141a38;--tb-fg: #fff;--close-fg: #fff;--close-hover-fg: #fff;--bar-border: 1px solid rgb(255 255 255 / .15);--menu-bg: #141a38;--menu-border: 1px solid rgb(255 255 255 / .3);--pop-shadow: 0 12px 30px rgb(0 10 60 / .55);--menu-anim: bt-pop .12s cubic-bezier(.2, .9, .3, 1);--menu-hi-bg: #fff;--menu-hi-fg: #0a2a78;--side-bg: linear-gradient(to bottom, #0c40b8, #0a2f94);--top-bg: #141a38;--player-bg: #141a38;--player-shadow: none;--nav-hover-bg: rgb(255 255 255 / .14);--nav-active-bg: #fff;--nav-active-fg: #0a2a78;--nav-active-shadow: none;--row-hover: rgb(255 255 255 / .12);--row-current: rgb(255 255 255 / .2);--panel-tb-fg: #fff;--chk-border: 2px solid #fff;--chk-on-fg: #0a2a78;--rng-track: #161d3e;--rng-fill: #fff;--rng-thumb: #fff;--rng-ts: none}[data-ui=fortnite4]{--slant: -10deg}[data-ui=fortnite4] :is(.btn:not(.btn-ghost),.bt-nav){isolation:isolate;background:transparent;border-color:transparent;box-shadow:none;transform-style:flat}[data-ui=fortnite4] :is(.btn:not(.btn-ghost):not(.absolute),.bt-nav){position:relative}[data-ui=fortnite4] .btn:not(.btn-ghost):is(:hover,:active){background:transparent;border-color:transparent;box-shadow:none}[data-ui=fortnite4] .bt-nav:is(:hover,[aria-current=page]){background:transparent;box-shadow:none}[data-ui=fortnite4] :is(.btn:not(.btn-ghost),.bt-nav):before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;transform:skew(var(--slant));border-radius:var(--ctl-r);transition:background-color var(--dur) var(--ease),border-color var(--dur) var(--ease),box-shadow var(--dur) var(--ease)}[data-ui=fortnite4] .btn:not(.btn-ghost):before{background:var(--btn-bg);border:var(--btn-border);box-shadow:var(--btn-shadow)}[data-ui=fortnite4] .btn:not(.btn-ghost):hover:not(:disabled):before{background:var(--btn-hover-bg);border-color:var(--btn-hover-border);box-shadow:var(--btn-hover-shadow)}[data-ui=fortnite4] .btn:not(.btn-ghost):active:not(:disabled):before{box-shadow:var(--btn-active-shadow)}[data-ui=fortnite4] .btn.btn-accent:before{background:var(--btn-accent-bg);border:var(--btn-accent-border);box-shadow:var(--btn-accent-shadow)}[data-ui=fortnite4] .btn.btn-accent:hover:not(:disabled):before{background:var(--btn-accent-hover-bg);border-color:var(--btn-accent-border-color, transparent);box-shadow:var(--btn-accent-hover-shadow)}[data-ui=fortnite4] .bt-nav:before{background:transparent;border:0;box-shadow:none}[data-ui=fortnite4] .bt-nav:hover:before{background:var(--nav-hover-bg)}[data-ui=fortnite4] .bt-nav[aria-current=page]:before{background:var(--nav-active-bg);box-shadow:var(--nav-active-shadow)}[data-ui=fortnite4] .btn:not(.btn-ghost){padding-inline:1.2rem}[data-ui=fortnite4] .btn:not(.btn-ghost){font-size:.95rem}[data-ui=fortnite5]{--dur: .12s;--ease: cubic-bezier(.2, .9, .3, 1);--btn-weight: 800;--btn-border: 0 solid transparent;--ghost-hover-bg: hsl(var(--fg) / .14);--in-focus-shadow: none;--tb-border: 0 solid transparent;--tb-pad: .6rem 1.25rem;--tb-size: 1.35rem;--tb-weight: 900;--tb-justify: space-between;--close-hover-bg: rgb(0 0 0 / .18);--panel-tb-margin: 0 0 .5rem;--panel-tb-pad: 0;--chk-size: 1.2rem;--vote-ms: .38s;--rng-appearance: none;--rng-h: 8px;--rng-tw: 1rem;--rng-th: 1rem}html[data-ui=fortnite5]{font-size:14px}[data-ui=fortnite5]{text-transform:uppercase;letter-spacing:.02em;font-weight:700}[data-ui=fortnite5] :is(button,.btn,select,[role=menuitem],[role=option],h1,h2,h3,label,summary){text-transform:inherit;letter-spacing:inherit}[data-ui=fortnite5] :is(.input,input,textarea,code,pre,p,.font-mono,[contenteditable]){text-transform:none;letter-spacing:0}[data-ui=fortnite5] :is(h1,h2,h3,.bt-titlebar h2){font-family:var(--title-font);font-weight:800}[data-ui=fortnite5] .btn{font-weight:800;letter-spacing:.04em}[data-ui=fortnite5] .btn:hover:not(:disabled){transform:translateY(-1px)}[data-ui=fortnite5] .btn:active:not(:disabled){transform:translateY(1px)}[data-ui=fortnite5] :is(h1,h2,.bt-titlebar h2){font-style:italic}[data-ui=fortnite5] .bt-titlebar svg{display:none}[data-ui=fortnite5] .btn.btn-accent{font-size:1rem}[data-ui=fortnite5]{--fn-weight: 700}[data-ui=fortnite5] :is(.font-light,.font-normal,.font-medium,.font-semibold,.bt-nav,.bt-tab,.chip,th,label,[role=menuitem],[role=option],.btn){font-weight:var(--fn-weight)}[data-ui=fortnite5] :is(.font-bold,.font-extrabold,h1,h2,h3,.bt-titlebar h2){font-weight:900}[data-ui=fortnite5]{--radius: 8px;--ctl-r: 8px;--card-r: 10px;--win-r: 12px;--menu-r: 10px;--nav-r: 8px;--chip-r: 8px;--in-r: 8px;--font: "Heading Now", Archivo, Montserrat, "Segoe UI", system-ui, sans-serif;--title-font: "Heading Now", Archivo, Montserrat, "Segoe UI", system-ui, sans-serif;--btn-weight: 700;--btn-bg: #dfe2e8;--btn-fg: #12151c;--btn-shadow: none;--btn-hover-bg: #fff;--btn-active-shadow: none;--btn-active-transform: scale(.98);--btn-accent-bg: #ffee00;--btn-accent-fg: #000;--btn-accent-shadow: none;--btn-accent-hover-bg: #fff35c;--btn-accent-hover-shadow: none;--in-bg: rgb(255 255 255 / .08);--in-border: 1px solid rgb(255 255 255 / .16);--in-hover-border: rgb(255 255 255 / .4);--in-focus-border: #e6e9ef;--card-bg: rgb(20 24 34 / .78);--card-border: 1px solid rgb(255 255 255 / .1);--card-shadow: none;--win-bg: #171b26;--win-border: 1px solid rgb(255 255 255 / .14);--win-shadow: 0 24px 60px rgb(0 0 0 / .55);--dialog-anim: bt-pop .16s cubic-bezier(.2, .9, .3, 1);--tb-bg: transparent;--tb-fg: #fff;--close-fg: #a8aebb;--close-hover-fg: #fff;--bar-border: 1px solid rgb(255 255 255 / .1);--menu-bg: #1b2030;--menu-border: 1px solid rgb(255 255 255 / .14);--pop-shadow: 0 12px 30px rgb(0 0 0 / .5);--menu-anim: bt-pop .12s cubic-bezier(.2, .9, .3, 1);--menu-hi-bg: #e6e9ef;--menu-hi-fg: #12151c;--side-bg: rgb(14 17 25 / .82);--top-bg: rgb(14 17 25 / .82);--player-bg: rgb(20 24 34 / .92);--player-shadow: none;--nav-hover-bg: rgb(255 255 255 / .1);--nav-active-bg: #e6e9ef;--nav-active-fg: #12151c;--nav-active-shadow: none;--row-hover: rgb(255 255 255 / .08);--row-current: rgb(255 238 0 / .16);--panel-tb-fg: #fff;--chk-border: 2px solid #a8aebb;--chk-on-fg: #000;--rng-track: rgb(255 255 255 / .2);--rng-fill: #fff;--rng-thumb: #fff;--rng-ts: none}[data-ui=fortnite5] :is(.btn,.bt-nav,.chip,.bt-tab,.bt-close,.bt-row,.input,[role=menuitem],[role=option],a.card,button.card){outline:2px solid transparent;outline-offset:2px;transition:outline-color var(--dur) var(--ease),background-color var(--dur) var(--ease),color var(--dur) var(--ease)}[data-ui=fortnite5] :is(.btn,.bt-nav,.chip,.bt-tab,.bt-close,.bt-row,a.card,button.card):is(:hover,:focus-visible):not(:disabled){outline-color:#fff}[data-ui=fortnite5] .bt-row:is(:hover,:focus-visible){outline-offset:-2px}[data-ui=fortnite5] .input:is(:hover,:focus-visible){outline-color:#ffffffb3;outline-offset:1px}[data-ui=fortnite5] :is([role=menuitem],[role=option]):is(:hover,:focus-visible){outline:2px solid #fff;outline-offset:-3px}[data-ui=fortnite5] .bt-nav[aria-current=page]:hover{outline-color:#fff}[data-ui=fortnite5] .btn.btn-ghost{background:transparent;color:inherit}[data-ui=fortnite5] .btn.btn-ghost:hover{background:#ffffff1a}[data-ui=pipboy]{--radius: 0px;--ctl-r: 0px;--card-r: 0px;--win-r: 0px;--menu-r: 0px;--nav-r: 0px;--chip-r: 0px;--in-r: 0px;--font: "VT323", "Share Tech Mono", ui-monospace, monospace;--title-font: var(--font);--dur: 0ms;--ease: steps(2);--btn-bg: transparent;--btn-fg: hsl(var(--accent));--btn-weight: 400;--btn-border: 1px solid color-mix(in srgb, hsl(var(--accent)) 60%, transparent);--btn-shadow: none;--btn-hover-bg: hsl(var(--accent));--btn-hover-border: hsl(var(--accent));--btn-hover-shadow: none;--btn-active-shadow: inset 0 0 0 2px hsl(var(--bg));--btn-active-transform: none;--btn-accent-bg: hsl(var(--accent));--btn-accent-fg: hsl(var(--bg));--btn-accent-border: 1px solid hsl(var(--accent));--btn-accent-border-color: hsl(var(--accent));--btn-accent-shadow: none;--btn-accent-hover-bg: color-mix(in srgb, hsl(var(--accent)) 80%, white);--btn-accent-hover-shadow: none;--btn-accent-text-shadow: none;--ghost-hover-bg: color-mix(in srgb, hsl(var(--accent)) 16%, transparent);--in-bg: transparent;--in-border: 1px solid color-mix(in srgb, hsl(var(--accent)) 60%, transparent);--in-shadow: none;--in-hover-border: hsl(var(--accent));--in-focus-border: hsl(var(--accent));--in-focus-shadow: 0 0 6px color-mix(in srgb, hsl(var(--accent)) 70%, transparent);--in-px: .75rem;--card-bg: color-mix(in srgb, hsl(var(--accent)) 5%, hsl(var(--bg)));--card-border: 1px solid color-mix(in srgb, hsl(var(--accent)) 45%, transparent);--card-shadow: none;--backdrop: rgb(0 0 0 / .55);--win-bg: hsl(var(--bg));--win-border: 2px solid hsl(var(--accent));--win-shadow: 0 0 24px color-mix(in srgb, hsl(var(--accent)) 35%, transparent);--dialog-anim: bt-fade .12s steps(3);--tb-bg: hsl(var(--accent));--tb-fg: hsl(var(--bg));--tb-border: 0 solid transparent;--tb-pad: .6rem 1rem;--tb-size: 1.15rem;--tb-weight: 400;--tb-justify: space-between;--tb-text-shadow: none;--close-fg: hsl(var(--bg));--close-hover-bg: hsl(var(--bg));--close-hover-fg: hsl(var(--accent));--close-r: 0;--bar-border: 1px solid color-mix(in srgb, hsl(var(--accent)) 45%, transparent);--menu-bg: hsl(var(--bg));--menu-border: 1px solid hsl(var(--accent));--pop-shadow: 0 0 14px color-mix(in srgb, hsl(var(--accent)) 35%, transparent);--menu-anim: bt-fade .1s ease-out;--menu-hi-bg: hsl(var(--accent));--menu-hi-fg: hsl(var(--bg));--side-bg: hsl(var(--bg));--side-shadow: none;--top-bg: hsl(var(--bg));--top-shadow: none;--player-bg: hsl(var(--bg));--player-shadow: none;--nav-hover-bg: color-mix(in srgb, hsl(var(--accent)) 14%, transparent);--nav-active-bg: hsl(var(--accent));--nav-active-fg: hsl(var(--bg));--nav-active-shadow: none;--row-hover: color-mix(in srgb, hsl(var(--accent)) 16%, transparent);--row-current: color-mix(in srgb, hsl(var(--accent)) 30%, transparent);--panel-tb-fg: hsl(var(--accent));--panel-tb-margin: 0 0 .5rem;--panel-tb-pad: 0;--chk-size: 1.1rem;--chk-r: 0;--chk-border: 2px solid hsl(var(--accent));--chk-bg: transparent;--chk-hover-border: hsl(var(--accent));--chk-focus: 0 0 0 2px color-mix(in srgb, hsl(var(--accent)) 40%, transparent);--chk-on-bg: hsl(var(--accent));--chk-on-border: hsl(var(--accent));--chk-on-fg: hsl(var(--accent-fg));--chk-radio-on-bg: hsl(var(--accent));--chk-dot: hsl(var(--accent-fg));--rng-appearance: none;--rng-h: 6px;--rng-r: 0;--rng-track: color-mix(in srgb, hsl(var(--accent)) 25%, transparent);--rng-fill: hsl(var(--accent));--rng-tw: .9rem;--rng-th: .9rem;--rng-tr: 0;--rng-thumb: hsl(var(--accent));--rng-tb: 1px solid hsl(var(--accent));--rng-ts: 0 0 6px color-mix(in srgb, hsl(var(--accent)) 70%, transparent)}html[data-ui=pipboy]{font-size:17px}[data-ui=pipboy]{text-shadow:0 0 5px hsl(var(--accent) / .55);text-transform:uppercase;letter-spacing:.02em}[data-ui=pipboy] :is(input,textarea,code,pre){text-transform:none}[data-ui=pipboy] .bt-row:hover,[data-ui=pipboy] .bt-row:hover *,[data-ui=pipboy] .bt-nav[aria-current=page],[data-ui=pipboy] .bt-nav[aria-current=page] *,[data-ui=pipboy] .btn:hover:not(:disabled),[data-ui=pipboy] .btn:hover:not(:disabled) *,[data-ui=pipboy] .btn-accent,[data-ui=pipboy] .btn-accent *{color:hsl(var(--bg));text-shadow:none}[data-ui=pipboy] .bt-titlebar,[data-ui=pipboy] .bt-titlebar *,[data-ui=pipboy] .bt-menu [role=menuitem]:hover,[data-ui=pipboy] .bt-menu [role=option]:hover{text-shadow:none}[data-ui=pipboy] .chip{border:1px solid hsl(var(--accent) / .5);background:transparent;color:hsl(var(--accent))}html[data-ui=pipboy]:after{content:"";position:fixed;inset:0;z-index:9999;pointer-events:none;background:repeating-linear-gradient(to bottom,#0000 0 2px,#00000029 2px 3px),radial-gradient(ellipse at center,transparent 55%,rgb(0 0 0 / .45) 100%);mix-blend-mode:multiply}@media(prefers-reduced-motion:reduce){html[data-ui=pipboy]:after{background:none}}[data-ui=pipboy]{--page-in: none;--vote-ms: 0ms;--player-in: none;--player-out: none;--player-ms: 0ms;--pop-out: none;--pop-ms: 0ms}[data-ui=pipboy] *{scroll-behavior:auto!important}[data-ui=persona]{--radius: 0px;--ctl-r: 0px;--card-r: 0px;--win-r: 0px;--menu-r: 0px;--nav-r: 0px;--chip-r: 0px;--in-r: 0px;--font: Archivo, "Arial Narrow", system-ui, sans-serif;--title-font: Anton, "Barlow Condensed", Impact, sans-serif;--dur: .11s;--ease: cubic-bezier(.2, .9, .2, 1);--btn-bg: #000;--btn-fg: #fff;--btn-weight: 800;--btn-border: 2px solid #fff;--btn-shadow: 3px 3px 0 hsl(var(--accent));--btn-hover-bg: hsl(var(--accent));--btn-hover-border: #fff;--btn-hover-shadow: 3px 3px 0 #fff;--btn-active-shadow: 0 0 0 hsl(var(--accent));--btn-active-transform: translate(3px, 3px);--btn-accent-bg: hsl(var(--accent));--btn-accent-fg: #fff;--btn-accent-border: 2px solid #fff;--btn-accent-border-color: #fff;--btn-accent-shadow: 3px 3px 0 #000;--btn-accent-hover-bg: #fff;--btn-accent-hover-shadow: 3px 3px 0 #000;--btn-accent-text-shadow: none;--ghost-hover-bg: color-mix(in srgb, hsl(var(--accent)) 35%, transparent);--in-bg: #000;--in-border: 2px solid #fff;--in-shadow: none;--in-hover-border: hsl(var(--accent));--in-focus-border: hsl(var(--accent));--in-focus-shadow: 3px 3px 0 hsl(var(--accent));--in-px: .75rem;--card-bg: #101012;--card-border: 2px solid #fff;--card-shadow: 4px 4px 0 hsl(var(--accent));--backdrop: rgb(0 0 0 / .78);--win-bg: #0b0b0c;--win-border: 3px solid #fff;--win-shadow: 8px 8px 0 hsl(var(--accent));--dialog-anim: bt-pop .16s cubic-bezier(.2, .9, .2, 1);--tb-bg: hsl(var(--accent));--tb-fg: #fff;--tb-border: 0 solid transparent;--tb-pad: .5rem 1.1rem;--tb-size: 1.5rem;--tb-weight: 400;--tb-justify: space-between;--tb-text-shadow: none;--close-fg: #fff;--close-hover-bg: #000;--close-hover-fg: #fff;--close-r: 0;--bar-border: 2px solid #fff;--menu-bg: #000;--menu-border: 2px solid #fff;--pop-shadow: 5px 5px 0 hsl(var(--accent));--menu-anim: bt-drop .11s ease-out;--menu-hi-bg: hsl(var(--accent));--menu-hi-fg: #fff;--side-bg: #000;--side-shadow: none;--top-bg: #000;--top-shadow: none;--player-bg: #000;--player-shadow: none;--nav-hover-bg: color-mix(in srgb, hsl(var(--accent)) 30%, transparent);--nav-active-bg: hsl(var(--accent));--nav-active-fg: #fff;--nav-active-shadow: inset 6px 0 0 #fff;--row-hover: color-mix(in srgb, hsl(var(--accent)) 28%, transparent);--row-current: color-mix(in srgb, hsl(var(--accent)) 55%, transparent);--panel-tb-fg: #fff;--panel-tb-margin: 0 0 .5rem;--panel-tb-pad: 0;--chk-size: 1.1rem;--chk-r: 0;--chk-border: 2px solid #fff;--chk-bg: #000;--chk-hover-border: hsl(var(--accent));--chk-focus: 0 0 0 2px color-mix(in srgb, hsl(var(--accent)) 40%, transparent);--chk-on-bg: hsl(var(--accent));--chk-on-border: hsl(var(--accent));--chk-on-fg: hsl(var(--accent-fg));--chk-radio-on-bg: hsl(var(--accent));--chk-dot: hsl(var(--accent-fg));--rng-appearance: none;--rng-h: 4px;--rng-r: 0;--rng-track: #333;--rng-fill: hsl(var(--accent));--rng-tw: .9rem;--rng-th: .9rem;--rng-tr: 0;--rng-thumb: hsl(var(--accent));--rng-tb: 2px solid #fff;--rng-ts: 2px 2px 0 hsl(var(--accent))}[data-ui=persona] :is(h1,h2,h3,.bt-brand,.bt-titlebar h2,.bt-panel-title){font-family:var(--title-font);text-transform:uppercase;font-weight:400;font-style:italic;letter-spacing:.03em}[data-ui=persona] h1{font-size:2.4rem;text-shadow:3px 3px 0 hsl(var(--accent))}[data-ui=persona] :is(.btn,.bt-nav,.chip){text-transform:uppercase;letter-spacing:.03em}[data-ui=persona] .btn{font-style:italic}[data-ui=persona] .chip{background:#fff;color:#000;font-weight:700}[data-ui=persona] .bt-nav{font-style:italic;font-weight:800;color:#fff}[data-ui=persona] .bt-row:hover,[data-ui=persona] .bt-row-current{outline:2px solid #fff;outline-offset:-2px}[data-ui=persona]{--page-in: bt-fade .11s linear backwards;--vote-ms: .26s}[data-ui=gameboy]{--radius: 0px;--ctl-r: 0px;--card-r: 0px;--win-r: 0px;--menu-r: 0px;--nav-r: 0px;--chip-r: 0px;--in-r: 0px;--font: "Press Start 2P", "VT323", ui-monospace, monospace;--title-font: var(--font);--dur: 0ms;--ease: steps(2);--btn-bg: hsl(var(--surface));--btn-fg: hsl(var(--fg));--btn-weight: 400;--btn-border: 2px solid hsl(var(--fg));--btn-shadow: 3px 3px 0 hsl(var(--accent));--btn-hover-bg: hsl(var(--fg));--btn-hover-border: hsl(var(--fg));--btn-hover-shadow: 3px 3px 0 hsl(var(--accent));--btn-active-shadow: none;--btn-active-transform: translate(3px, 3px);--btn-accent-bg: hsl(var(--fg));--btn-accent-fg: hsl(var(--bg));--btn-accent-border: 2px solid hsl(var(--fg));--btn-accent-border-color: hsl(var(--fg));--btn-accent-shadow: 3px 3px 0 hsl(var(--accent));--btn-accent-hover-bg: hsl(var(--accent));--btn-accent-hover-shadow: 3px 3px 0 hsl(var(--fg));--btn-accent-text-shadow: none;--ghost-hover-bg: color-mix(in srgb, hsl(var(--fg)) 15%, transparent);--in-bg: hsl(var(--bg));--in-border: 2px solid hsl(var(--fg));--in-shadow: none;--in-hover-border: hsl(var(--fg));--in-focus-border: hsl(var(--fg));--in-focus-shadow: 3px 3px 0 hsl(var(--accent));--in-px: .75rem;--card-bg: hsl(var(--surface));--card-border: 2px solid hsl(var(--fg));--card-shadow: 3px 3px 0 hsl(var(--accent));--backdrop: color-mix(in srgb, hsl(var(--fg)) 55%, transparent);--win-bg: hsl(var(--bg));--win-border: 3px solid hsl(var(--fg));--win-shadow: 6px 6px 0 hsl(var(--accent));--dialog-anim: none;--tb-bg: hsl(var(--fg));--tb-fg: hsl(var(--bg));--tb-border: 0 solid transparent;--tb-pad: .6rem .9rem;--tb-size: .75rem;--tb-weight: 400;--tb-justify: space-between;--tb-text-shadow: none;--close-fg: hsl(var(--bg));--close-hover-bg: hsl(var(--bg));--close-hover-fg: hsl(var(--fg));--close-r: 0;--bar-border: 2px solid hsl(var(--fg));--menu-bg: hsl(var(--bg));--menu-border: 2px solid hsl(var(--fg));--pop-shadow: 4px 4px 0 hsl(var(--accent));--menu-anim: none;--menu-hi-bg: hsl(var(--fg));--menu-hi-fg: hsl(var(--bg));--side-bg: hsl(var(--surface));--side-shadow: none;--top-bg: hsl(var(--surface));--top-shadow: none;--player-bg: hsl(var(--surface));--player-shadow: none;--nav-hover-bg: color-mix(in srgb, hsl(var(--fg)) 12%, transparent);--nav-active-bg: hsl(var(--fg));--nav-active-fg: hsl(var(--bg));--nav-active-shadow: none;--row-hover: color-mix(in srgb, hsl(var(--fg)) 16%, transparent);--row-current: color-mix(in srgb, hsl(var(--fg)) 30%, transparent);--panel-tb-fg: hsl(var(--fg));--panel-tb-margin: 0 0 .5rem;--panel-tb-pad: 0;--chk-size: 1.1rem;--chk-r: 0;--chk-border: 2px solid hsl(var(--fg));--chk-bg: hsl(var(--bg));--chk-hover-border: hsl(var(--accent));--chk-focus: 0 0 0 2px color-mix(in srgb, hsl(var(--accent)) 40%, transparent);--chk-on-bg: hsl(var(--fg));--chk-on-border: hsl(var(--fg));--chk-on-fg: hsl(var(--bg));--chk-radio-on-bg: hsl(var(--fg));--chk-dot: hsl(var(--bg));--rng-appearance: none;--rng-h: 6px;--rng-r: 0;--rng-track: color-mix(in srgb, hsl(var(--fg)) 25%, transparent);--rng-fill: hsl(var(--fg));--rng-tw: .9rem;--rng-th: .9rem;--rng-tr: 0;--rng-thumb: hsl(var(--fg));--rng-tb: 2px solid hsl(var(--bg));--rng-ts: none}html[data-ui=gameboy]{font-size:10px;line-height:1.7}[data-ui=gameboy] :is(h1,h2,h3,.bt-brand){font-weight:400;line-height:1.5}[data-ui=gameboy] h1{font-size:1.5rem}[data-ui=gameboy] .bt-row:hover,[data-ui=gameboy] .bt-row:hover *,[data-ui=gameboy] .bt-nav[aria-current=page],[data-ui=gameboy] .bt-nav[aria-current=page] *,[data-ui=gameboy] .btn:hover:not(:disabled),[data-ui=gameboy] .btn:hover:not(:disabled) *{color:hsl(var(--bg))}[data-ui=gameboy] .text-muted,[data-ui=gameboy] .chip{color:hsl(var(--accent))}[data-ui=gameboy] .chip{border:2px solid hsl(var(--accent));background:transparent}[data-ui=gameboy] :is(img,canvas,.bt-cover){image-rendering:pixelated;filter:grayscale(1) contrast(1.15) sepia(.7) hue-rotate(40deg) saturate(1.6)}[data-ui=gameboy]{--page-in: none;--vote-ms: 0ms;--player-in: none;--player-out: none;--player-ms: 0ms;--pop-out: none;--pop-ms: 0ms}[data-ui=gameboy] *{scroll-behavior:auto!important}[data-ui=zune]{--radius: 0px;--ctl-r: 0px;--card-r: 0px;--win-r: 0px;--menu-r: 0px;--nav-r: 0px;--chip-r: 0px;--in-r: 0px;--font: "Segoe UI", "Open Sans", system-ui, sans-serif;--title-font: "Segoe UI Light", "Segoe UI", "Open Sans", system-ui, sans-serif;--dur: .18s;--ease: cubic-bezier(.1, .9, .2, 1);--btn-bg: transparent;--btn-fg: hsl(var(--fg));--btn-weight: 400;--btn-border: 2px solid color-mix(in srgb, hsl(var(--fg)) 70%, transparent);--btn-shadow: none;--btn-hover-bg: color-mix(in srgb, hsl(var(--fg)) 16%, transparent);--btn-hover-border: hsl(var(--fg));--btn-hover-shadow: none;--btn-active-shadow: none;--btn-active-transform: scale(.97);--btn-accent-bg: hsl(var(--accent));--btn-accent-fg: hsl(var(--accent-fg));--btn-accent-border: 2px solid hsl(var(--accent));--btn-accent-border-color: hsl(var(--accent));--btn-accent-shadow: none;--btn-accent-hover-bg: color-mix(in srgb, hsl(var(--accent)) 88%, white);--btn-accent-hover-shadow: none;--btn-accent-text-shadow: none;--ghost-hover-bg: color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--in-bg: color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--in-border: 2px solid transparent;--in-shadow: none;--in-hover-border: color-mix(in srgb, hsl(var(--fg)) 60%, transparent);--in-focus-border: hsl(var(--accent));--in-focus-shadow: none;--in-px: .75rem;--card-bg: transparent;--card-border: 0 solid transparent;--card-shadow: none;--backdrop: rgb(0 0 0 / .7);--win-bg: hsl(var(--surface));--win-border: 0 solid transparent;--win-shadow: 0 20px 60px rgb(0 0 0 / .7);--dialog-anim: bt-fade .2s ease-out;--tb-bg: transparent;--tb-fg: hsl(var(--fg));--tb-border: 0 solid transparent;--tb-pad: 1rem 1.4rem .4rem;--tb-size: 2rem;--tb-weight: 300;--tb-justify: space-between;--tb-text-shadow: none;--close-fg: hsl(var(--fg));--close-hover-bg: color-mix(in srgb, hsl(var(--fg)) 15%, transparent);--close-hover-fg: hsl(var(--fg));--close-r: 0;--bar-border: 0 solid transparent;--menu-bg: hsl(var(--surface));--menu-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 30%, transparent);--pop-shadow: 0 8px 24px rgb(0 0 0 / .6);--menu-anim: bt-fade .1s ease-out;--menu-hi-bg: hsl(var(--accent));--menu-hi-fg: hsl(var(--accent-fg));--side-bg: transparent;--side-shadow: none;--top-bg: transparent;--top-shadow: none;--player-bg: hsl(var(--surface));--player-shadow: none;--nav-hover-bg: transparent;--nav-active-bg: transparent;--nav-active-fg: hsl(var(--accent));--nav-active-shadow: none;--row-hover: color-mix(in srgb, hsl(var(--fg)) 10%, transparent);--row-current: color-mix(in srgb, hsl(var(--accent)) 26%, transparent);--panel-tb-fg: hsl(var(--accent));--panel-tb-margin: 0 0 .5rem;--panel-tb-pad: 0;--chk-size: 1.1rem;--chk-r: 0;--chk-border: 2px solid color-mix(in srgb, hsl(var(--fg)) 70%, transparent);--chk-bg: transparent;--chk-hover-border: hsl(var(--accent));--chk-focus: 0 0 0 2px color-mix(in srgb, hsl(var(--accent)) 40%, transparent);--chk-on-bg: hsl(var(--accent));--chk-on-border: hsl(var(--accent));--chk-on-fg: hsl(var(--accent-fg));--chk-radio-on-bg: hsl(var(--accent));--chk-dot: hsl(var(--accent-fg));--rng-appearance: none;--rng-h: 3px;--rng-r: 0;--rng-track: color-mix(in srgb, hsl(var(--fg)) 28%, transparent);--rng-fill: hsl(var(--accent));--rng-tw: .5rem;--rng-th: 1.5rem;--rng-tr: 0;--rng-thumb: hsl(var(--fg));--rng-tb: 0 solid transparent;--rng-ts: none}[data-ui=zune] :is(h1,h2,h3,.bt-brand,.bt-titlebar h2,.bt-panel-title){font-family:var(--title-font);font-weight:300;text-transform:lowercase;letter-spacing:-.01em}[data-ui=zune] h1{font-size:3rem;line-height:1;margin-bottom:.5rem}[data-ui=zune] h2{font-size:1.6rem}[data-ui=zune] .bt-nav{font-family:var(--title-font);font-weight:300;font-size:1.15rem;text-transform:lowercase;padding-top:.3rem;padding-bottom:.3rem;color:hsl(var(--muted))}[data-ui=zune] .bt-nav[aria-current=page]{color:hsl(var(--accent))}[data-ui=zune] .btn{text-transform:lowercase}[data-ui=zune] .card{background:hsl(var(--raised) / .55)}[data-ui=zune] .bt-cover{border-radius:0}[data-ui=zune]{--page-in: bt-fade .22s ease-out backwards}[data-ui=cyber]{--radius: 0px;--ctl-r: 0px;--card-r: 0px;--win-r: 0px;--menu-r: 0px;--nav-r: 0px;--chip-r: 0px;--in-r: 0px;--font: "Barlow Condensed", "Rajdhani", "Arial Narrow", system-ui, sans-serif;--title-font: var(--font);--dur: .1s;--ease: steps(3);--btn-bg: hsl(var(--raised));--btn-fg: hsl(var(--fg));--btn-weight: 600;--btn-border: 0 solid transparent;--btn-shadow: inset 3px 0 0 hsl(var(--accent));--btn-hover-bg: hsl(var(--accent));--btn-hover-border: transparent;--btn-hover-shadow: none;--btn-active-shadow: inset 0 0 0 2px #000;--btn-active-transform: none;--btn-accent-bg: hsl(var(--accent));--btn-accent-fg: #000;--btn-accent-border: 0 solid transparent;--btn-accent-border-color: transparent;--btn-accent-shadow: none;--btn-accent-hover-bg: #fff;--btn-accent-hover-shadow: none;--btn-accent-text-shadow: none;--ghost-hover-bg: color-mix(in srgb, hsl(var(--accent)) 16%, transparent);--in-bg: color-mix(in srgb, hsl(var(--fg)) 8%, transparent);--in-border: 1px solid color-mix(in srgb, hsl(var(--accent)) 45%, transparent);--in-shadow: none;--in-hover-border: hsl(var(--accent));--in-focus-border: hsl(var(--accent));--in-focus-shadow: inset 0 -2px 0 hsl(var(--accent));--in-px: .75rem;--card-bg: hsl(var(--surface));--card-border: 1px solid color-mix(in srgb, hsl(var(--accent)) 40%, transparent);--card-shadow: none;--backdrop: rgb(0 0 0 / .75);--win-bg: hsl(var(--bg));--win-border: 1px solid hsl(var(--accent));--win-shadow: 0 0 30px color-mix(in srgb, hsl(var(--accent)) 20%, transparent);--dialog-anim: bt-fade .12s steps(4);--tb-bg: hsl(var(--accent));--tb-fg: #000;--tb-border: 0 solid transparent;--tb-pad: .45rem 1rem;--tb-size: 1.15rem;--tb-weight: 700;--tb-justify: space-between;--tb-text-shadow: none;--close-fg: #000;--close-hover-bg: #000;--close-hover-fg: hsl(var(--accent));--close-r: 0;--bar-border: 1px solid color-mix(in srgb, hsl(var(--accent)) 35%, transparent);--menu-bg: hsl(var(--bg));--menu-border: 1px solid hsl(var(--accent));--pop-shadow: 0 0 18px color-mix(in srgb, hsl(var(--accent)) 22%, transparent);--menu-anim: bt-fade .1s ease-out;--menu-hi-bg: hsl(var(--accent));--menu-hi-fg: #000;--side-bg: hsl(var(--bg));--side-shadow: none;--top-bg: hsl(var(--bg));--top-shadow: none;--player-bg: hsl(var(--bg));--player-shadow: none;--nav-hover-bg: color-mix(in srgb, hsl(var(--accent)) 16%, transparent);--nav-active-bg: hsl(var(--accent));--nav-active-fg: #000;--nav-active-shadow: none;--row-hover: color-mix(in srgb, hsl(var(--accent)) 14%, transparent);--row-current: color-mix(in srgb, hsl(var(--accent)) 28%, transparent);--panel-tb-fg: hsl(var(--accent));--panel-tb-margin: 0 0 .5rem;--panel-tb-pad: 0;--chk-size: 1.1rem;--chk-r: 0;--chk-border: 2px solid hsl(var(--accent));--chk-bg: transparent;--chk-hover-border: hsl(var(--accent));--chk-focus: 0 0 0 2px color-mix(in srgb, hsl(var(--accent)) 40%, transparent);--chk-on-bg: hsl(var(--accent));--chk-on-border: hsl(var(--accent));--chk-on-fg: #000;--chk-radio-on-bg: hsl(var(--accent));--chk-dot: #000;--rng-appearance: none;--rng-h: 4px;--rng-r: 0;--rng-track: color-mix(in srgb, hsl(var(--fg)) 22%, transparent);--rng-fill: hsl(var(--accent));--rng-tw: .9rem;--rng-th: .9rem;--rng-tr: 0;--rng-thumb: hsl(var(--accent));--rng-tb: 2px solid hsl(var(--bg));--rng-ts: none}[data-ui=cyber] :is(h1,h2,h3,.bt-brand,.bt-titlebar h2,.bt-panel-title,.btn,.bt-nav,.chip,th){text-transform:uppercase;letter-spacing:.06em}[data-ui=cyber] h1{font-size:2.1rem;font-weight:700;color:hsl(var(--accent))}[data-ui=cyber] .btn,[data-ui=cyber] .card,[data-ui=cyber] .bt-nav,[data-ui=cyber] .bt-window,[data-ui=cyber] .bt-menu{clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px))}[data-ui=cyber] .card,[data-ui=cyber] .bt-window,[data-ui=cyber] .bt-menu{clip-path:polygon(0 0,calc(100% - 14px) 0,100% 14px,100% 100%,14px 100%,0 calc(100% - 14px))}[data-ui=cyber] .btn:hover:not(:disabled),[data-ui=cyber] .btn:hover:not(:disabled) *{color:#000}[data-ui=cyber] .chip{background:transparent;border:1px solid hsl(180 100% 50% / .6);color:#1affff}[data-ui=cyber] .bt-row:hover,[data-ui=cyber] .bt-row-current{box-shadow:inset 3px 0 hsl(var(--accent))}[data-ui=cyber]{--page-in: bt-fade .11s linear backwards;--vote-ms: .26s}[data-ui=blocky]{--page-in: none;--vote-ms: 0ms;--player-in: none;--player-out: none;--player-ms: 0ms;--pop-out: none;--pop-ms: 0ms}[data-ui=blocky] *{scroll-behavior:auto!important}[data-ui=blocky]{--radius: 0px;--ctl-r: 0px;--card-r: 0px;--win-r: 0px;--menu-r: 0px;--nav-r: 0px;--chip-r: 0px;--in-r: 0px;--font: "Minecraft", "Pixelify Sans", ui-monospace, monospace;--title-font: var(--font);--dur: 0ms;--ease: steps(1);--mc-light: #d0d1d4;--mc-edge: #1e1e1f;--mc-low: #58585a;--mc-green: #3c8527;--btn-bg: var(--mc-light);--btn-fg: #1e1e1f;--btn-weight: 500;--btn-border: 2px solid var(--mc-edge);--btn-shadow: inset 0 -4px 0 #8c8d90;--btn-hover-bg: #e6e7ea;--btn-hover-border: var(--mc-edge);--btn-hover-shadow: inset 0 -4px 0 #9a9b9e;--btn-active-shadow: inset 0 4px 0 #8c8d90;--btn-active-transform: none;--btn-accent-bg: var(--mc-green);--btn-accent-fg: #fff;--btn-accent-border: 2px solid var(--mc-edge);--btn-accent-border-color: var(--mc-edge);--btn-accent-shadow: inset 0 -4px 0 #1d4d12, inset 0 3px 0 rgb(255 255 255 / .28);--btn-accent-hover-bg: #4a9a33;--btn-accent-hover-shadow: inset 0 -4px 0 #1d4d12, inset 0 3px 0 rgb(255 255 255 / .35);--btn-accent-text-shadow: 2px 2px 0 #1d4d12;--ghost-hover-bg: rgb(255 255 255 / .1);--in-bg: #1e1e1f;--in-border: 2px solid #8c8d90;--in-shadow: none;--in-hover-border: #fff;--in-focus-border: #fff;--in-focus-shadow: none;--in-px: .75rem;--card-bg: hsl(var(--surface));--card-border: 2px solid var(--mc-edge);--card-shadow: none;--backdrop: rgb(0 0 0 / .6);--win-bg: hsl(var(--surface));--win-border: 2px solid var(--mc-edge);--win-shadow: 6px 6px 0 rgb(0 0 0 / .45);--dialog-anim: none;--tb-bg: #e6e8eb;--tb-fg: #1e1e1f;--tb-border: 0 solid transparent;--tb-pad: .6rem 1rem;--tb-size: 1.15rem;--tb-weight: 700;--tb-justify: space-between;--tb-text-shadow: none;--close-fg: #1e1e1f;--close-hover-bg: #c4c6c9;--close-hover-fg: #000;--close-r: 0;--bar-border: 2px solid var(--mc-edge);--menu-bg: hsl(var(--surface));--menu-border: 2px solid var(--mc-edge);--pop-shadow: 4px 4px 0 rgb(0 0 0 / .45);--menu-anim: none;--menu-hi-bg: hsl(var(--accent));--menu-hi-fg: #fff;--side-bg: #323435;--side-shadow: none;--top-bg: #e6e8eb;--top-shadow: inset 0 -3px 0 #b3b5b8;--player-bg: #323435;--player-shadow: inset 0 3px 0 #1e1e1f;--nav-hover-bg: #3d3f40;--nav-active-bg: #484a4b;--nav-active-fg: #fff;--nav-active-shadow: inset 0 0 0 2px #1e1e1f;--row-hover: rgb(255 255 255 / .07);--row-current: rgb(60 133 39 / .35);--panel-tb-fg: #fff;--panel-tb-margin: 0 0 .5rem;--panel-tb-pad: 0;--chk-size: 1.1rem;--chk-r: 0;--chk-border: 2px solid var(--mc-edge);--chk-bg: #8c8d90;--chk-hover-border: #fff;--chk-focus: 0 0 0 2px #fff;--chk-on-bg: var(--mc-green);--chk-on-border: var(--mc-edge);--chk-on-fg: #fff;--chk-radio-on-bg: var(--mc-green);--chk-dot: #fff;--rng-appearance: none;--rng-h: 8px;--rng-r: 0;--rng-track: #8c8d90;--rng-fill: var(--mc-green);--rng-border: 2px solid var(--mc-edge);--rng-tw: 1rem;--rng-th: 1.5rem;--rng-tr: 0;--rng-thumb: var(--mc-light);--rng-tb: 2px solid var(--mc-edge);--rng-ts: inset 0 -3px 0 #8c8d90}html[data-ui=blocky]{font-size:16px;-webkit-font-smoothing:none;font-smooth:never;text-rendering:optimizeSpeed}[data-ui=blocky] :is(h1,h2,h3,.bt-brand,.bt-panel-title,b,strong,.font-semibold,.font-bold){-webkit-text-stroke:.4px currentColor}[data-ui=blocky] :is(h1,h2,h3,.bt-brand,.bt-panel-title){font-weight:700;letter-spacing:.02em}[data-ui=blocky] main h1{text-transform:uppercase}[data-ui=blocky] .btn-ghost{background:transparent;color:hsl(var(--fg));box-shadow:none;border-color:transparent}[data-ui=blocky] .btn-ghost:hover:not(:disabled){background:#ffffff1a}[data-ui=blocky] .bt-top{color:#1e1e1f;--fg: 0 0% 12%;--muted: 0 0% 32%}[data-ui=blocky] .bt-top .input{background:#fff;color:#1e1e1f;border-color:#1e1e1f}[data-ui=blocky] .bt-top .input::placeholder{color:#6b6c6e}[data-ui=blocky] .bt-top .btn-ghost{color:#1e1e1f}[data-ui=blocky] .bt-side .bt-nav{color:#e8e9eb}[data-ui=blocky] .bt-side .bt-nav svg{image-rendering:pixelated}[data-ui=blocky] .bt-brand{color:#fff}[data-ui=blocky] .card.overflow-hidden>div+div,[data-ui=blocky] .divide-y>:not([hidden])~:not([hidden]){border-color:#313233;border-top-width:2px}[data-ui=blocky] .chip{background:#313233;color:#fff;border:2px solid var(--mc-edge);box-shadow:none}[data-ui=blocky] :is(img,.bt-cover){image-rendering:pixelated}[data-ui=blocky] .bt-cover{box-shadow:0 0 0 2px var(--mc-edge);border-radius:0}[data-ui=blocky] ::selection{background:var(--mc-green);color:#fff}[data-ui=blocky] input[type=checkbox]{width:2.7rem;height:1.35rem;position:relative;overflow:hidden;background:#6b6c6e;box-shadow:inset 0 -3px #0000004d;transition:background-color .18s steps(3,end)}[data-ui=blocky] input[type=checkbox]:checked{background:#3c8527}[data-ui=blocky] input[type=checkbox]:before{content:"";position:absolute;top:0;bottom:0;left:0;width:50%;background:#d0d1d4;box-shadow:inset 0 -3px #0000002e;transform:translate(0);transition:transform .42s cubic-bezier(.3,1.9,.5,1)}[data-ui=blocky] input[type=checkbox]:checked:before{transform:translate(100%)}@media(prefers-reduced-motion:reduce){[data-ui=blocky] input[type=checkbox]:before{transition:none}}[data-ui=blocky] input[type=checkbox]:after,[data-ui=blocky] input[type=checkbox]:checked:after{-webkit-mask:none;mask:none;background:none;transform:none;inset:0;display:grid;place-items:center;font-size:.7rem;font-weight:700;line-height:1}[data-ui=blocky] input[type=checkbox]:after{content:"O";color:#1e1e1f;padding-left:50%}[data-ui=blocky] input[type=checkbox]:checked:after{content:"I";color:#fff;padding-left:0;padding-right:50%}[data-ui=blocky] .bt-titlebar svg{display:none}@font-face{font-family:Minecraft;src:url(data:font/woff2;base64,d09GMgABAAAAAAsoAA0AAAAAKgAAAArOAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP0ZGVE0cGh4GYACDGhEICrgApgUBNgIkA4M2C4FeAAQgBY09B4INGzofIxEmdSxH9p8gkyEGrHW/pDRtkhDRgCiRCA0OARzAGXdWBuA9FLuGC3xh0AEC32/3vtfF6D84BswBAkAAACAevsb+d+7u/Y6YZrHphESoapVhEbNozZsnPImGDs0Sz6K5f2eOktze5gpIjsAD530CrKyqMhW6ylT5R/Qx9lustE/oPyMaipZAslB4NySSaPfpKjnxBueFPuKQS24/0vO2zlJQ6QMX4DD1U8B+71JTaAj6gGT3CgtzaSnNdkpzxvJY0hZpnzRyYewKZHdZbo6f4BHjVf9fvsHJEpt739ynbYoo9JYUCdNqEL6qQl8WZi+ZbHJUAp7d/++6SQFA4fOkAECiqgRhCFSFrZHdl7negmvAcT5cBRUqlBBDKBHH//uFEMAH3voBb8Z2/cdPSjAIjEFBNIsRTrsilDLOPya4Mqrr/HlXLbDAeyAFgzeqR1nxfWMNg6dNtq1DNttVBVDa2BGnTUyNcJLqxHnk5O2lDTDBMFUEg7X447eb7njum4yzTv+53C8d6HTGqWeNtt+v9w/v3zUygCknGM+Aq4b36lD/AYB1PhRlFSVpnY8EIMKEMi6k0sY6H4RRnKRZXpRV3bRdP4zTvKzbfpzX/bxfsT8YjsaT6ezi8ur65vbu/mG+WD4+Pb+8vr1/fK6+SPmDMI71R6DGoIBhdbqJSV4rNcRmZqtajWU76SZzd/lPKYiz9Nyg9yWFw7amS8MS9u0VSuSbUS57DAqWi+wevSkW0eKBY9g099Btuc4V2oyRgY3khbFWZQ88NCbot80MOlvofGOzJL7xRqWjz+T70UHCgclgpOOCNoWbdaE3nYtADSA5mj5DWboUMkxZArWyy6ULwjUpdWaZogsrOA3HIUQ446p5LIw2i8ry4xAVlTn8eHsUR0nSnbXE8KXqk6VrJl0gCCRkqTvbtRMZ6Bs37dj11YcZMcyEVvyI8ffMl83iaHdQ0Hhx3oqR6BLjjOiwkcKBSrcUhKpjifZWysSMqEXBEHWwqoAhFKi/ELSKGVJzLQU8BsNrSygkBHP6yB+MYbiabMSMZXUSNByDUZtpY2NoaCTtmS7YwPqKgR8naU2En61IBV6TDMV8G0+SUNipG/D0UCmPETcFhV6LwnhqFWSSEiQeJBX6qYAq3bqcdLMyC722tuPjIjWYLrFkM2rFI+qTai9AbDxEpkh7Sog1G86khqFHUXxiCMb02kGSH+rGbEZdUYCgzyjDoPpnp4wlR9ph6msRBwcV6opzXlzLqhErzgb2mF4jRJ9cQcWw02avFBmJJMEc0h7qxp0YDR/jmexGWccefvZJJXtJsjUxUt2kznkYzoNQE0nxl49BTHFNZY8yGXpkQxF9tZjVpJymFKsN2VHrjBQCEdPpdjqwdVacV+0lW0okN00mTYGbZsVpcBdE2SvuMwIRZGN9aGaG9qRtkiBCVLFGqh9EogA2bkm2SyEuiKleAsVg9SXTHHXfUCistCVtiBapmQ0LlGMVGdpv4vUZ6hM1+P5H4E5GDIW3NBExmGYJeTDDZENWA2MJQL0WuJL98xhFB1mfnDFngUaZGpcTcZHwg2JfxFDxz03MLnMPMIbE0599R+lF2h9C08YulnSvhYSWFfPTL1x7RczuCWYtzU7UrEtqyYJghGjn9lNhidT0Wg6ksLjUaxe8mly6qY7P84WaZEyK4EwRk34NOMmpWxWwzIgGVpHsN0anOIXgYEuY84lQhi95o9Sy5qVJXikZnSRFwXFLMfDiqH5GftUHRdIQkVOEpl+3xODbV9C2jP6sikQpO2hFP2N/7mOQipmgNjpSxOBPMSDjkQpVwVa87QwwWhNCJZFbGhDSeMzG8wUfVgA1PoYeveK/vcOjw8HdqcltxXdF8NyD+xOHMwdXpoaLBwktqU6L8Cp27yepEgVnqZZKiULDur71dSPeYdeJKBl9KYBECX7fKlJpLJLqNlogmVNxsa5qipkIDeCmBPllaUDdp+cTe8rU2Ox6gakuL0VC7WZXiRGxo+6vRKauYGgVFjEhN22b3Al1jF4S9HJDeI57mKYah6Zd0aLJZbSAMrNyJmlz6gwCqWq5UU1Gvon00nSAkmwNrXLF0Gr7RIbHtET7nKAqMEBAZKrygpFysgr1CW1C0g6p1rCvuh27PZLh+9k0tLZIok5JlXXO7gAl70GMfNccPKYePEduZ4lKmy70C0sqipTyh3WfKwdxjl1nBdQnjeVS1uNEefC5CGpDOrUiC+1URg3yxLExLUAbF8A3UYdSvsjnm21fxYPnin6FFnjo4Dx5PeiiYmm8AlU5RdVPrJ7ka+MxorWGVhvQkoXclO5ix7T4FMQ5gfodr8l5zZfmhj6hneJSdSI36gervM6gMz1Y6y2tAyWaRhezBavJyGYB5LThU85RnnodwXS7ri4H+UsEpfCRetFu7qij7kBePd7KU40OEtIfPkcnhLzbhmyt/oC8c6xIkoURB9ii33A44I1JPrI5byLbLfSV4wySiP7KuBe/SH9+9ZskgA9/9zzE1+iki2vo/ZPZnw/I1qGr8Z/3J8cDb+JBBeLGohqJS15TkLbiBvE0RNMG3m7WVmxLFph62bBsDUQ0jY3S3MXSTOuNUxQFu/lmMxce0q4sFYUK2ukiNmNoEPjT8PIwLQ46euxES48sVCZYUfjFqhMesXTUT9ZF4jTrVsVT1uNVPGa9TpZZrE8qP1i/W+UuG3C6drNBntTGBruTlQ3xKI/eaaT5XYNhMSvA4jlXjI5ZyYzaErPuOMqca94w75QOC47FTFbY4HtWuhf/WOVMWc6iD2aQiUflC0sG7CWmvtgJidV60rs7bpRbFnSOIsewBAzsecRgK32NQKsBj8WF7w8MtnTH6IwVDPaeDK/6TdA1eJbjAFqOx7SIbAnVrvOsI21FqQfMyBokbh5qlckNRaXGAk/MicHoTOPYSNfOJ423eJlLzFrQLbNErkJUow0zVLj6IxYlruKFgYOw576jVTG54MEh9l7KqPPqKwlMYLk42WAtgjvV4GALauZmMRRG2xKjoamPZrENjCCLaHV+qGutTZvgCVcJE1wjbbilWOOwRW0+w9VL2tCh6YWjJyGzGjWot+upcvLConOOCc28ej/dwa0LuqCl7E7pzhlmXhYmqLMr9NAqgeSUGA6iMHDKatMIoD0QP6tjmdOQ9KmOsHyQ2kw/hX/t92v/8aAEnF0jeDixaIrCU2L4CP2CoGxkJ7nKR4CFHzaYXDYQQ2VkyFYbm5Rwl94riQQ8jRyWwSs9nemCTyWWe+1LUeA1WQYYiFgQs3cYHt+oVbKa2VAk1aPjFVYIaSEV5NmP2HBqTA22M4nbMcqhbataBUWR6NYZ9otibCkyio2rmYkivRZ5PV69cBAZZSWB5heQebgUdnTmgpSD+QiLGRsdSaKHL1Mcoim3TrNPnEp8PLtQKSCWARhTvzLmGHCSUfcb7fjUs7yxjnUUJbAWRBbtVlJ+TQ6LsA01ZuCfwM7glEnXzhu8ubPHmLAOjWB3xIMOwLx5l+30p2BpT52UqP/DC8LoUvU3sI8lUbXsCCMTMwsrGzsHJxc3DwKJQvPy8QsICgmLiIqJS0hCmKfwu+YJRBKZQqVJScvIyskr6OkbGBoZm5iauXDpyrUbt+7cTz6IuYWlR0+evXj15t2HTytfyF+XDl07seWXKy9ePXnuNs2xs98N2btvLFsBAAAA) format("woff2");font-display:swap}[data-ui=oneui]{--radius: 26px;--ctl-r: 9999px;--card-r: 28px;--win-r: 32px;--menu-r: 22px;--nav-r: 9999px;--chip-r: 9999px;--in-r: 9999px;--font: "Outfit", "Roboto Flex", "Samsung One", system-ui, sans-serif;--title-font: var(--font);--dur: .22s;--ease: cubic-bezier(.2, .8, .2, 1);--oneui-glass: color-mix(in srgb, hsl(var(--surface)) 62%, transparent);--btn-bg: color-mix(in srgb, hsl(var(--fg)) 10%, transparent);--btn-fg: hsl(var(--fg));--btn-weight: 500;--btn-border: 0 solid transparent;--btn-shadow: none;--btn-hover-bg: color-mix(in srgb, hsl(var(--fg)) 16%, transparent);--btn-active-transform: scale(.96);--btn-accent-bg: hsl(var(--accent));--btn-accent-fg: hsl(var(--accent-fg));--btn-accent-border: 0 solid transparent;--btn-accent-hover-bg: color-mix(in srgb, hsl(var(--accent)) 88%, white);--ghost-hover-bg: color-mix(in srgb, hsl(var(--fg)) 10%, transparent);--in-bg: color-mix(in srgb, hsl(var(--fg)) 9%, transparent);--in-border: 0 solid transparent;--in-hover-border: transparent;--in-focus-border: transparent;--in-focus-shadow: 0 0 0 2px hsl(var(--accent));--in-px: 1.1rem;--in-py: .65rem;--card-bg: var(--oneui-glass);--card-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 10%, transparent);--card-shadow: none;--backdrop: rgb(0 0 0 / .35);--win-bg: color-mix(in srgb, hsl(var(--surface)) 88%, transparent);--win-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 12%, transparent);--win-shadow: 0 20px 60px rgb(0 0 0 / .35);--dialog-anim: bt-pop .26s cubic-bezier(.2, .8, .2, 1);--tb-bg: transparent;--tb-border: 0 solid transparent;--tb-pad: 1.4rem 1.6rem .4rem;--tb-size: 1.3rem;--tb-weight: 600;--tb-justify: space-between;--close-bg: color-mix(in srgb, hsl(var(--fg)) 12%, transparent);--close-r: 9999px;--bar-border: 0 solid transparent;--menu-bg: color-mix(in srgb, hsl(var(--surface)) 86%, transparent);--menu-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 12%, transparent);--pop-shadow: 0 14px 40px rgb(0 0 0 / .3);--menu-anim: bt-pop .2s cubic-bezier(.2, .8, .2, 1);--menu-hi-bg: color-mix(in srgb, hsl(var(--fg)) 12%, transparent);--side-bg: color-mix(in srgb, hsl(var(--surface)) 40%, transparent);--side-shadow: none;--top-bg: transparent;--top-shadow: none;--player-bg: color-mix(in srgb, hsl(var(--surface)) 70%, transparent);--player-shadow: none;--nav-hover-bg: color-mix(in srgb, hsl(var(--fg)) 8%, transparent);--nav-active-bg: hsl(var(--fg));--nav-active-fg: hsl(var(--bg));--row-hover: color-mix(in srgb, hsl(var(--fg)) 8%, transparent);--row-current: color-mix(in srgb, hsl(var(--accent)) 22%, transparent);--chk-size: 1.35rem;--chk-r: 9999px;--chk-border: 2px solid color-mix(in srgb, hsl(var(--fg)) 40%, transparent);--chk-bg: transparent;--chk-hover-border: hsl(var(--fg));--chk-focus: 0 0 0 3px color-mix(in srgb, hsl(var(--accent)) 35%, transparent);--chk-on-bg: hsl(var(--accent));--chk-on-border: hsl(var(--accent));--chk-on-fg: hsl(var(--accent-fg));--chk-radio-on-bg: hsl(var(--accent));--chk-dot: hsl(var(--accent-fg));--rng-appearance: none;--rng-h: 1.6rem;--rng-r: 9999px;--rng-border: 0 solid transparent;--rng-track: color-mix(in srgb, hsl(var(--fg)) 22%, transparent);--rng-fill: hsl(var(--fg));--rng-tw: .3rem;--rng-th: 1.6rem;--rng-tr: 9999px;--rng-thumb: transparent;--rng-tb: 0 solid transparent;--rng-ts: none}html[data-ui=oneui] .bt-shell,html[data-ui=oneui] .card,html[data-ui=oneui] .bt-menu,html[data-ui=oneui] .bt-window{-webkit-backdrop-filter:blur(26px) saturate(1.3);backdrop-filter:blur(26px) saturate(1.3)}[data-ui=oneui] .bt-side.bt-shell{margin:10px 0 10px 10px;border-radius:30px}[data-ui=oneui] .bt-player.bt-shell{margin:0 10px 10px;border-radius:30px}[data-ui=oneui] .bt-nav{font-weight:500;padding-inline:1rem}[data-ui=oneui] .bt-nav[aria-current=page] svg,[data-ui=oneui] .bt-nav[aria-current=page]{color:hsl(var(--bg))}[data-ui=oneui] .btn-accent{color:var(--btn-accent-fg)}[data-ui=oneui] .bt-cover{border-radius:24px}[data-ui=oneui] .bt-cover[data-kind=artist]{border-radius:9999px}[data-ui=oneui] main h1{font-size:2rem;font-weight:600}[data-ui=oneui] .bt-range{border-radius:9999px;overflow:hidden}[data-ui=oneui]{--btn-bg: color-mix(in srgb, hsl(var(--fg)) 13%, transparent);--btn-hover-bg: color-mix(in srgb, hsl(var(--fg)) 20%, transparent);--btn-shadow: inset 0 1px 0 rgb(255 255 255 / .18), inset 0 0 0 1px rgb(255 255 255 / .08)}:is(html,div)[data-ui=oneui] .btn{-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);min-height:2.5rem;padding-inline:1.15rem;transition:background-color var(--dur),transform var(--dur) var(--ease),box-shadow var(--dur)}[data-ui=oneui] .btn:active{transform:scale(.94)}:is(html,div)[data-ui=oneui] .btn.btn-ghost{background:transparent;box-shadow:none;-webkit-backdrop-filter:none;backdrop-filter:none}:is(html,div)[data-ui=oneui] .btn.btn-ghost:hover{background:var(--ghost-hover-bg)}[data-ui=oneui] .btn.\\!p-2{width:2.5rem;height:2.5rem;padding:0!important;justify-content:center;border-radius:9999px}html[data-mode=dark] [data-ui=oneui],html[data-mode=dark][data-ui=oneui]{--btn-accent-bg: #fff;--btn-accent-fg: #17171a;--btn-accent-hover-bg: #e8e8ee}html[data-mode=dark][data-ui=oneui] .btn-accent,html[data-mode=dark] [data-ui=oneui] .btn-accent{box-shadow:0 2px 10px #00000040}[data-ui=oneui] .btn-accent{font-weight:600}[data-ui=oneui] .card{border-radius:30px;box-shadow:inset 0 1px #ffffff1f}[data-ui=oneui] .bt-range{height:1.6rem;border-radius:9999px;box-shadow:inset 0 0 0 1px #ffffff0f}[data-ui=genius]{--radius: 2px;--ctl-r: 2px;--card-r: 2px;--win-r: 2px;--menu-r: 2px;--nav-r: 2px;--chip-r: 2px;--in-r: 2px;--font: "Programme", "Helvetica Neue", Helvetica, Arial, sans-serif;--title-font: var(--font);--dur: .12s;--ease: ease-out;--btn-bg: transparent;--btn-fg: hsl(var(--fg));--btn-weight: 700;--btn-border: 1px solid hsl(var(--fg));--btn-shadow: none;--btn-hover-bg: #ffff64;--btn-hover-border: hsl(var(--fg));--btn-active-transform: none;--btn-accent-bg: #ffff64;--btn-accent-fg: #000;--btn-accent-border: 1px solid #000;--btn-accent-hover-bg: #fff;--btn-accent-hover-fg: #000;--ghost-hover-bg: #ffff64;--in-bg: hsl(var(--bg));--in-border: 1px solid hsl(var(--fg));--in-hover-border: hsl(var(--fg));--in-focus-border: hsl(var(--fg));--in-focus-shadow: 0 0 0 3px #ffff64;--card-bg: hsl(var(--surface));--card-border: 1px solid hsl(var(--line));--card-shadow: none;--backdrop: rgb(0 0 0 / .55);--win-bg: hsl(var(--bg));--win-border: 2px solid hsl(var(--fg));--win-shadow: 6px 6px 0 rgb(0 0 0 / .85);--dialog-anim: bt-fade .12s ease-out;--tb-bg: #ffff64;--tb-border: 0 solid transparent;--tb-pad: .9rem 1.25rem;--tb-size: 1.1rem;--tb-weight: 800;--tb-justify: space-between;--close-r: 2px;--close-hover-bg: #000;--bar-border: 1px solid hsl(var(--line));--menu-bg: hsl(var(--bg));--menu-border: 1px solid hsl(var(--fg));--pop-shadow: 4px 4px 0 rgb(0 0 0 / .85);--menu-anim: bt-fade .1s ease-out;--menu-hi-bg: #ffff64;--menu-hi-fg: #000;--side-bg: hsl(var(--bg));--side-shadow: none;--top-bg: hsl(var(--bg));--top-shadow: none;--player-bg: hsl(var(--bg));--player-shadow: none;--nav-hover-bg: #ffff64;--nav-active-bg: #ffff64;--nav-active-fg: #000;--row-hover: color-mix(in srgb, #ffff64 40%, transparent);--row-current: #ffff64;--chk-size: 1.1rem;--chk-r: 2px;--chk-border: 2px solid hsl(var(--fg));--chk-bg: transparent;--chk-hover-border: hsl(var(--fg));--chk-focus: 0 0 0 3px #ffff64;--chk-on-bg: #ffff64;--chk-on-border: hsl(var(--fg));--chk-on-fg: #000;--chk-radio-on-bg: #ffff64;--chk-dot: #000;--rng-appearance: none;--rng-h: 4px;--rng-r: 0;--rng-border: 0 solid transparent;--rng-track: color-mix(in srgb, hsl(var(--fg)) 25%, transparent);--rng-fill: hsl(var(--fg));--rng-tw: 12px;--rng-th: 12px;--rng-tr: 0;--rng-thumb: #ffff64;--rng-tb: 2px solid hsl(var(--fg));--rng-ts: none}[data-ui=genius] .btn:is(:hover,:focus-visible):not(.btn-accent):not(.btn-ghost){color:#000}[data-ui=genius] main h1{font-weight:800;font-size:2.1rem;letter-spacing:-.01em}[data-ui=genius] .bt-nav{font-weight:700}[data-ui=genius] .bt-nav:hover,[data-ui=genius] .bt-nav[aria-current=page]{color:#000}[data-ui=genius] .bt-brand{font-weight:800;text-transform:uppercase;letter-spacing:.04em}[data-ui=genius] .chip{background:transparent;border:1px solid hsl(var(--fg));font-weight:600}[data-ui=genius] .bt-cover,[data-ui=genius] .bt-cover[data-kind=artist]{border-radius:2px}[data-ui=genius] .bt-tile:hover .bt-cap-t{background:#ffff64;color:#000}[data-ui=spotify]{--radius: 8px;--ctl-r: 9999px;--card-r: 8px;--win-r: 12px;--menu-r: 4px;--nav-r: 6px;--chip-r: 9999px;--in-r: 9999px;--font: "Albert Sans", "Circular Std", "Spotify Mix", "Helvetica Neue", Helvetica, Arial, sans-serif;--title-font: var(--font);--dur: .15s;--ease: ease-out;--btn-bg: transparent;--btn-fg: hsl(var(--fg));--btn-weight: 700;--btn-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 45%, transparent);--btn-shadow: none;--btn-hover-bg: transparent;--btn-hover-border: hsl(var(--fg));--btn-active-transform: scale(.97);--btn-accent-bg: hsl(var(--accent));--btn-accent-fg: #000;--btn-accent-border: 0 solid transparent;--btn-accent-hover-bg: color-mix(in srgb, hsl(var(--accent)) 86%, white);--ghost-hover-bg: color-mix(in srgb, hsl(var(--fg)) 10%, transparent);--in-bg: hsl(var(--raised));--in-border: 1px solid transparent;--in-hover-border: color-mix(in srgb, hsl(var(--fg)) 30%, transparent);--in-focus-border: hsl(var(--fg));--in-focus-shadow: none;--in-px: 1rem;--card-bg: hsl(var(--raised));--card-border: 0 solid transparent;--card-shadow: none;--backdrop: rgb(0 0 0 / .7);--win-bg: hsl(var(--raised));--win-border: 0 solid transparent;--win-shadow: 0 16px 40px rgb(0 0 0 / .6);--dialog-anim: bt-pop .16s ease-out;--tb-bg: transparent;--tb-border: 0 solid transparent;--tb-pad: 1.25rem 1.5rem .25rem;--tb-size: 1.35rem;--tb-weight: 800;--tb-justify: space-between;--close-r: 9999px;--close-hover-bg: color-mix(in srgb, hsl(var(--fg)) 12%, transparent);--bar-border: 0 solid transparent;--menu-bg: hsl(var(--raised));--menu-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 8%, transparent);--pop-shadow: 0 16px 24px rgb(0 0 0 / .5);--menu-anim: bt-fade .1s ease-out;--menu-hi-bg: color-mix(in srgb, hsl(var(--fg)) 10%, transparent);--side-bg: hsl(var(--surface));--side-shadow: none;--top-bg: transparent;--top-shadow: none;--player-bg: hsl(var(--bg));--player-shadow: none;--nav-hover-bg: transparent;--nav-active-bg: transparent;--nav-active-fg: hsl(var(--fg));--row-hover: color-mix(in srgb, hsl(var(--fg)) 8%, transparent);--row-current: color-mix(in srgb, hsl(var(--fg)) 12%, transparent);--chk-size: 1.1rem;--chk-r: 4px;--chk-border: 2px solid color-mix(in srgb, hsl(var(--fg)) 60%, transparent);--chk-bg: transparent;--chk-hover-border: hsl(var(--fg));--chk-focus: 0 0 0 3px color-mix(in srgb, hsl(var(--accent)) 35%, transparent);--chk-on-bg: hsl(var(--accent));--chk-on-border: hsl(var(--accent));--chk-on-fg: #000;--chk-radio-on-bg: hsl(var(--accent));--chk-dot: #000;--rng-appearance: none;--rng-h: 4px;--rng-r: 9999px;--rng-border: 0 solid transparent;--rng-track: color-mix(in srgb, hsl(var(--fg)) 28%, transparent);--rng-fill: hsl(var(--fg));--rng-tw: 12px;--rng-th: 12px;--rng-tr: 9999px;--rng-thumb: hsl(var(--fg));--rng-tb: 0 solid transparent;--rng-ts: 0 2px 4px rgb(0 0 0 / .5)}[data-ui=spotify] .bt-shell{-webkit-backdrop-filter:none;backdrop-filter:none}[data-ui=spotify] .bt-side.bt-shell{margin:8px 0 0 8px;border-radius:8px}@media(min-width:768px){[data-ui=spotify] main{margin:8px 8px 0 0;border-radius:8px;background:hsl(var(--surface))}}[data-ui=spotify] main{background:hsl(var(--surface))}[data-ui=spotify] .bt-top{background:linear-gradient(to bottom,color-mix(in srgb,hsl(var(--accent)) 14%,hsl(var(--surface))),hsl(var(--surface)))}[data-ui=spotify] .bt-nav{font-weight:700;color:hsl(var(--muted))}[data-ui=spotify] .bt-nav:hover,[data-ui=spotify] .bt-nav[aria-current=page]{color:hsl(var(--fg))}[data-ui=spotify] .bt-brand{font-weight:800}[data-ui=spotify] main h1{font-weight:800;font-size:2rem;letter-spacing:-.02em}[data-ui=spotify] .chip{background:hsl(var(--raised));font-weight:500}[data-ui=spotify] .bt-tile,[data-ui=spotify] .bt-cap{transition:background-color var(--dur) var(--ease)}[data-ui=spotify] .bt-tile{padding:12px;border-radius:8px;background:transparent}[data-ui=spotify] .bt-tile:hover{background:hsl(var(--hover))}[data-ui=spotify] .bt-cover{border-radius:6px;box-shadow:0 8px 24px #00000080}[data-ui=spotify] .bt-cover[data-kind=artist]{border-radius:9999px}[data-ui=spotify] .bt-player .btn-accent{background:hsl(var(--fg));color:hsl(var(--bg));border-radius:9999px}[data-ui=spotify] .bt-player .btn-accent:hover{transform:scale(1.06);background:hsl(var(--fg))}[data-ui=spotify] .bt-range:hover{--rng-fill: hsl(var(--accent))}[data-ui=ytmusic]{--radius: 12px;--ctl-r: 18px;--card-r: 12px;--win-r: 16px;--menu-r: 12px;--nav-r: 10px;--chip-r: 8px;--in-r: 9999px;--font: "Roboto", "YouTube Sans", Arial, sans-serif;--title-font: var(--font);--dur: .12s;--ease: ease-out;--btn-bg: color-mix(in srgb, hsl(var(--fg)) 10%, transparent);--btn-fg: hsl(var(--fg));--btn-weight: 500;--btn-border: 0 solid transparent;--btn-shadow: none;--btn-hover-bg: color-mix(in srgb, hsl(var(--fg)) 18%, transparent);--btn-active-transform: none;--btn-accent-bg: hsl(var(--fg));--btn-accent-fg: hsl(var(--bg));--btn-accent-border: 0 solid transparent;--btn-accent-hover-bg: color-mix(in srgb, hsl(var(--fg)) 82%, hsl(var(--bg)));--ghost-hover-bg: color-mix(in srgb, hsl(var(--fg)) 10%, transparent);--in-bg: hsl(var(--surface));--in-border: 1px solid hsl(var(--line));--in-hover-border: hsl(var(--line));--in-focus-border: #3ea6ff;--in-focus-shadow: none;--in-px: 1rem;--in-py: .5rem;--card-bg: transparent;--card-border: 1px solid hsl(var(--line));--card-shadow: none;--backdrop: rgb(0 0 0 / .6);--win-bg: hsl(var(--raised));--win-border: 0 solid transparent;--win-shadow: 0 16px 40px rgb(0 0 0 / .5);--dialog-anim: bt-pop .15s ease-out;--tb-bg: transparent;--tb-border: 0 solid transparent;--tb-pad: 1.1rem 1.5rem .2rem;--tb-size: 1.25rem;--tb-weight: 700;--tb-justify: space-between;--close-r: 9999px;--close-hover-bg: color-mix(in srgb, hsl(var(--fg)) 12%, transparent);--bar-border: 0 solid transparent;--menu-bg: hsl(var(--raised));--menu-border: 0 solid transparent;--pop-shadow: 0 4px 32px rgb(0 0 0 / .5);--menu-anim: bt-fade .1s ease-out;--menu-hi-bg: color-mix(in srgb, hsl(var(--fg)) 10%, transparent);--side-bg: hsl(var(--bg));--side-shadow: none;--top-bg: hsl(var(--bg));--top-shadow: none;--player-bg: hsl(var(--raised));--player-shadow: 0 -1px 0 hsl(var(--line));--nav-hover-bg: color-mix(in srgb, hsl(var(--fg)) 10%, transparent);--nav-active-bg: color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--nav-active-fg: hsl(var(--fg));--row-hover: color-mix(in srgb, hsl(var(--fg)) 8%, transparent);--row-current: color-mix(in srgb, hsl(var(--fg)) 12%, transparent);--chk-size: 1.1rem;--chk-r: 3px;--chk-border: 2px solid color-mix(in srgb, hsl(var(--fg)) 55%, transparent);--chk-bg: transparent;--chk-hover-border: hsl(var(--fg));--chk-focus: 0 0 0 3px color-mix(in srgb, #3ea6ff 40%, transparent);--chk-on-bg: hsl(var(--fg));--chk-on-border: hsl(var(--fg));--chk-on-fg: hsl(var(--bg));--chk-radio-on-bg: hsl(var(--fg));--chk-dot: hsl(var(--bg));--rng-appearance: none;--rng-h: 3px;--rng-r: 0;--rng-border: 0 solid transparent;--rng-track: color-mix(in srgb, hsl(var(--fg)) 25%, transparent);--rng-fill: hsl(var(--accent));--rng-tw: 13px;--rng-th: 13px;--rng-tr: 9999px;--rng-thumb: hsl(var(--accent));--rng-tb: 0 solid transparent;--rng-ts: none}[data-ui=ytmusic] .bt-shell{-webkit-backdrop-filter:none;backdrop-filter:none}[data-ui=ytmusic] .bt-nav{font-weight:400;font-size:.875rem;padding-block:.6rem}[data-ui=ytmusic] .bt-nav[aria-current=page]{font-weight:500}[data-ui=ytmusic] .bt-brand{font-weight:700;letter-spacing:-.02em}[data-ui=ytmusic] .chip{background:color-mix(in srgb,hsl(var(--fg)) 10%,transparent);font-weight:500}[data-ui=ytmusic] .chip[class*=bg-accent]{background:hsl(var(--fg));color:hsl(var(--bg))}[data-ui=ytmusic] .bt-top .input{background:hsl(var(--bg))}[data-ui=ytmusic] .bt-cover{border-radius:12px}[data-ui=ytmusic] .bt-cover[data-kind=artist]{border-radius:9999px}[data-ui=ytmusic] .bt-tile{background:transparent;border:0}[data-ui=ytmusic] .card{background:hsl(var(--surface))}[data-ui=ytmusic] main h1{font-weight:700;font-size:1.75rem}[data-ui=discord]{--radius: 8px;--ctl-r: 8px;--card-r: 8px;--win-r: 12px;--menu-r: 8px;--nav-r: 8px;--chip-r: 8px;--in-r: 8px;--font: "Noto Sans", "gg sans", "Helvetica Neue", Helvetica, Arial, sans-serif;--title-font: var(--font);--dis-edge: color-mix(in srgb, hsl(var(--fg)) 15%, hsl(var(--bg)));--dur: .1s;--ease: ease-out;--btn-bg: hsl(var(--raised));--btn-fg: hsl(var(--fg));--btn-weight: 500;--btn-border: 0 solid transparent;--btn-shadow: none;--btn-hover-bg: hsl(var(--hover));--btn-active-transform: none;--btn-accent-bg: hsl(var(--accent));--btn-accent-fg: hsl(var(--accent-fg));--btn-accent-border: 0 solid transparent;--btn-accent-hover-bg: color-mix(in srgb, hsl(var(--accent)) 82%, black);--ghost-hover-bg: hsl(var(--hover));--in-bg: hsl(var(--bg));--in-border: 1px solid var(--dis-edge);--in-hover-border: color-mix(in srgb, hsl(var(--fg)) 28%, hsl(var(--bg)));--in-focus-border: hsl(var(--accent));--in-focus-shadow: none;--in-px: .9rem;--in-py: .65rem;--card-bg: hsl(var(--surface));--card-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 8%, transparent);--card-shadow: none;--backdrop: rgb(0 0 0 / .7);--win-bg: hsl(var(--bg));--win-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 10%, transparent);--win-shadow: 0 0 0 1px rgb(0 0 0 / .4), 0 16px 48px rgb(0 0 0 / .5);--dialog-anim: bt-pop .16s ease-out;--tb-bg: transparent;--tb-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 7%, transparent);--tb-pad: 1.1rem 1.25rem;--tb-size: 1.1rem;--tb-weight: 500;--tb-justify: space-between;--close-r: 8px;--close-hover-bg: hsl(var(--hover));--bar-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 7%, transparent);--menu-bg: hsl(var(--surface));--menu-border: 1px solid var(--dis-edge);--pop-shadow: 0 8px 20px rgb(0 0 0 / .5);--menu-anim: bt-pop 90ms ease-out;--menu-hi-bg: hsl(var(--hover));--menu-hi-fg: hsl(var(--fg));--side-bg: hsl(var(--bg));--side-shadow: none;--top-bg: hsl(var(--bg));--top-shadow: none;--player-bg: hsl(var(--bg));--player-shadow: none;--nav-hover-bg: color-mix(in srgb, hsl(var(--hover)) 60%, transparent);--nav-active-bg: hsl(var(--hover));--nav-active-fg: hsl(var(--fg));--row-hover: color-mix(in srgb, hsl(var(--hover)) 55%, transparent);--row-current: hsl(var(--hover));--chk-size: 1.25rem;--chk-r: 4px;--chk-border: 2px solid color-mix(in srgb, hsl(var(--fg)) 62%, transparent);--chk-bg: transparent;--chk-hover-border: hsl(var(--fg));--chk-focus: 0 0 0 2px hsl(var(--accent));--chk-on-bg: hsl(var(--accent));--chk-on-border: hsl(var(--accent));--chk-on-fg: #fff;--chk-radio-on-bg: hsl(var(--accent));--chk-dot: #fff;--rng-appearance: none;--rng-h: 8px;--rng-r: 4px;--rng-border: 0 solid transparent;--rng-track: color-mix(in srgb, hsl(var(--fg)) 22%, hsl(var(--bg)));--rng-fill: hsl(var(--accent));--rng-tw: 22px;--rng-th: 22px;--rng-tr: 9999px;--rng-thumb: #fff;--rng-tb: 0 solid transparent;--rng-ts: 0 2px 6px rgb(0 0 0 / .5)}[data-ui=discord] .bt-shell{-webkit-backdrop-filter:none;backdrop-filter:none}[data-ui=discord] .bt-side{border-right:1px solid color-mix(in srgb,hsl(var(--fg)) 7%,transparent)}[data-ui=discord] .bt-top{border-bottom:1px solid color-mix(in srgb,hsl(var(--fg)) 7%,transparent)}[data-ui=discord] .bt-nav{font-weight:500;color:hsl(var(--muted));padding-block:.6rem;font-size:1rem}[data-ui=discord] .bt-nav:hover,[data-ui=discord] .bt-nav[aria-current=page]{color:hsl(var(--fg))}[data-ui=discord] .bt-brand{font-weight:600;font-size:1.05rem;padding-bottom:.9rem;margin-bottom:.4rem;border-bottom:1px solid color-mix(in srgb,hsl(var(--fg)) 7%,transparent)}[data-ui=discord] main h1{font-size:1.6rem;font-weight:500}[data-ui=discord] main h2:not([class*=text-2xl]){font-weight:500}[data-ui=discord] .bt-label{font-size:.9rem;font-weight:500;color:hsl(var(--fg))}[data-ui=discord] .btn{padding-block:.6rem;padding-inline:1.1rem}[data-ui=discord] .btn-ghost{background:transparent}[data-ui=discord] .bt-cover{border-radius:8px}[data-ui=discord] .bt-cover[data-kind=artist]{border-radius:9999px}[data-ui=discord] hr,[data-ui=discord] .divide-y>:not([hidden])~:not([hidden]){border-color:color-mix(in srgb,hsl(var(--fg)) 7%,transparent)}[data-ui=discord] ::selection{background:hsl(var(--accent) / .6)}[data-ui=discord] :is(p,li,.bt-body,.prose) a:not(.btn){color:#00a8fc}[data-ui=ado]{--ado-red: #ff2a4d;--ado-glow: color-mix(in srgb, hsl(var(--accent)) 55%, transparent);--radius: 2px;--ctl-r: 2px;--card-r: 3px;--win-r: 3px;--menu-r: 2px;--nav-r: 2px;--chip-r: 2px;--in-r: 2px;--font: "Barlow Condensed", "Archivo", system-ui, sans-serif;--title-font: var(--font);--dur: .14s;--ease: ease-out;--btn-bg: transparent;--btn-fg: hsl(var(--fg));--btn-weight: 600;--btn-border: 1px solid color-mix(in srgb, hsl(var(--accent)) 60%, transparent);--btn-shadow: none;--btn-hover-bg: color-mix(in srgb, hsl(var(--accent)) 18%, transparent);--btn-hover-border: hsl(var(--accent));--btn-hover-shadow: 0 0 14px var(--ado-glow), inset 0 -2px 0 var(--ado-red);--btn-active-transform: translateY(1px);--btn-accent-bg: hsl(var(--accent));--btn-accent-fg: #fff;--btn-accent-border: 1px solid hsl(var(--accent));--btn-accent-hover-bg: color-mix(in srgb, hsl(var(--accent)) 82%, white);--btn-accent-hover-shadow: 0 0 18px var(--ado-glow), inset 0 -2px 0 var(--ado-red);--ghost-hover-bg: color-mix(in srgb, hsl(var(--accent)) 14%, transparent);--in-bg: hsl(var(--raised));--in-border: 1px solid hsl(var(--line));--in-hover-border: color-mix(in srgb, hsl(var(--accent)) 60%, transparent);--in-focus-border: hsl(var(--accent));--in-focus-shadow: 0 0 12px var(--ado-glow);--in-px: .75rem;--card-bg: hsl(var(--surface));--card-border: 1px solid hsl(var(--line));--card-shadow: none;--backdrop: rgb(2 4 12 / .8);--win-bg: hsl(var(--surface));--win-border: 1px solid hsl(var(--accent));--win-shadow: 0 0 30px var(--ado-glow), 6px 6px 0 rgb(0 0 0 / .5);--dialog-anim: bt-fade .14s ease-out;--tb-bg: transparent;--tb-border: 0 solid transparent;--tb-pad: .9rem 1.2rem .2rem;--tb-size: 1.35rem;--tb-weight: 800;--tb-justify: space-between;--close-r: 2px;--close-hover-bg: var(--ado-red);--close-hover-fg: #fff;--bar-border: 1px solid hsl(var(--line));--menu-bg: hsl(var(--surface));--menu-border: 1px solid hsl(var(--accent));--pop-shadow: 0 0 20px var(--ado-glow);--menu-anim: bt-fade 90ms ease-out;--menu-hi-bg: hsl(var(--accent));--menu-hi-fg: #fff;--side-bg: hsl(var(--bg));--side-shadow: none;--top-bg: hsl(var(--bg));--top-shadow: 0 1px 0 hsl(var(--line));--player-bg: hsl(var(--bg));--player-shadow: 0 -1px 0 hsl(var(--accent) / .5);--nav-hover-bg: color-mix(in srgb, hsl(var(--accent)) 12%, transparent);--nav-active-bg: color-mix(in srgb, hsl(var(--accent)) 18%, transparent);--nav-active-fg: #fff;--nav-active-shadow: inset 3px 0 0 var(--ado-red);--row-hover: color-mix(in srgb, hsl(var(--accent)) 10%, transparent);--row-current: color-mix(in srgb, hsl(var(--accent)) 20%, transparent);--chk-size: 1.1rem;--chk-r: 2px;--chk-border: 1px solid hsl(var(--accent));--chk-bg: transparent;--chk-hover-border: var(--ado-red);--chk-focus: 0 0 8px var(--ado-glow);--chk-on-bg: hsl(var(--accent));--chk-on-border: hsl(var(--accent));--chk-on-fg: #fff;--chk-radio-on-bg: hsl(var(--accent));--chk-dot: #fff;--rng-appearance: none;--rng-h: 3px;--rng-r: 0;--rng-border: 0 solid transparent;--rng-track: hsl(var(--line));--rng-fill: hsl(var(--accent));--rng-tw: 8px;--rng-th: 18px;--rng-tr: 0;--rng-thumb: var(--ado-red);--rng-tb: 0 solid transparent;--rng-ts: 0 0 10px var(--ado-red)}html[data-ui=ado]{font-size:17px}[data-ui=ado] :is(h1,h2,h3,.bt-brand,.bt-panel-title,.bt-ptitle){font-style:italic;font-weight:800;text-transform:uppercase;letter-spacing:.02em}[data-ui=ado] main h1{font-size:2.4rem;line-height:1}[data-ui=ado] main h1:before{content:"/ ";color:var(--ado-red)}[data-ui=ado] .btn,[data-ui=ado] .bt-nav,[data-ui=ado] .bt-toplink{text-transform:uppercase;letter-spacing:.06em}[data-ui=ado] .bt-nav{font-weight:600}[data-ui=ado] .bt-toplink[aria-current=page]{box-shadow:inset 0 -2px 0 var(--ado-red)}[data-ui=ado] .bt-cover{border-radius:2px;box-shadow:0 0 0 1px hsl(var(--line))}[data-ui=ado] .card:hover,[data-ui=ado] .bt-tile:hover .bt-cover{box-shadow:0 0 14px var(--ado-glow)}[data-ui=ado] .chip{text-transform:uppercase;letter-spacing:.05em;border:1px solid hsl(var(--line));background:transparent}[data-ui=ado] ::selection{background:var(--ado-red);color:#fff}[data-ui=yaru]{--chk-size: 1.1rem;--chk-r: 4px;--chk-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 28%, transparent);--chk-bg: transparent;--chk-hover-border: color-mix(in srgb, hsl(var(--fg)) 45%, transparent);--radius: 12px;--ctl-r: 6px;--card-r: 12px;--win-r: 12px;--menu-r: 12px;--nav-r: 6px;--font: "Ubuntu", "Cantarell", "Noto Sans", system-ui, sans-serif;--dur: .15s;--ease: cubic-bezier(.25, .46, .45, .94);--tb-justify: center;--btn-bg: color-mix(in srgb, hsl(var(--fg)) 8%, transparent);--btn-hover-bg: color-mix(in srgb, hsl(var(--fg)) 13%, transparent);--btn-weight: 400;--btn-active-transform: none;--btn-active-shadow: inset 0 0 0 99px color-mix(in srgb, hsl(var(--fg)) 6%, transparent);--btn-accent-hover-bg: color-mix(in srgb, hsl(var(--accent)) 88%, white);--ghost-hover-bg: color-mix(in srgb, hsl(var(--fg)) 8%, transparent);--in-bg: color-mix(in srgb, hsl(var(--fg)) 7%, transparent);--in-border: 1px solid transparent;--in-hover-border: transparent;--in-focus-border: transparent;--in-shadow: none;--in-focus-shadow: 0 0 0 2px hsl(var(--accent) / .85);--card-bg: hsl(var(--surface));--card-border: 0 solid transparent;--card-shadow: 0 0 0 1px color-mix(in srgb, hsl(var(--fg)) 8%, transparent), 0 1px 3px rgb(0 0 0 / .1), 0 1px 2px rgb(0 0 0 / .06);--win-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 12%, transparent);--win-shadow: 0 8px 30px rgb(0 0 0 / .3), 0 2px 8px rgb(0 0 0 / .2);--dialog-anim: bt-pop .18s cubic-bezier(.2, .8, .3, 1);--tb-bg: color-mix(in srgb, hsl(var(--fg)) 5%, hsl(var(--surface)));--tb-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 12%, transparent);--tb-pad: .7rem 1rem;--tb-weight: 700;--tb-size: 1rem;--close-bg: color-mix(in srgb, hsl(var(--fg)) 8%, transparent);--close-r: 9999px;--close-hover-bg: color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--bar-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 12%, transparent);--menu-border: 1px solid color-mix(in srgb, hsl(var(--fg)) 10%, transparent);--pop-shadow: 0 2px 10px rgb(0 0 0 / .25), 0 0 0 1px rgb(0 0 0 / .04);--menu-anim: bt-fade .12s ease-out;--menu-hi-bg: color-mix(in srgb, hsl(var(--fg)) 9%, transparent);--side-bg: color-mix(in srgb, hsl(var(--fg)) 5%, hsl(var(--bg)));--side-shadow: none;--top-bg: color-mix(in srgb, hsl(var(--fg)) 6%, hsl(var(--bg)));--top-shadow: none;--player-bg: color-mix(in srgb, hsl(var(--fg)) 6%, hsl(var(--bg)));--player-shadow: none;--nav-hover-bg: color-mix(in srgb, hsl(var(--fg)) 6%, transparent);--nav-active-bg: color-mix(in srgb, hsl(var(--fg)) 10%, transparent);--nav-active-fg: hsl(var(--fg));--row-hover: color-mix(in srgb, hsl(var(--fg)) 6%, transparent);--row-current: color-mix(in srgb, hsl(var(--fg)) 9%, transparent);--rng-appearance: none;--rng-h: .4rem;--rng-track: color-mix(in srgb, hsl(var(--fg)) 14%, transparent);--rng-tw: 1.15rem;--rng-th: 1.15rem;--rng-thumb: #fff;--rng-ts: 0 1px 3px rgb(0 0 0 / .45), 0 0 0 1px rgb(0 0 0 / .08)}[data-ui=yaru] .bt-titlebar{position:relative}[data-ui=yaru] .bt-titlebar .bt-close{position:absolute;right:.6rem;top:50%;transform:translateY(-50%);padding:.3rem}html[data-ui=yaru] ::selection{background:color-mix(in srgb,hsl(var(--accent)) 40%,transparent)}[data-ui=yaru] .bt-shell{-webkit-backdrop-filter:none;backdrop-filter:none}[data-ui=yaru] .bt-top{backdrop-filter:none;-webkit-backdrop-filter:none}[data-ui=yaru] .bt-nav{font-weight:400;padding-block:.55rem;color:hsl(var(--fg))}[data-ui=yaru] .bt-nav[aria-current=page]{font-weight:500}[data-ui=yaru] .bt-brand{font-size:1rem;font-weight:700}[data-ui=yaru] .btn.btn-accent{font-weight:500}[data-ui=yaru] h1{font-weight:800;letter-spacing:0}[data-ui=yaru] .card.overflow-hidden .bt-row+.bt-row,[data-ui=yaru] .card.overflow-hidden>div+div{border-top:1px solid color-mix(in srgb,hsl(var(--fg)) 8%,transparent)}[data-ui=yaru]{--radius: 14px;--ctl-r: 9999px;--card-r: 20px;--win-r: 24px;--menu-r: 20px;--nav-r: 9999px;--chip-r: 9999px;--in-r: 9999px;--btn-bg: color-mix(in srgb, hsl(var(--fg)) 8%, hsl(var(--surface)));--btn-border: 0 solid transparent;--btn-weight: 400;--btn-hover-bg: color-mix(in srgb, hsl(var(--fg)) 13%, hsl(var(--surface)));--btn-accent-bg: color-mix(in srgb, hsl(var(--accent)) 30%, hsl(var(--surface)));--btn-accent-fg: hsl(var(--fg));--btn-accent-border: 0 solid transparent;--btn-accent-hover-bg: color-mix(in srgb, hsl(var(--accent)) 40%, hsl(var(--surface)));--in-bg: color-mix(in srgb, hsl(var(--fg)) 7%, hsl(var(--surface)));--in-border: 1px solid transparent;--in-focus-shadow: 0 0 0 2px hsl(var(--accent) / .85);--in-px: 1rem;--win-border: 0 solid transparent;--win-shadow: 0 12px 36px rgb(0 0 0 / .3), 0 0 0 1px rgb(0 0 0 / .06);--menu-border: 0 solid transparent;--pop-shadow: 0 8px 28px rgb(0 0 0 / .28);--menu-hi-bg: color-mix(in srgb, hsl(var(--fg)) 8%, transparent);--menu-hi-fg: hsl(var(--fg));--nav-active-bg: color-mix(in srgb, hsl(var(--accent)) 24%, transparent);--nav-active-fg: hsl(var(--fg));--nav-hover-bg: color-mix(in srgb, hsl(var(--fg)) 7%, transparent);--rng-h: 5px;--rng-r: 9999px;--rng-track: color-mix(in srgb, hsl(var(--fg)) 30%, hsl(var(--surface)));--rng-fill: hsl(var(--accent));--rng-tw: 1.35rem;--rng-th: 1.35rem;--rng-tr: 9999px;--rng-thumb: #fff;--rng-tb: 1px solid rgb(0 0 0 / .18);--rng-ts: 0 1px 4px rgb(0 0 0 / .35)}[data-ui=yaru] .bt-nav{padding-inline:1rem}[data-ui=yaru] .bt-cover{border-radius:14px}[data-ui=yaru] .chip{background:color-mix(in srgb,hsl(var(--fg)) 8%,transparent)}[data-ui=material] .bt-wf-close:is(:hover,:focus-visible){background:color-mix(in srgb,currentColor 22%,transparent);color:inherit}[data-ui=material] .bt-wf-btn{--wf-r: 9999px;width:1.7rem;height:1.7rem}[data-ui=material]{--radius: 16px;--ctl-r: 9999px;--card-r: 20px;--win-r: 28px;--menu-r: 4px;--nav-r: 9999px;--font: Roboto, "Noto Sans", "Open Sans", system-ui, sans-serif;--dur: .2s;--ease: cubic-bezier(.2, 0, 0, 1);--btn-bg: transparent;--btn-border: 1px solid hsl(var(--line));--btn-fg: hsl(var(--accent));--btn-weight: 500;--btn-hover-bg: color-mix(in srgb, hsl(var(--accent)) 8%, transparent);--btn-hover-border: hsl(var(--line));--btn-active-transform: scale(.98);--btn-accent-bg: hsl(var(--accent));--btn-accent-border: 0 solid transparent;--btn-accent-hover-shadow: 0 1px 3px 1px rgb(0 0 0 / .2);--ghost-hover-bg: color-mix(in srgb, hsl(var(--fg)) 8%, transparent);--in-bg: color-mix(in srgb, hsl(var(--accent)) 7%, hsl(var(--surface)));--in-border: 0 solid transparent;--in-shadow: inset 0 -1px 0 hsl(var(--line));--in-hover-border: transparent;--in-focus-border: transparent;--in-focus-shadow: inset 0 -2px 0 hsl(var(--accent));--in-r: 4px 4px 0 0;--in-px: 1rem;--in-py: .8rem;--chk-size: 1.15rem;--chk-r: 2px;--chk-border: 2px solid hsl(var(--muted));--chk-bg: transparent;--chk-hover-border: hsl(var(--fg));--card-bg: color-mix(in srgb, hsl(var(--accent)) 5%, hsl(var(--surface)));--card-border: 0 solid transparent;--card-shadow: 0 1px 2px rgb(0 0 0 / .15);--win-bg: color-mix(in srgb, hsl(var(--accent)) 7%, hsl(var(--surface)));--win-border: 0 solid transparent;--win-shadow: 0 6px 18px 4px rgb(0 0 0 / .25);--dialog-anim: bt-pop .3s cubic-bezier(.05, .7, .1, 1);--tb-border: 0 solid transparent;--tb-pad: 1.5rem 1.5rem .5rem;--tb-size: 1.5rem;--tb-weight: 400;--close-r: 9999px;--close-hover-bg: color-mix(in srgb, hsl(var(--fg)) 10%, transparent);--bar-border: 0 solid transparent;--menu-bg: color-mix(in srgb, hsl(var(--accent)) 6%, hsl(var(--surface)));--menu-border: 0 solid transparent;--pop-shadow: 0 2px 6px 2px rgb(0 0 0 / .18), 0 1px 2px rgb(0 0 0 / .3);--menu-anim: bt-reveal .2s cubic-bezier(.05, .7, .1, 1);--menu-hi-bg: color-mix(in srgb, hsl(var(--accent)) 14%, transparent);--side-bg: color-mix(in srgb, hsl(var(--accent)) 5%, hsl(var(--surface)));--top-bg: color-mix(in srgb, hsl(var(--accent)) 8%, hsl(var(--bg)));--top-shadow: 0 1px 3px rgb(0 0 0 / .12);--player-bg: color-mix(in srgb, hsl(var(--accent)) 8%, hsl(var(--surface)));--nav-hover-bg: color-mix(in srgb, hsl(var(--fg)) 6%, transparent);--nav-active-bg: color-mix(in srgb, hsl(var(--accent)) 22%, hsl(var(--surface)));--row-hover: color-mix(in srgb, hsl(var(--accent)) 10%, transparent);--rng-appearance: none;--rng-h: .5rem;--rng-track: color-mix(in srgb, hsl(var(--accent)) 24%, hsl(var(--surface)));--rng-tw: 1.25rem;--rng-th: 1.25rem;--rng-thumb: hsl(var(--accent));--rng-ts: 0 1px 3px rgb(0 0 0 / .3)}[data-ui=material] .btn.btn-accent{padding-inline:1.25rem}[data-ui=material]{--player-in: bt-slide-in .42s cubic-bezier(.05, .7, .1, 1) both;--player-out: bt-slide-out .2s cubic-bezier(.3, 0, .8, .15) both;--player-ms: .2s;--pop-out: bt-fade-out .15s cubic-bezier(.3, 0, .8, .15) both;--pop-ms: .15s}[data-ui=material]{--page-in: bt-fade-through .26s cubic-bezier(.2, 0, 0, 1) backwards}@keyframes bt-fade-through{0%{opacity:0;transform:scale(.95)}to{opacity:1;transform:none}}
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
    let el3 = document.getElementById(STYLE_ID);
    if (!el3) {
      el3 = document.createElement("style");
      el3.id = STYLE_ID;
      document.head.appendChild(el3);
    }
    el3.dataset.hash = b.manifest.hash;
    el3.textContent = b.css;
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
  var isLiquidScope = (el3) => el3.closest("[data-ui]")?.dataset.ui === "liquid";
  function cornerRadius(el3) {
    const cs = getComputedStyle(el3);
    const v = el3.matches(".bt-menu") ? "--menu-r" : el3.matches(".bt-window") ? "--win-r" : null;
    const settled = v ? parseFloat(cs.getPropertyValue(v)) : NaN;
    return Number.isFinite(settled) ? settled : parseFloat(cs.borderTopLeftRadius) || 0;
  }
  function apply(el3, settled = false) {
    const w = el3.offsetWidth, h = el3.offsetHeight;
    if (w < 4 || h < 4 || !isLiquidScope(el3)) return;
    const radius = Math.min(cornerRadius(el3), w / 2, h / 2);
    const dpr = window.devicePixelRatio || 1;
    const unique = el3.matches(MATERIALIZE);
    const q = (n) => Math.max(4, Math.round(n / 4) * 4);
    const key = unique ? `${w}x${h}r${Math.round(radius)}` : `${q(w)}x${q(h)}r${Math.round(radius)}@${dpr}`;
    const prev = applied.get(el3);
    if (prev?.key === key) {
      clearTimeout(rebuild.get(el3));
      rebuild.delete(el3);
      return;
    }
    if (prev && unique && !settled) {
      clearTimeout(rebuild.get(el3));
      rebuild.set(el3, window.setTimeout(() => {
        rebuild.delete(el3);
        if (el3.isConnected) apply(el3, true);
      }, 140));
      return;
    }
    const g = { w: unique ? w : q(w), h: unique ? h : q(h), r: radius };
    const lens = !unique && cache.get(key) || buildFilter(key, g, dpr, unique);
    if (prev && unique) prev.lens.node.remove();
    applied.set(el3, { key, lens });
    el3.style.setProperty("--lg-spec", `url("${lens.spec}")`);
    if (!supportsLens()) return;
    const first = !prev;
    const entering = first && unique && el3.matches(".bt-window") ? Promise.allSettled(el3.getAnimations().map((a) => a.finished)) : Promise.resolve();
    void Promise.all([lens.ready, entering]).then(() => {
      if (applied.get(el3)?.lens !== lens || !el3.isConnected) return;
      el3.style.setProperty("--lg-filter", `url(#${lens.id})`);
      if (first && unique) materialize(el3, lens);
    });
  }
  var STEPS = [0.28, 0.58, 0.8, 0.93, 1];
  function materialize(el3, lens, ms = 300) {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const set = (k) => lens.bases.forEach(({ el: d, base }) => d.setAttribute("scale", String(base * k)));
    set(0);
    STEPS.forEach((k, i) => animations.set(el3, window.setTimeout(() => {
      if (lens.node.isConnected) set(k);
    }, (i + 1) / STEPS.length * ms)));
  }
  function scan() {
    scanQueued = false;
    if (!active) return;
    const found = new Set(document.querySelectorAll(TARGETS));
    for (const el3 of found) {
      if (!tracked.has(el3)) {
        tracked.add(el3);
        ro?.observe(el3);
      }
      apply(el3);
    }
    for (const el3 of [...tracked]) {
      if (!el3.isConnected) {
        tracked.delete(el3);
        ro?.unobserve(el3);
        const a = applied.get(el3);
        if (a && a.lens.id.startsWith("lg-u")) a.lens.node.remove();
        applied.delete(el3);
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
      for (const el3 of tracked) {
        el3.style.removeProperty("--lg-filter");
        el3.style.removeProperty("--lg-spec");
        applied.delete(el3);
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

  // engine/src/select.ts
  var SEARCH_FROM = 12;
  var SVG = "http://www.w3.org/2000/svg";
  function icon(d) {
    const s = document.createElementNS(SVG, "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("width", "14");
    s.setAttribute("height", "14");
    s.setAttribute("class", "ico");
    s.setAttribute("fill", "none");
    s.setAttribute("stroke", "currentColor");
    s.setAttribute("stroke-width", "2.2");
    s.setAttribute("stroke-linecap", "round");
    s.setAttribute("stroke-linejoin", "round");
    s.setAttribute("aria-hidden", "true");
    const p = document.createElementNS(SVG, "path");
    p.setAttribute("d", d);
    s.append(p);
    return s;
  }
  var chevron = () => icon("m6 9 6 6 6-6");
  var check = () => icon("M20 6 9 17l-5-5");
  function el(tag, props = {}, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v === void 0 || v === false) continue;
      if (v === true) n.setAttribute(k, "");
      else n.setAttribute(k, v);
    }
    for (const k of kids) if (k) n.append(k);
    return n;
  }
  function rows(sel) {
    const out = [];
    const add = (o) => {
      if (!o.hidden) out.push({ value: o.value, label: o.textContent ?? o.value, disabled: o.disabled });
    };
    for (const c of Array.from(sel.children)) {
      if (c instanceof HTMLOptGroupElement) {
        out.push({ value: "", label: c.label, disabled: true, heading: true });
        Array.from(c.children).forEach((o) => add(o));
      } else if (c instanceof HTMLOptionElement) add(c);
    }
    return out;
  }
  function enhanceSelect(sel) {
    if (sel.dataset.themed || sel.multiple || sel.size > 1) return;
    sel.dataset.themed = "1";
    const label = el("span", { class: "ts-label" });
    const btn = el("button", { type: "button", class: `${sel.className} bt-select themed-select`.trim(), "aria-haspopup": "listbox", "aria-expanded": "false" }, label, chevron());
    sel.classList.add("ts-native");
    sel.tabIndex = -1;
    sel.setAttribute("aria-hidden", "true");
    sel.after(btn);
    const sync = () => {
      const opt2 = sel.options[sel.selectedIndex];
      label.textContent = opt2?.textContent ?? "";
      label.classList.toggle("hint", !opt2);
      btn.disabled = sel.disabled;
      btn.hidden = sel.hidden;
      const name = sel.getAttribute("aria-label");
      if (name) btn.setAttribute("aria-label", name);
      btn.className = `${sel.className.replace("ts-native", "")} bt-select themed-select`.replace(/\s+/g, " ").trim();
    };
    const valueProp = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
    Object.defineProperty(sel, "value", { configurable: true, get: () => valueProp.get.call(sel), set: (v) => {
      valueProp.set.call(sel, v);
      sync();
    } });
    const indexProp = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "selectedIndex");
    Object.defineProperty(sel, "selectedIndex", { configurable: true, get: () => indexProp.get.call(sel), set: (v) => {
      indexProp.set.call(sel, v);
      sync();
    } });
    new MutationObserver(sync).observe(sel, { childList: true, subtree: true, attributes: true, characterData: true });
    sel.addEventListener("change", sync);
    sync();
    let menu = null;
    let list = [];
    let shown = [];
    let hi = 0;
    let query = "";
    let search = null;
    const choosable = () => shown.map((r, i) => r.heading || r.disabled ? -1 : i).filter((i) => i >= 0);
    const close = (refocus = false) => {
      menu?.remove();
      menu = null;
      btn.setAttribute("aria-expanded", "false");
      window.removeEventListener("pointerdown", away, true);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      if (refocus) btn.focus();
    };
    const away = (e) => {
      if (!menu?.contains(e.target) && !btn.contains(e.target)) close();
    };
    const choose = (r) => {
      if (!r || r.disabled || r.heading) return;
      if (sel.value !== r.value) {
        sel.value = r.value;
        sel.dispatchEvent(new Event("input", { bubbles: true }));
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      }
      close(true);
    };
    function place() {
      if (!menu) return;
      const r = btn.getBoundingClientRect();
      const dock = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--dock-h")) || 0;
      const below = window.innerHeight - dock - r.bottom - 12;
      const above = r.top - 12;
      const up = below < 200 && above > below;
      const w = Math.max(r.width, 176);
      menu.style.minWidth = `${w}px`;
      menu.style.maxHeight = `${Math.max(140, Math.min(340, up ? above : below))}px`;
      menu.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - w - 8))}px`;
      menu.style.top = up ? `${Math.max(8, r.top - menu.offsetHeight - 6)}px` : `${r.bottom + 6}px`;
    }
    const mark = (i, scroll = true) => {
      const ok = choosable();
      if (!ok.length) return;
      hi = ok.includes(i) ? i : ok.reduce((best, c) => Math.abs(c - i) < Math.abs(best - i) ? c : best, ok[0]);
      const kids = Array.from(menu?.querySelector(".ts-list")?.children ?? []);
      kids.forEach((n, k) => n.classList.toggle("bt-select-hi", k === hi && n.classList.contains("ts-option")));
      if (scroll) kids[hi]?.scrollIntoView({ block: "nearest" });
    };
    const draw = () => {
      if (!menu) return;
      const q = query.trim().toLowerCase();
      shown = q ? list.filter((r) => !r.heading && r.label.toLowerCase().includes(q)) : list;
      const body = menu.querySelector(".ts-list");
      body.replaceChildren(
        ...shown.length ? shown.map((r, i) => {
          if (r.heading) return el("div", { class: "ts-heading", role: "presentation" }, document.createTextNode(r.label));
          const chosen = r.value === sel.value;
          const row = el("button", { type: "button", class: "ts-option", role: "option", "aria-selected": String(chosen), disabled: r.disabled }, el("span", { class: "ts-text" }, document.createTextNode(r.label)), chosen ? check() : null);
          row.addEventListener("pointerenter", () => mark(i, false));
          row.addEventListener("click", () => choose(r));
          return row;
        }) : [el("div", { class: "ts-none hint" }, document.createTextNode("Nothing matches"))]
      );
      mark(Math.max(0, shown.findIndex((r) => !r.heading && r.value === sel.value)));
      place();
    };
    const key = (e) => {
      const ok = choosable(), at = ok.indexOf(hi);
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close(true);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        mark(ok[Math.min(ok.length - 1, at + 1)] ?? hi);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        mark(ok[Math.max(0, at - 1)] ?? hi);
      } else if (e.key === "Home") {
        e.preventDefault();
        mark(ok[0] ?? 0);
      } else if (e.key === "End") {
        e.preventDefault();
        mark(ok[ok.length - 1] ?? 0);
      } else if (e.key === "Enter" || e.key === " " && !search) {
        e.preventDefault();
        choose(shown[hi]);
      } else if (e.key === "Tab") close();
      else if (!search && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        const k = e.key.toLowerCase();
        const next = ok.find((i) => i > hi && shown[i].label.toLowerCase().startsWith(k));
        const any = next ?? ok.find((i) => shown[i].label.toLowerCase().startsWith(k));
        if (any !== void 0) mark(any);
      }
    };
    const open = () => {
      if (menu || btn.disabled) return;
      list = rows(sel);
      query = "";
      search = list.filter((r) => !r.heading).length > SEARCH_FROM ? el("input", { class: "input ts-search", type: "text", placeholder: "Search\u2026", "aria-label": "Search the list", autocomplete: "off", spellcheck: "false" }) : null;
      menu = el("div", { class: `bt-menu themed-select-menu tk-pop${sel.closest("turbo-themes-picker") ? " ts-in-picker" : ""}`, role: "listbox", "aria-label": sel.getAttribute("aria-label") ?? void 0 }, search ? el("div", { class: "ts-searchbox" }, search) : null, el("div", { class: "ts-list" }));
      menu.addEventListener("keydown", key);
      search?.addEventListener("input", () => {
        query = search.value;
        draw();
      });
      document.body.append(menu);
      btn.setAttribute("aria-expanded", "true");
      draw();
      window.addEventListener("pointerdown", away, true);
      window.addEventListener("resize", place);
      window.addEventListener("scroll", place, true);
      menu.tabIndex = -1;
      (search ?? menu).focus({ preventScroll: true });
    };
    btn.addEventListener("click", () => menu ? close() : open());
    btn.addEventListener("keydown", (e) => {
      if (!menu && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        e.preventDefault();
        open();
      }
    });
    sel.focus = () => btn.focus();
  }
  function enhanceSelects(root2 = document) {
    const all = () => root2.querySelectorAll("select.input:not([data-themed])").forEach(enhanceSelect);
    all();
    const r = root2;
    if (r.__selectWatch) return;
    r.__selectWatch = true;
    new MutationObserver(all).observe(root2 === document ? document.documentElement : root2, { childList: true, subtree: true });
  }

  // engine/src/picker-element.ts
  var SECTIONS = ["theme", "ui", "wallpaper", "updates"];
  var STYLE_ID2 = "turbothemes-picker-css";
  var CSS2 = `
turbo-themes-picker { display: block; color: hsl(var(--fg)); font-size: 0.875rem; line-height: 1.35; }
turbo-themes-picker .tt-panel { display: grid; gap: 1rem; padding: 1rem; box-sizing: border-box; max-width: 100%; }
turbo-themes-picker .tt-sec { display: grid; gap: 0.4rem; min-width: 0; justify-items: start; }
turbo-themes-picker .tt-sec > select, turbo-themes-picker .tt-sec > .themed-select, turbo-themes-picker .tt-sec > .tt-tiles, turbo-themes-picker .tt-sec > .tt-group, turbo-themes-picker .tt-sec > label, turbo-themes-picker .tt-sec > .tt-hint, turbo-themes-picker .tt-sec > .tt-row { justify-self: stretch; }
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
turbo-themes-picker select.input, turbo-themes-picker .themed-select { max-width: 100%; }
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
  var el2 = (tag, props = {}, ...kids) => {
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
        const s = el2("style");
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
        if (this.open && this.hasAttribute("floating") && !this.contains(e.target) && !e.target.closest?.(".themed-select-menu.ts-in-picker")) {
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
        enhanceSelects(this);
        return;
      }
      const pop = el2("div", { class: "card tt-pop" }, body);
      pop.hidden = !this.open;
      const btn = el2("button", { class: "btn", type: "button", textContent: this.getAttribute("label") ?? "Themes" });
      btn.setAttribute("aria-expanded", String(this.open));
      btn.addEventListener("click", () => {
        this.open = !this.open;
        this.render();
      });
      this.append(el2("div", { class: "tt-float" }, pop, btn));
      enhanceSelects(this);
    }
    panel() {
      const root2 = el2("div", { class: "tt-panel" });
      for (const s of this.sections()) {
        const sec = { theme: () => this.themeSection(), ui: () => this.styleSection(), wallpaper: () => this.wallpaperSection(), updates: () => this.updatesSection() }[s]();
        if (sec) root2.append(sec);
      }
      return root2;
    }
    section(title, ...kids) {
      const s = el2("div", { class: "tt-sec" }, el2("h3", { textContent: title }));
      for (const k of kids) if (k) s.append(k);
      return s;
    }
    select(label, items, value, onChange) {
      const sel = el2("select", { class: "input" });
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
        const sel = el2("select", { class: "input" });
        for (const g of groups) {
          const og = el2("optgroup");
          og.label = g.label;
          for (const t of g.items) og.append(opt(t.label, t.id, t.id === cur.theme));
          sel.append(og);
        }
        sel.value = cur.theme;
        sel.setAttribute("aria-label", "Colours");
        sel.addEventListener("change", () => this.changed({ theme: sel.value }));
        return this.section("Colours", sel, this.matchingButton());
      }
      const wrap = el2("div", { class: "tt-sec" });
      wrap.addEventListener("mouseleave", () => p.preview(null));
      for (const g of groups) {
        const grid = el2("div", { class: "tt-tiles", role: "radiogroup" });
        grid.setAttribute("aria-label", g.label);
        for (const t of g.items) {
          const tile = el2("button", { class: "tt-tile", type: "button", title: t.note ? `${t.label}: ${t.note}` : t.label });
          tile.setAttribute("role", "radio");
          tile.setAttribute("aria-checked", String(t.id === cur.theme));
          if (t.colors) {
            const sw = el2("span", { class: "tt-sw" });
            for (const c of [t.colors.bg, t.colors.surface, t.colors.accent, t.colors.text]) {
              const i = el2("i");
              i.style.background = c;
              sw.append(i);
            }
            tile.append(sw);
          }
          tile.append(el2("span", { class: "tt-name", textContent: t.label }));
          tile.addEventListener("click", () => this.changed({ theme: t.id }));
          tile.addEventListener("mouseenter", () => p.preview({ theme: t.id }));
          tile.addEventListener("focus", () => p.preview({ theme: t.id }));
          tile.addEventListener("blur", () => p.preview(null));
          grid.append(tile);
        }
        wrap.append(el2("div", { class: "tt-group" }, el2("h4", { textContent: g.label }), grid));
      }
      return this.section("Colours", wrap, this.matchingButton());
    }
    matchingButton() {
      const m = this.picker.matchingTheme();
      if (!m || m === this.picker.getState().appearance.theme) return null;
      const label = this.picker.themes().flatMap((g) => g.items).find((t) => t.id === m)?.label ?? m;
      const b = el2("button", { class: "btn", type: "button", textContent: `Use matching colours (${label})` });
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
      const hint = el2("p", { class: "tt-hint" });
      const describe = (id) => {
        const s = styles.find((x) => x.id === id);
        hint.textContent = s ? `${s.description}${s.isAuto ? ` On this device that is ${p.device().name}.` : ""}` : "";
      };
      describe(cur.ui);
      let control;
      if (this.getAttribute("variant") === "tiles") {
        const grid = el2("div", { class: "tt-tiles", role: "radiogroup" });
        grid.setAttribute("aria-label", "UI style");
        grid.addEventListener("mouseleave", () => {
          p.preview(null);
          describe(cur.ui);
        });
        for (const s of styles) {
          const tile = el2("button", { class: "tt-tile", type: "button", title: s.description }, el2("span", { class: "tt-name", textContent: s.label }));
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
      const row = el2("div", { class: "tt-row" }, el2("span", { textContent: "Glass" }));
      for (const g of ["regular", "clear"]) {
        const b = el2("button", { class: "btn", type: "button", textContent: g });
        b.setAttribute("aria-pressed", String(v === g));
        b.addEventListener("click", () => this.changed({ glass: g }));
        row.append(b);
      }
      return row;
    }
    wallpaperSection() {
      const p = this.picker, a = p.getState().appearance;
      const on = el2("input", { type: "checkbox", checked: !!a.wallpaper });
      on.addEventListener("change", () => this.changed({ wallpaper: on.checked }));
      const check2 = el2("label", { class: "tt-inline" }, on, "Show a wallpaper");
      const dark = el2("input", { type: "range", min: "0", max: "90", value: String(Math.round((a.wallpaperDarkness ?? 0.3) * 100)) });
      dark.setAttribute("aria-label", "Wallpaper darkness");
      dark.addEventListener("input", () => {
        this.busy = true;
        this.changed({ wallpaperDarkness: Number(dark.value) / 100 });
        this.busy = false;
      });
      const file = el2("input", { type: "file", accept: "image/*", hidden: true });
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
      const load = el2("label", { class: "btn" }, p.wallpaper.hasCustom() ? "Choose another picture" : "Use my own picture", file);
      const row = el2("div", { class: "tt-row" }, load);
      if (p.wallpaper.hasCustom()) {
        const own = el2("button", { class: "btn", type: "button", textContent: a.wallpaperCustom ? "Use the theme wallpaper" : "Use my picture" });
        own.addEventListener("click", () => this.changed({ wallpaperCustom: !a.wallpaperCustom }));
        const rm = el2("button", { class: "btn", type: "button", textContent: "Remove my picture" });
        rm.addEventListener("click", () => p.wallpaper.clearCustom());
        row.append(own, rm);
      }
      return this.section("Wallpaper", check2, a.wallpaper ? el2("label", {}, "Darkness", dark) : null, a.wallpaper ? row : null, this.message ? el2("p", { class: "tt-hint", textContent: this.message }) : null);
    }
    updatesSection() {
      const p = this.picker, v = p.version();
      const status = el2("span", { class: "tt-hint", textContent: `${v.origin === "downloaded" ? "Downloaded" : "Built-in"} themes ${v.hash}` });
      const btn = el2("button", { class: "btn", type: "button", textContent: "Check for newer themes" });
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        status.textContent = "Checking\u2026";
        const r = await p.checkForUpdates();
        status.textContent = r.message;
        btn.disabled = false;
      });
      return this.section("Themes", el2("div", { class: "tt-row" }, btn, status));
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
  return __toCommonJS(index_exports);
})();
