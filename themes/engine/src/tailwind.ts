/**
 * A Tailwind preset: the colour names, corner radius and font the themes provide, as Tailwind utilities
 * (bg-surface, text-muted, border-line, rounded-theme, font-sans ...).
 *
 *   // tailwind.config.ts
 *   import turbothemes from 'turbothemes/tailwind';
 *   export default { presets: [turbothemes], content: [...] };
 */
const c = (v: string) => `hsl(var(--${v}) / <alpha-value>)`;

const preset = {
  theme: {
    extend: {
      colors: {
        bg: c('bg'), surface: c('surface'), raised: c('raised'), line: c('line'), hover: c('hover'),
        fg: c('fg'), muted: c('muted'), accent: c('accent'), 'accent-fg': c('accent-fg'),
        good: c('good'), warn: c('warn'), bad: c('bad'), top: c('top'),
      },
      borderRadius: { theme: 'var(--radius)' },
      fontFamily: { sans: 'var(--font)' },
    },
  },
};

export default preset;
