const c = (v) => `hsl(var(--${v}) / <alpha-value>)`;
const preset = {
  theme: {
    extend: {
      colors: {
        bg: c("bg"),
        surface: c("surface"),
        raised: c("raised"),
        line: c("line"),
        hover: c("hover"),
        fg: c("fg"),
        muted: c("muted"),
        accent: c("accent"),
        "accent-fg": c("accent-fg"),
        good: c("good"),
        warn: c("warn"),
        bad: c("bad"),
        top: c("top")
      },
      borderRadius: { theme: "var(--radius)" },
      fontFamily: { sans: "var(--font)" }
    }
  }
};
var stdin_default = preset;
export {
  stdin_default as default
};
