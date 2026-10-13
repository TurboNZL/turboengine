import type { Config } from 'tailwindcss';
import turbothemes from 'turbothemes/tailwind';

export default {
  presets: [turbothemes], // the colour names (bg, surface, accent ...), rounded-theme and font-sans come from the themes
  content: ['./index.html', './src/**/*.{ts,tsx}'],
} satisfies Config;
