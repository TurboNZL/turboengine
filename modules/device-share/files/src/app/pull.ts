/**
 * Fetching a "shelf" from a computer that put one up for this device (see `electron/share.cjs`). A phone cannot listen for a sender, so the
 * person pastes the link the computer shows (its address and a long random token in one), and this downloads the project, the caption style, the
 * fonts and the media. Plain `fetch` and no DOM, so it runs the same in the app, a browser and the tests.
 */
export const SHARE_PORT = 47903;

export interface Pulled {
  from: string;
  project: string;
  preset: string | null;
  media: File[];
  fonts: File[];
  /** Number of Twitch clips that were sent as links inside the project (the receiving device downloads them). */
  links: number;
}

export interface PullOptions {
  fetch?: typeof fetch;
  signal?: AbortSignal;
  /** `done` and `total` are bytes of the whole shelf. */
  onProgress?: (done: number, total: number, label: string) => void;
}

interface Manifest {
  from?: { name?: string };
  summary?: { links?: number };
  items: { n: number; kind: string; name: string; size: number }[];
}

/**
 * The link the computer shows: http://192.168.1.20:47903/shelf/<token>. Surrounding text, quotes and a trailing slash or part path are
 * tolerated (people paste from chat apps). Returns the computer's base address and the token, or null when it is not such a link.
 */
export function parseLink(input: string): { base: string; token: string } | null {
  const m = /https?:\/\/([a-z0-9]([a-z0-9.-]{0,60}[a-z0-9])?)(?::(\d{1,5}))?\/shelf\/([A-Za-z0-9_-]{22})(?![A-Za-z0-9_-])/i.exec(input.trim());
  if (!m) return null;
  const port = m[3] ? Number(m[3]) : SHARE_PORT;
  if (port < 1 || port > 65535) return null;
  return { base: `http://${m[1]}:${port}`, token: m[4]! };
}

const unreachable = (base: string) =>
  new Error(`Could not reach ${base.replace(/^http:\/\//, '')}. Both devices need to be on the same Wi-Fi. A firewall on the computer may be blocking port ${SHARE_PORT}. (A web page opened over https cannot talk to it: use the TurboCut app.)`);

async function getJson(base: string, path: string, f: typeof fetch, signal?: AbortSignal): Promise<any> {
  let res: Response;
  try {
    res = await f(`${base}${path}`, { signal });
  } catch (e) {
    if (signal?.aborted) throw e;
    throw unreachable(base);
  }
  if (res.status === 404) throw new Error('That link has already been used or has closed (a link works once, for an hour). Get a new one on the computer.');
  if (res.status === 425) throw new Error('The computer is still preparing it. Try again in a moment.');
  if (!res.ok) throw new Error(`The computer answered ${res.status}.`);
  return res.json();
}

/** Download everything on the shelf. Throws a sentence for the person. */
export async function pullShelf(link: string, o: PullOptions = {}): Promise<Pulled> {
  const parsed = parseLink(link);
  if (!parsed) throw new Error('That is not a TurboCut link. It looks like http://192.168.1.20:47903/shelf/… and the computer shows it under File, Send to another device, Get a link.');
  const { base, token } = parsed;
  const f = o.fetch ?? fetch;
  const manifest = (await getJson(base, `/shelf/${token}/manifest`, f, o.signal)) as Manifest;
  if (!Array.isArray(manifest.items) || !manifest.items.some((i) => i.kind === 'project')) throw new Error('What the computer offers is not a TurboCut project.');
  const total = manifest.items.reduce((n, i) => n + (Number(i.size) || 0), 0);
  let done = 0;
  const out: Pulled = { from: String(manifest.from?.name || 'the computer').slice(0, 60), project: '', preset: null, media: [], fonts: [], links: Number(manifest.summary?.links) | 0 };
  for (const item of manifest.items) {
    o.onProgress?.(done, total, item.name);
    let res: Response;
    try {
      res = await f(`${base}/shelf/${token}/part/${item.n}`, { signal: o.signal });
    } catch (e) {
      if (o.signal?.aborted) throw e;
      throw unreachable(base);
    }
    if (!res.ok || !res.body) throw new Error(`The computer could not give ${item.name} (${res.status}).`);
    // Collected as a Blob that points at the pieces so far, so a long video is not copied again with every chunk.
    let blob = new Blob([]);
    const reader = res.body.getReader();
    for (;;) {
      const { value, done: end } = await reader.read();
      if (end) break;
      blob = new Blob([blob, value as BlobPart]);
      done += value!.byteLength;
      o.onProgress?.(done, total, item.name);
    }
    if (item.kind === 'project') out.project = await blob.text();
    else if (item.kind === 'preset') out.preset = await blob.text();
    else if (item.kind === 'font') out.fonts.push(new File([blob], item.name));
    else if (item.kind === 'media') out.media.push(new File([blob], item.name));
  }
  // Best effort: the computer closes the shelf, and shows "sent".
  await f(`${base}/shelf/${token}/done`, { method: 'POST' }).catch(() => {});
  return out;
}
