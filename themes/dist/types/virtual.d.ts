/** The snapshot of themes/ that the build bakes into the engine (see scripts/build.mjs). It is the look the app has before any update. */
declare module 'virtual:builtin' {
  import type { Catalog, Manifest } from './types.ts';
  const builtin: { manifest: Manifest; catalog: Catalog; css: string };
  export default builtin;
}
