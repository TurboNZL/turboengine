import { API_VERSION, type Catalog, type Manifest } from './types.ts';
import { validateCatalog } from './catalog.ts';
import { BUILTIN, currentBundle, installBundle, store, type Bundle } from './bundle.ts';
import { hashText } from './hash.ts';
import { safeGet, safeSet, storageKey } from './options.ts';
import type { Source } from './source.ts';

export type UpdateStatus = 'updated' | 'current' | 'engine-too-old' | 'failed';

export interface UpdateResult {
  status: UpdateStatus;
  /** One sentence for the user. */
  message: string;
  added?: string[];
  removed?: string[];
}

const ids = (c: Catalog) => [...c.palettes.map((p) => `colour:${p.id}`), ...c.styles.map((s) => `style:${s.id}`)];

const fetchBundle = async (source: Source): Promise<{ manifest: Manifest; catalogText: string; css: string }> => {
  const manifest = JSON.parse(await source.fetchText('manifest.json')) as Manifest;
  const [catalogText, css] = await Promise.all([source.fetchText(manifest.files.catalog), source.fetchText(manifest.files.css)]);
  return { manifest, catalogText, css };
};

/** Downloads the newest themes and switches to them. Never throws: a failed update leaves the current themes alone. */
export async function checkForUpdates(source: Source, o: { retryDelayMs?: number } = {}): Promise<UpdateResult> {
  const result = await tryUpdate(source, o);
  // a failed check (offline, rate limited) does not count: the next start tries again instead of waiting out the interval
  if (result.status !== 'failed') safeSet(storageKey('themesChecked'), String(Date.now()));
  return result;
}

async function tryUpdate(source: Source, o: { retryDelayMs?: number }): Promise<UpdateResult> {
  try {
    const head = JSON.parse(await source.fetchText('manifest.json')) as Manifest;
    if (head.apiVersion > API_VERSION) return { status: 'engine-too-old', message: 'These themes need a newer turbothemes engine. Update the turbothemes package in this app.' };
    if (head.hash === currentBundle().manifest.hash) return { status: 'current', message: 'Themes are up to date.' };

    let got = await fetchBundle(source);
    // the files are read one after another; if someone pushed in between, they will not match the manifest: read once more
    if (hashText(got.catalogText + '\n' + got.css) !== got.manifest.hash) {
      await new Promise((r) => setTimeout(r, o.retryDelayMs ?? 1200));
      got = await fetchBundle(source);
      if (hashText(got.catalogText + '\n' + got.css) !== got.manifest.hash) return { status: 'failed', message: 'The downloaded themes do not match their checksum. Try again in a minute.' };
    }
    const catalog = JSON.parse(got.catalogText) as Catalog;
    const problems = validateCatalog(catalog);
    if (problems.length) return { status: 'failed', message: `The downloaded themes are not valid (${problems[0]}). Keeping the current ones.` };
    if (catalog.apiVersion > API_VERSION) return { status: 'engine-too-old', message: 'These themes need a newer turbothemes engine. Update the turbothemes package in this app.' };

    const before = new Set(ids(currentBundle().catalog));
    const after = new Set(ids(catalog));
    const bundle: Bundle = { manifest: got.manifest, catalog, css: got.css };
    installBundle(bundle, 'downloaded');
    store(bundle);
    const added = [...after].filter((x) => !before.has(x)).map((x) => x.split(':')[1]);
    const removed = [...before].filter((x) => !after.has(x)).map((x) => x.split(':')[1]);
    return { status: 'updated', message: added.length ? `Themes updated: ${added.length} new.` : 'Themes updated.', added, removed };
  } catch (e) {
    return { status: 'failed', message: `Could not reach the themes (${e instanceof Error ? e.message : String(e)}).` };
  }
}

export const lastChecked = (): number | null => { const v = Number(safeGet(storageKey('themesChecked'))); return v > 0 ? v : null; };

/** True if a background check is due. */
export const checkDue = (everyMs: number) => { const last = lastChecked(); return last === null || Date.now() - last > everyMs; };

export const builtinHash = () => BUILTIN.manifest.hash;
