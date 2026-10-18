import { exportPreset } from '../captions/presets.ts';
import { serializeProject } from '../core/projectFile.ts';
import type { Project } from '../core/types.ts';
import type { Actions } from './actions.ts';
import { dialog, h } from './dom.ts';
import { fontsForFamilies, importFont, toBase64 } from './fonts.ts';
import { importPresetFile } from './presetIO.ts';
import { platform } from './platform.ts';
import type { Store } from './store.ts';

export interface ShareDevice {
  id: string;
  name: string;
  ip: string;
  port: number;
  version: string;
  platform: string;
}
interface Offer {
  offerId: string;
  from: { id: string; name: string };
  summary: { project: string; media: number; fonts: number; bytes: number };
}
interface Received {
  from: { id: string; name: string };
  project: string;
  preset: string | null;
  media: { name: string; url: string }[];
  fonts: { name: string; url: string }[];
}
interface Reply {
  ok: boolean;
  message?: string;
  id?: string;
  transfer?: string;
}
interface ShareApi {
  configure(o: { enabled: boolean; name: string }): Promise<{ running: boolean; error?: string }>;
  devices(): Promise<ShareDevice[]>;
  on(what: 'devices' | 'offer' | 'received', fn: (x: any) => void): void;
  answer(offerId: string, accept: boolean): void;
  offer(deviceId: string, summary: { project: string; media: number; fonts: number; bytes: number }): Promise<Reply>;
  partOpen(transfer: string, kind: string, name: string): Promise<Reply>;
  partWrite(transfer: string, id: string, bytes: Uint8Array): Promise<Reply>;
  partEnd(transfer: string, id: string): Promise<Reply>;
  finish(transfer: string): Promise<Reply>;
  abort(transfer: string): void;
}

/** Sending and receiving projects between TurboCut apps on one network is done by the desktop shell (a page cannot listen or broadcast). */
export const shareApi: ShareApi | undefined = (globalThis as any).turbocut?.share;

