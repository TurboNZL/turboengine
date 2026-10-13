import { defineConfig } from 'vitest/config';
import { buildThemes } from './scripts/lib/themes.mjs';

// `virtual:builtin` is the themes/ folder built in memory, the same thing scripts/build.mjs bakes into dist/engine.js
const built = await buildThemes({ minify: false });
const source = `export default ${JSON.stringify({ manifest: built.manifest, catalog: built.catalog, css: built.css })};`;

export default defineConfig({
  plugins: [{
    name: 'builtin',
    resolveId: (id) => (id === 'virtual:builtin' ? '\0virtual:builtin' : null),
    load: (id) => (id === '\0virtual:builtin' ? source : null),
  }],
  test: { include: ['test/**/*.test.ts'], environment: 'node', environmentOptions: { happyDOM: { settings: { disableCSSFileLoading: true } } } },
});
