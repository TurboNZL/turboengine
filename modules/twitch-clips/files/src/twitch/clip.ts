/**
 * Twitch clip import.
 *
 * Browsers cannot fetch Twitch clip media directly (CORS), so resolving a clip to an MP4 URL runs in a
 * "resolver" that lives outside the web page: the Electron main process, the Android native layer, or a
 * small LAN host. The editor only needs this interface plus slug parsing.
 *
 * Twitch has no public API that returns clip media URLs, so any resolver depends on Twitch's unofficial
 * web endpoints and can break when they change. Keep all of that inside one resolver implementation.
 */

export interface ResolvedClip {
  slug: string;
  title: string;
  /** Direct URL to the highest quality MP4. */
  url: string;
  width: number;
  height: number;
  fps: number;
  durationSec: number;
}

export interface ClipResolver {
  resolve(slug: string, signal?: AbortSignal): Promise<ResolvedClip>;
}

const SLUG = /^[A-Za-z0-9_-]{4,}$/;

/** Accepts clips.twitch.tv/<slug>, twitch.tv/<channel>/clip/<slug>, m.twitch.tv/..., or a bare slug. */
export function parseClipSlug(input: string): string | null {
  const text = input.trim();
  if (SLUG.test(text) && !text.includes('.')) return text;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
  const parts = url.pathname.split('/').filter(Boolean);
  let slug: string | undefined;
  if (host === 'clips.twitch.tv') slug = parts[0] === 'embed' ? (url.searchParams.get('clip') ?? undefined) : parts[0];
  else if (host === 'twitch.tv') {
    const i = parts.indexOf('clip');
    if (i >= 0) slug = parts[i + 1];
  }
  return slug && SLUG.test(slug) ? slug : null;
}

// ---------------------------------------------------------------- resolving a clip to a downloadable MP4
//
// Twitch has no public API for this. The web player asks `gql.twitch.tv` for a persisted query named `ShareClipRenderStatus` and
// gets back the clip's renditions plus a short-lived signature; the MP4 URL is the rendition's `sourceURL` with `sig` and `token`
// added. yt-dlp's `TwitchClipsIE` does exactly this (client id and hash taken from its `twitch.py`, 2026-10). Both can change
// without notice: when a clip stops resolving, look there first. Everything that knows about Twitch's wire format is in this file
// and in `electron/twitch.cjs` (the same logic for the desktop shell, which can fetch without CORS).

export const TWITCH_GQL = 'https://gql.twitch.tv/gql';
export const TWITCH_CLIENT_ID = 'ue6666qo983tsx6so1t0vnawi233wa';
export const TWITCH_SHARE_HASH = '2db6a3b20eabf510bd3cf465ae2408834b59eb6b8af89ca73ab1486cacecfb63';

export function clipRequestBody(slug: string): string {
  return JSON.stringify([{ operationName: 'ShareClipRenderStatus', variables: { slug }, extensions: { persistedQuery: { version: 1, sha256Hash: TWITCH_SHARE_HASH } } }]);
}

const num = (v: unknown, d = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && Number.isFinite(Number(v)) ? Number(v) : d);

/**
 * Turn Twitch's answer into the best landscape rendition. A clip can also carry a portrait (9:16) version as its second asset;
 * this takes the first asset, the landscape one. Throws an Error with a plain sentence for the person.
 */
export function parseClipResponse(slug: string, json: unknown): ResolvedClip {
  const root: any = Array.isArray(json) ? json[0] : json;
  if (root?.errors?.length && !root?.data?.clip) throw new Error('Twitch refused the request. The clip link may be wrong, or Twitch has changed how clips are fetched.');
  const clip = root?.data?.clip;
  if (!clip) throw new Error('Twitch has no clip with that link. It may have been deleted, or it is private.');
  const token = clip.playbackAccessToken;
  if (!token?.signature || !token?.value) throw new Error('Twitch did not give a download link yet. A new clip can take a minute to finish processing: try again shortly.');
  const asset = Array.isArray(clip.assets) ? clip.assets[0] : undefined;
  const qualities: any[] = Array.isArray(asset?.videoQualities) ? asset.videoQualities.filter((q: any) => typeof q?.sourceURL === 'string') : [];
  if (!qualities.length) throw new Error('Twitch lists no video file for that clip.');
  const best = [...qualities].sort((a, b) => num(b.quality) - num(a.quality) || num(b.frameRate) - num(a.frameRate))[0]!;
  const url = new URL(best.sourceURL);
  url.searchParams.set('sig', token.signature);
  url.searchParams.set('token', token.value);
  const height = Math.round(num(best.quality, 720));
  const ratio = num(asset?.aspectRatio, 16 / 9) || 16 / 9;
  return {
    slug,
    title: typeof clip.title === 'string' && clip.title.trim() ? clip.title.trim() : slug,
    url: url.toString(),
    width: Math.round(height * ratio),
    height,
    fps: Math.round(num(best.frameRate, 30)) || 30,
    durationSec: num(clip.durationSeconds),
  };
}

/** A file name for the downloaded clip: the title without characters a file system refuses, and `.mp4`. */
export function clipFileName(c: Pick<ResolvedClip, 'title' | 'slug'>): string {
  const base = c.title.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  return `${base || c.slug}.mp4`;
}

/** Ask Twitch for a clip's download link. In a page this needs Twitch to allow the request (it may not: use the desktop app). */
export async function resolveClip(slug: string, fetchImpl: typeof fetch = fetch, signal?: AbortSignal): Promise<ResolvedClip> {
  let res: Response;
  try {
    res = await fetchImpl(TWITCH_GQL, { method: 'POST', headers: { 'Client-ID': TWITCH_CLIENT_ID, 'Content-Type': 'text/plain;charset=UTF-8' }, body: clipRequestBody(slug), signal });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new Error('Could not reach Twitch from this page. A browser may block the request; the desktop app can do it.');
  }
  if (!res.ok) throw new Error(`Twitch answered ${res.status}.`);
  return parseClipResponse(slug, await res.json());
}

/** Download a resolved clip, reporting progress (0..1, or undefined when the size is not known). */
export async function downloadClip(c: ResolvedClip, onProgress?: (f?: number) => void, fetchImpl: typeof fetch = fetch, signal?: AbortSignal): Promise<File> {
  let res: Response;
  try {
    res = await fetchImpl(c.url, { signal });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw new Error('Could not download the clip from this page. A browser may block it; the desktop app can do it.');
  }
  if (!res.ok || !res.body) throw new Error(`Twitch answered ${res.status} for the video file.`);
  const total = num(res.headers.get('content-length'));
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    onProgress?.(total ? Math.min(1, got / total) : undefined);
  }
  return new File(chunks as BlobPart[], clipFileName(c), { type: 'video/mp4' });
}