const CHUNK = 2 * 1024 * 1024;
const mb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(n >= 10485760 ? 0 : 1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Every family name the project asks for: text layers and the active caption style. */
export function fontFamiliesUsed(p: Project, styles: { fontname: string }[], defaultFont: string): string[] {
  const out = new Set<string>([defaultFont, ...styles.map((s) => s.fontname)]);
  for (const t of p.tracks) for (const c of t.clips) if (c.text) out.add(c.text.style.fontname);
  return [...out].filter(Boolean);
}

/** What would be sent: the media files that are open, the font files the project uses that were added to TurboCut. */
export async function collectShare(store: Store) {
  const media = Object.values(store.project.assets)
    .map((a) => ({ name: a.name, blob: store.lib.fileFor(a.id) }))
    .filter((m): m is { name: string; blob: Blob } => !!m.blob);
  const fonts = await fontsForFamilies(fontFamiliesUsed(store.project, store.preset.styles, store.settings.defaultFont));
  return { media, fonts };
}

/** Turn sharing on or off to match the settings, answer offers with a window, and open what arrives. Desktop app only. */
export function startSharing(store: Store, actions: Actions): void {
  const api = shareApi;
  if (!api) return;
  const apply = () => void api.configure({ enabled: store.settings.shareEnabled, name: store.settings.deviceName });
  let last = '';
  const sig = () => `${store.settings.shareEnabled}|${store.settings.deviceName}`;
  last = sig();
  apply();
  store.on('settings', () => {
    if (sig() === last) return;
    last = sig();
    apply();
  });

  api.on('offer', (o: Offer) => {
    const answered = () => (watch && clearTimeout(watch), dlg.close());
    const dlg = dialog('Incoming project', h('div', { class: 'stack' },
      h('p', {}, h('strong', {}, o.from.name), ' wants to send you ', h('strong', {}, `"${o.summary.project}"`), '.'),
      h('p', { class: 'hint' }, `${o.summary.media} media file${o.summary.media === 1 ? '' : 's'}${o.summary.fonts ? `, ${o.summary.fonts} font${o.summary.fonts === 1 ? '' : 's'}` : ''}, ${mb(o.summary.bytes)} in all. Nothing is saved on this device until you accept. Only accept from a device you know.`)), [
      h('button', { class: 'btn btn-accent', onclick: () => (api.answer(o.offerId, true), store.say(`Receiving from ${o.from.name}…`), answered()) }, 'Accept'),
      h('button', { class: 'btn', onclick: () => (api.answer(o.offerId, false), answered()) }, 'Decline'),
    ]);
    const watch: ReturnType<typeof setTimeout> | undefined = setTimeout(() => dlg.close(), 60_000);
    // closed with the X or a press outside: that is a decline
    const gone = new MutationObserver(() => dlg.el.isConnected || (gone.disconnect(), api.answer(o.offerId, false)));
    gone.observe(document.body, { childList: true });
  });

  api.on('received', async (r: Received) => {
    try {
      const get = async (x: { name: string; url: string }) => new File([await (await fetch(x.url)).blob()], x.name);
      for (const f of r.fonts) await importFont(await get(f)).catch(() => []);
      if (r.preset) await importPresetFile(store, new File([r.preset], 'received.turbocut-preset.json', { type: 'application/json' }));
      const files = await Promise.all(r.media.map(get));
      await actions.openReceived(r.project, files, r.from.name);
    } catch (e) {
      store.say(`Could not open what ${r.from.name} sent: ${e instanceof Error ? e.message : e}`);
    }
  });
}

/** The "Send to another device" window: the apps found on the network, what to include, progress. */
export function openSendDialog(store: Store): void {
  const api = shareApi;
  if (!api) {
    dialog('Send to another device', h('div', { class: 'stack' },
      h('p', {}, 'Sending a project straight to another TurboCut works between the desktop apps (Windows and Linux).'),
      h('p', { class: 'hint' }, platform === 'android' ? 'This is the Android app. Save the project as a file and move it across instead.' : 'This is the web version. Save the project as a file and move it across instead, or install the desktop app.')));
    return;
  }
  const list = h('div', { class: 'share-list', role: 'list' });
  const note = h('p', { class: 'hint' });
  const progress = h('progress', { class: 'prog', max: 1, value: 0, style: { display: 'none' } });
  const withMedia = h('input', { type: 'checkbox', checked: true, 'aria-label': 'Include the media files' });
  const withFonts = h('input', { type: 'checkbox', checked: true, 'aria-label': 'Include the fonts' });
  const mediaLabel = h('span', {}, 'Include the media files');
  const fontLabel = h('span', {}, 'Include the fonts');
  let devices: ShareDevice[] = [];
  let busy = false;
  let transfer: string | null = null;
  let stats = { media: 0, mediaBytes: 0, fonts: 0, fontBytes: 0 };

  const dlg = dialog('Send to another device', h('div', { class: 'stack' },
    h('p', {}, `Send "${store.project.name}" to another TurboCut on this network. It asks the other person to accept first.`),
    h('label', { class: 'setting' }, withMedia, mediaLabel),
    h('label', { class: 'setting' }, withFonts, fontLabel),
    h('div', { class: 'share-found' }, list),
    note, progress), [h('button', { class: 'btn', onclick: () => dlg.close() }, 'Close')]);
  const stopWatching = new MutationObserver(() => dlg.el.isConnected || (stopWatching.disconnect(), transfer && api.abort(transfer)));
  stopWatching.observe(document.body, { childList: true });

  void collectShare(store).then((c) => {
    stats = { media: c.media.length, mediaBytes: c.media.reduce((n, m) => n + m.blob.size, 0), fonts: c.fonts.length, fontBytes: c.fonts.reduce((n, f) => n + f.bytes.byteLength, 0) };
    mediaLabel.textContent = stats.media ? `Include the media files (${stats.media}, ${mb(stats.mediaBytes)})` : 'No media files are open to include';
    withMedia.disabled = stats.media === 0;
    withMedia.checked = stats.media > 0;
    fontLabel.textContent = stats.fonts ? `Include the fonts (${stats.fonts})` : 'No added fonts are used by this project';
    withFonts.disabled = stats.fonts === 0;
    withFonts.checked = stats.fonts > 0;
  });

  const draw = () => {
    note.textContent = devices.length ? '' : 'Looking for other TurboCut apps on this network… Both need to be on the same network with sharing turned on (Settings, Device).';
    list.replaceChildren(...devices.map((d) => h('div', { class: 'share-device', role: 'listitem' },
      h('div', {}, h('strong', {}, d.name), h('small', { class: 'hint' }, ` ${d.platform} · ${d.version}`)),
      h('button', { class: 'btn btn-accent', disabled: busy, onclick: () => void send(d) }, 'Send'))));
  };
  api.on('devices', (l: ShareDevice[]) => ((devices = l), !busy && draw()));
  void api.devices().then((l) => ((devices = l), draw()));
  draw();

  const send = async (dev: ShareDevice) => {
    busy = true;
    draw();
    progress.style.display = '';
    progress.value = 0;
    try {
      const c = await collectShare(store);
      const media = withMedia.checked ? c.media : [];
      const fonts = withFonts.checked ? c.fonts : [];
      const preset = store.preset.builtin ? null : exportPreset(store.preset, []);
      const projectText = serializeProject(store.project);
      const total = new Blob([projectText]).size + (preset?.length ?? 0) + media.reduce((n, m) => n + m.blob.size, 0) + fonts.reduce((n, f) => n + f.bytes.byteLength, 0);
      note.textContent = `Waiting for ${dev.name} to accept…`;
      const o = await api.offer(dev.id, { project: store.project.name, media: media.length, fonts: fonts.length, bytes: total });
      if (!o.ok || !o.transfer) throw new Error(o.message || 'Could not send.');
      transfer = o.transfer;
      let sent = 0;
      const part = async (kind: string, name: string, blob: Blob) => {
        const open = await api.partOpen(transfer!, kind, name);
        if (!open.ok || !open.id) throw new Error(open.message || 'Could not send.');
        for (let at = 0; at < blob.size || at === 0; at += CHUNK) {
          const bytes = new Uint8Array(await blob.slice(at, at + CHUNK).arrayBuffer());
          const w = await api.partWrite(transfer!, open.id, bytes);
          if (!w.ok) throw new Error(w.message || 'Lost the connection.');
          sent += bytes.length;
          progress.value = total ? sent / total : 1;
          note.textContent = `Sending to ${dev.name}… ${Math.round((sent / Math.max(1, total)) * 100)}%`;
          if (blob.size === 0) break;
        }
        const end = await api.partEnd(transfer!, open.id);
        if (!end.ok) throw new Error(end.message || 'Lost the connection.');
      };
      await part('project', 'project.turbocut', new Blob([projectText]));
      if (preset) await part('preset', 'style.json', new Blob([preset]));
      for (const f of fonts) await part('font', `${f.families[0] ?? 'font'}.ttf`, new Blob([f.bytes]));
      for (const m of media) await part('media', m.name, m.blob);
      const done = await api.finish(transfer);
      if (!done.ok) throw new Error(done.message || 'The other device could not open it.');
      transfer = null;
      store.say(`Sent "${store.project.name}" to ${dev.name}.`);
      dlg.close();
    } catch (e) {
      if (transfer) api.abort(transfer);
      transfer = null;
      busy = false;
      progress.style.display = 'none';
      draw();
      note.textContent = e instanceof Error ? e.message : String(e);
    }
  };
}
