import type { Asset } from '../core/types.ts';

/**
 * Where a media file sits on this computer. The desktop app can tell (the shell reads the path of a picked or dropped file), so a saved
 * project remembers it and opens the file again by itself. Browsers and Android never reveal a path, so there the person is asked for the
 * files, as before (`relinkDialog`). The file is never copied into the project.
 */
interface MediaApi {
  pathFor(file: File): string;
  stat(paths: string[]): Promise<Record<string, number>>;
}
const api = (): MediaApi | undefined => (globalThis as any).turbocut?.media;

/** The path of a file on disk, or undefined (not the desktop app, or a file that has no place on disk). */
export function pathOf(file: File): string | undefined {
  try {
    return api()?.pathFor(file) || undefined;
  } catch {
    return undefined;
  }
}

export const canOpenByPath = (): boolean => !!api();

/** Open the files of these assets again from their remembered paths. Only a file that still exists, with the size it had, comes back. */
export async function filesFromPaths(assets: Pick<Asset, 'name' | 'path' | 'size'>[]): Promise<File[]> {
  const a = api();
  const wanted = assets.filter((x) => x.path);
  if (!a || !wanted.length) return [];
  const found = await a.stat(wanted.map((x) => x.path!)).catch(() => ({}) as Record<string, number>);
  const out: File[] = [];
  for (const x of wanted) {
    const size = found[x.path!];
    if (size === undefined || (x.size !== undefined && x.size !== size)) continue;
    try {
      const res = await fetch(new URL(`/media/${encodeURIComponent(x.path!)}`, location.origin));
      if (res.ok) out.push(new File([await res.blob()], x.name));
    } catch {
      /* unreadable now: it stays in the list of media to find */
    }
  }
  return out;
}
