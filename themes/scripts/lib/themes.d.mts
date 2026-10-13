import type { Catalog, Manifest } from '../../engine/src/types.ts';

export const root: string;
export function buildThemes(options?: { minify?: boolean; dir?: string }): Promise<{ catalog: Catalog; catalogText: string; css: string; manifest: Manifest }>;
