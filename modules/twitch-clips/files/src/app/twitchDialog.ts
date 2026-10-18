import { downloadClip, parseClipSlug, resolveClip } from '../twitch/clip.ts';
import type { Actions } from './actions.ts';
import { dialog, h } from './dom.ts';

interface DesktopTwitch {
  download(slug: string, id: string, onProgress: (f: number | null) => void): Promise<{ ok: true; name: string; bytes: Uint8Array } | { ok: false; cancelled: boolean; message: string }>;
  cancel(id: string): void;
}
const desktop: DesktopTwitch | undefined = (globalThis as any).turbocut?.twitch;

/**
 * Get a Twitch clip as a file. The desktop app asks the shell to do it (a page is not allowed to fetch Twitch); anywhere else the
 * page tries itself, and says so when the browser blocks it. Resolves the landscape version of the clip.
 */
export async function fetchTwitchClip(input: string, onProgress: (f?: number) => void, signal?: AbortSignal): Promise<File> {
  const slug = parseClipSlug(input);
  if (!slug) throw new Error('That does not look like a Twitch clip link. Paste the address of a clip (clips.twitch.tv/... or twitch.tv/name/clip/...).');
  if (desktop) {
    const id = `tw${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
    const stop = () => desktop.cancel(id);
    signal?.addEventListener('abort', stop, { once: true });
    try {
      const r = await desktop.download(slug, id, (f) => onProgress(f ?? undefined));
      if (!r.ok) throw r.cancelled ? new DOMException('Cancelled', 'AbortError') : new Error(r.message);
      return new File([r.bytes as BlobPart], r.name, { type: 'video/mp4' });
    } finally {
      signal?.removeEventListener('abort', stop);
    }
  }
  const clip = await resolveClip(slug, fetch, signal);
  onProgress(0);
  return downloadClip(clip, onProgress, fetch, signal);
}

/** The "Twitch clip" window of the media bin: paste a link, the landscape clip lands in the bin. */
export function openTwitchImport(actions: Actions): void {
  const input = h('input', { class: 'input', type: 'url', placeholder: 'https://clips.twitch.tv/…', 'aria-label': 'Twitch clip link', autocomplete: 'off', spellcheck: false });
  const note = h('p', { class: 'hint' }, 'Paste the address of a clip. TurboCut downloads the landscape version into the media bin. Only use clips you have the right to use.');
  const progress = h('progress', { class: 'prog', max: 1, value: 0, style: { display: 'none' } });
  const go = h('button', { class: 'btn btn-accent' }, 'Download');
  const cancel = h('button', { class: 'btn btn-ghost' }, 'Cancel');
  const dlg = dialog('Import a Twitch clip', h('div', { class: 'stack' }, h('label', { class: 'setting col' }, h('span', { class: 'prop-l' }, 'Clip link'), input), note, progress), [cancel, go]);
  let abort: AbortController | null = null;
  const closeAll = () => (abort?.abort(), dlg.close());
  cancel.addEventListener('click', closeAll);
  const run = async () => {
    if (abort) return;
    abort = new AbortController();
    go.disabled = true;
    input.disabled = true;
    progress.style.display = '';
    progress.removeAttribute('value');
    note.textContent = 'Asking Twitch…';
    try {
      const file = await fetchTwitchClip(input.value, (f) => (f == null ? progress.removeAttribute('value') : ((progress.value = f), (note.textContent = `Downloading… ${Math.round(f * 100)}%`))), abort.signal);
      note.textContent = 'Adding it to the media bin…';
      await actions.importMedia([file]);
      dlg.close();
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      note.textContent = e instanceof Error ? e.message : String(e);
      progress.style.display = 'none';
      go.disabled = false;
      input.disabled = false;
      abort = null;
    }
  };
  go.addEventListener('click', () => void run());
  input.addEventListener('keydown', (e) => e.key === 'Enter' && void run());
  queueMicrotask(() => input.focus());
}
