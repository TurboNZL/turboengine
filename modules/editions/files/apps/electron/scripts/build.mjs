// Bundles the main process (ESM; it includes the server) and the preload script (must be CommonJS) into dist/.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const common = { bundle: true, platform: 'node', target: 'node22', sourcemap: true, logLevel: 'info', absWorkingDir: root };

await build({
  ...common, entryPoints: ['src/main.ts'], outfile: 'dist/main.mjs', format: 'esm',
  // electron is provided by the runtime; node:sqlite is a built-in (the server loads it with process.getBuiltinModule)
  external: ['electron', 'node:sqlite'],
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
});
await build({ ...common, entryPoints: ['src/preload.ts'], outfile: 'dist/preload.cjs', format: 'cjs', external: ['electron'] });

// The Windows server edition (tray app + setup wizard): its own entry and preload, and the wizard page next to them.
await build({
  ...common, entryPoints: ['src/serverEdition/main.ts'], outfile: 'dist/server-main.mjs', format: 'esm', external: ['electron', 'node:sqlite'],
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
});
await build({ ...common, entryPoints: ['src/serverEdition/setup-preload.ts'], outfile: 'dist/setup-preload.cjs', format: 'cjs', external: ['electron'] });
const { copyFileSync } = await import('node:fs');
copyFileSync(join(root, 'src/serverEdition/setup.html'), join(root, 'dist/setup.html'));

// The headless server edition (Linux server .deb / AppImage): no Electron API, run by the Electron binary acting as plain Node (see scripts/serverWrapper.cjs).
await build({
  ...common, entryPoints: ['src/headless.ts'], outfile: 'dist/headless.mjs', format: 'esm', external: ['node:sqlite'],
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
});
