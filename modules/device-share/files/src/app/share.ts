import { exportPreset } from '../captions/presets.ts';
import { serializeProject } from '../core/projectFile.ts';
import type { Project } from '../core/types.ts';
import type { Actions } from './actions.ts';
import { dialog, h } from './dom.ts';
import { fontsForFamilies } from './fonts.ts';
import { platform } from './platform.ts';
import { applyReceived } from './receive.ts';
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
  summary: { project: string; media: number; fonts: number; links?: number; bytes: number };
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
  /** shelfReady: the links another device opens, best address first. */
  links?: string[];
}
interface ShelfEvent {
  id: string;
  state: 'waiting' | 'sending' | 'done' | 'closed' | 'expired';
  sent: number;
  total: number;
}
type Summary = { project: string; media: number; fonts: number; links: number; bytes: number };
interface ShareApi {
  configure(o: { enabled: boolean; name: string }): Promise<{ running: boolean; error?: string }>;
  devices(): Promise<ShareDevice[]>;
  on(what: 'devices' | 'offer' | 'received' | 'shelf', fn: (x: any) => void): void;
  answer(offerId: string, accept: boolean): void;
  offer(deviceId: string, summary: Summary): Promise<Reply>;
  shelfOpen(summary: Summary): Promise<Reply>;
  shelfReady(transfer: string): Promise<Reply>;
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

/**
 * What would be sent: the media files that are open, the font files the project uses that were added to TurboCut. A Twitch clip can go as
 * its link alone (`links`): the project carries the link and the other device downloads the clip itself, which is the smaller transfer
 * and lets that device pick the version it can decode.
 */
export async function collectShare(store: Store) {
  const all = Object.values(store.project.assets).map((a) => ({ name: a.name, blob: store.lib.fileFor(a.id), source: a.source }));
  const media = all.filter((m): m is { name: string; blob: Blob; source: typeof m.source } => !!m.blob);
  const fonts = await fontsForFamilies(fontFamiliesUsed(store.project, store.preset.styles, store.settings.defaultFont));
  return { media, fonts, linked: media.filter((m) => m.source).length + all.filter((m) => !m.blob && m.source).length };
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
      h('p', { class: 'hint' }, `${o.summary.media} media file${o.summary.media === 1 ? '' : 's'}${o.summary.links ? `, ${o.summary.links} Twitch clip${o.summary.links === 1 ? '' : 's'} as a link` : ''}${o.summary.fonts ? `, ${o.summary.fonts} font${o.summary.fonts === 1 ? '' : 's'}` : ''}, ${mb(o.summary.bytes)} in all. Nothing is saved on this device until you accept. Only accept from a device you know.`)), [
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
      await applyReceived(store, actions, { from: r.from.name, project: r.project, preset: r.preset, media: await Promise.all(r.media.map(get)), fonts: await Promise.all(r.fonts.map(get)) });
    } catch (e) {
      store.say(`Could not open what ${r.from.name} sent: ${e instanceof Error ? e.message : e}`);
    }
  });
}

/** The "Send to another device" window: the apps found on the network, what to include, progress, and a link for a phone. */
export function openSendDialog(store: Store): void {
  const api = shareApi;
  if (!api) {
    dialog('Send to another device', h('div', { class: 'stack' },
      h('p', {}, 'Sending a project straight to another TurboCut works from the desktop apps (Windows and Linux): they find each other on the network, and a phone can fetch from a link.'),
      h('p', { class: 'hint' }, platform === 'android' ? 'This is the Android app. Save the project as a file and move it across, or send from a computer: File → Receive from a computer… takes the link it gives.' : 'This is the web version. Save the project as a file and move it across instead, or install the desktop app.')));
    return;
  }
  const list = h('div', { class: 'share-list', role: 'list' });
  const note = h('p', { class: 'hint' });
  const progress = h('progress', { class: 'prog', max: 1, value: 0, style: { display: 'none' } });
  const withMedia = h('input', { type: 'checkbox', checked: true, 'aria-label': 'Include the video files' });
  const withFonts = h('input', { type: 'checkbox', checked: true, 'aria-label': 'Include the fonts' });
  const linkOnly = h('input', { type: 'checkbox', checked: true, 'aria-label': 'Send Twitch clips as links' });
  const mediaLabel = h('span', {}, 'Include the video files');
  const fontLabel = h('span', {}, 'Include the fonts');
  const linkLabel = h('span', {}, 'Send Twitch clips as links');
  const linkRow = h('label', { class: 'setting', hidden: true }, linkOnly, linkLabel);
  const linkBox = h('div', { class: 'share-code', hidden: true });
  const linkBtn = h('button', { class: 'btn', onclick: () => void sendWithLink() }, 'Get a link for a phone');
  let devices: ShareDevice[] = [];
  let busy = false;
  let transfer: string | null = null;
  let shelfWatch: ((e: ShelfEvent) => void) | null = null;
  let stats = { media: 0, mediaBytes: 0, fonts: 0, fontBytes: 0, linked: 0 };

  const dlg = dialog('Send to another device', h('div', { class: 'stack' },
    h('p', {}, `Send "${store.project.name}" to another TurboCut on this network. A computer asks its person to accept first. For a phone, get a link: paste it in TurboCut on the phone and you are done.`),
    h('label', { class: 'setting' }, withMedia, mediaLabel),
    linkRow,
    h('label', { class: 'setting' }, withFonts, fontLabel),
    h('div', { class: 'share-found' }, list),
    h('div', { class: 'row' }, linkBtn),
    linkBox, note, progress), [h('button', { class: 'btn', onclick: () => dlg.close() }, 'Close')]);
  // Closing the window stops a push that is still being sent. A link that is ready stays up (send and forget) until it is used or an hour passes.
  let shelfUp = false;
  const stopWatching = new MutationObserver(() => dlg.el.isConnected || (stopWatching.disconnect(), transfer && !shelfUp && api.abort(transfer)));
  stopWatching.observe(document.body, { childList: true });
  api.on('shelf', (e: ShelfEvent) => shelfWatch?.(e));

  void collectShare(store).then((c) => {
    stats = { media: c.media.length, mediaBytes: c.media.reduce((n, m) => n + m.blob.size, 0), fonts: c.fonts.length, fontBytes: c.fonts.reduce((n, f) => n + f.bytes.byteLength, 0), linked: c.linked };
    mediaLabel.textContent = stats.media ? `Include the video files (${stats.media}, ${mb(stats.mediaBytes)})` : 'No video files are open to include';
    withMedia.disabled = stats.media === 0;
    withMedia.checked = stats.media > 0;
    fontLabel.textContent = stats.fonts ? `Include the fonts (${stats.fonts})` : 'No added fonts are used by this project';
    withFonts.disabled = stats.fonts === 0;
    withFonts.checked = stats.fonts > 0;
    linkRow.hidden = stats.linked === 0;
    linkLabel.textContent = `Send ${stats.linked === 1 ? 'the Twitch clip' : `${stats.linked} Twitch clips`} as a link (the other device downloads ${stats.linked === 1 ? 'it' : 'them'} and picks a version it can play)`;
  });

  const draw = () => {
    note.textContent = devices.length ? '' : 'Looking for other TurboCut apps on this network… Both need to be on the same network with sharing turned on (Settings, Device). For a phone, get a link.';
    list.replaceChildren(...devices.map((d) => h('div', { class: 'share-device', role: 'listitem' },
      h('div', {}, h('strong', {}, d.name), h('small', { class: 'hint' }, ` ${d.platform} · ${d.version}`)),
      h('button', { class: 'btn btn-accent', disabled: busy, onclick: () => void send(d) }, 'Send'))));
  };
  api.on('devices', (l: ShareDevice[]) => ((devices = l), !busy && draw()));
  void api.devices().then((l) => ((devices = l), draw()));
  draw();

  /** What goes: the project (which carries the Twitch links), the caption style, the fonts, the video files that are not sent as links. */
  const gather = async () => {
    const c = await collectShare(store);
    const asLink = linkOnly.checked && !linkRow.hidden;
    const media = withMedia.checked ? c.media.filter((m) => !(asLink && m.source)) : [];
    const fonts = withFonts.checked ? c.fonts : [];
    const preset = store.preset.builtin ? null : exportPreset(store.preset, []);
    const projectText = serializeProject(store.project);
    const parts: { kind: string; name: string; blob: Blob }[] = [
      { kind: 'project', name: 'project.turbocut', blob: new Blob([projectText]) },
      ...(preset ? [{ kind: 'preset', name: 'style.json', blob: new Blob([preset]) }] : []),
      ...fonts.map((f) => ({ kind: 'font', name: `${f.families[0] ?? 'font'}.ttf`, blob: new Blob([f.bytes as BlobPart]) })),
      ...media.map((m) => ({ kind: 'media', name: m.name, blob: m.blob })),
    ];
    const total = parts.reduce((n, p) => n + p.blob.size, 0);
    const links = asLink ? c.linked : 0;
    return { parts, total, summary: { project: store.project.name, media: media.length, fonts: fonts.length, links, bytes: total } satisfies Summary };
  };

  /** Stream parts to the shell, which keeps them for the other device (a push, or a shelf). */
  const upload = async (tr: string, parts: { kind: string; name: string; blob: Blob }[], total: number, say: (pct: number) => void) => {
    let sent = 0;
    for (const p of parts) {
      const open = await api.partOpen(tr, p.kind, p.name);
      if (!open.ok || !open.id) throw new Error(open.message || 'Could not send.');
      for (let at = 0; at < p.blob.size || at === 0; at += CHUNK) {
        const bytes = new Uint8Array(await p.blob.slice(at, at + CHUNK).arrayBuffer());
        const w = await api.partWrite(tr, open.id, bytes);
        if (!w.ok) throw new Error(w.message || 'Lost the connection.');
        sent += bytes.length;
        progress.value = total ? sent / total : 1;
        say(Math.round((sent / Math.max(1, total)) * 100));
        if (p.blob.size === 0) break;
      }
      const end = await api.partEnd(tr, open.id);
      if (!end.ok) throw new Error(end.message || 'Lost the connection.');
    }
  };

  const fail = (e: unknown) => {
    if (transfer) api.abort(transfer);
    transfer = null;
    busy = false;
    linkBtn.disabled = false;
    progress.style.display = 'none';
    draw();
    note.textContent = e instanceof Error ? e.message : String(e);
  };

  const send = async (dev: ShareDevice) => {
    busy = true;
    linkBtn.disabled = true;
    draw();
    progress.style.display = '';
    progress.value = 0;
    try {
      const g = await gather();
      note.textContent = `Waiting for ${dev.name} to accept…`;
      const o = await api.offer(dev.id, g.summary);
      if (!o.ok || !o.transfer) throw new Error(o.message || 'Could not send.');
      transfer = o.transfer;
      await upload(transfer, g.parts, g.total, (pct) => (note.textContent = `Sending to ${dev.name}… ${pct}%`));
      const done = await api.finish(transfer);
      if (!done.ok) throw new Error(done.message || 'The other device could not open it.');
      transfer = null;
      store.say(`Sent "${store.project.name}" to ${dev.name}.`);
      dlg.close();
    } catch (e) {
      fail(e);
    }
  };

  /** Put the parts on a shelf and show the link; the other device opens it (paste it into Receive from a computer). */
  const sendWithLink = async () => {
    busy = true;
    linkBtn.disabled = true;
    linkBox.hidden = true;
    draw();
    progress.style.display = '';
    progress.value = 0;
    try {
      const g = await gather();
      note.textContent = 'Getting it ready…';
      const o = await api.shelfOpen(g.summary);
      if (!o.ok || !o.transfer) throw new Error(o.message || 'Could not get it ready.');
      transfer = o.transfer;
      await upload(transfer, g.parts, g.total, (pct) => (note.textContent = `Getting it ready… ${pct}%`));
      const r = await api.shelfReady(transfer);
      if (!r.ok || !r.links?.length) throw new Error(r.message || 'Could not get it ready.');
      shelfUp = true;
      const shelf = transfer;
      progress.style.display = 'none';
      const field = h('input', { class: 'input share-link', type: 'text', readonly: true, value: r.links[0]!, 'aria-label': 'Link for the other device' }) as HTMLInputElement;
      const copy = h('button', { class: 'btn btn-accent', onclick: async () => {
        field.select();
        try {
          await navigator.clipboard.writeText(field.value);
          copy.textContent = 'Copied';
        } catch {
          copy.textContent = 'Press Ctrl+C'; // clipboard not allowed here: the text is selected, copy it by hand
        }
      } }, 'Copy link');
      linkBox.hidden = false;
      linkBox.replaceChildren(
        h('p', {}, 'On the other device open TurboCut, choose ', h('strong', {}, 'From a computer'), ' (Home screen, or File menu) and paste this link:'),
        h('div', { class: 'share-link-row' }, field, copy),
        ...(r.links.length > 1 ? [h('small', { class: 'hint' }, `If that one does not work, try ${r.links.slice(1).join(' or ')}`)] : []));
      note.textContent = `Ready. The link works once, for an hour, on this Wi-Fi. You can close this window${stats.linked && linkOnly.checked ? '. The Twitch clips download on the other device' : ''}.`;
      shelfWatch = (e) => {
        if (e.id !== shelf) return;
        if (e.state === 'sending') note.textContent = `Sending… ${Math.round((e.sent / Math.max(1, e.total)) * 100)}%`;
        else if (e.state === 'done') {
          transfer = null;
          shelfUp = false;
          store.say(`Sent "${store.project.name}".`);
          dlg.close();
        } else if (e.state === 'expired' || e.state === 'closed') {
          transfer = null;
          shelfUp = false;
          busy = false;
          linkBtn.disabled = false;
          linkBox.hidden = true;
          note.textContent = 'The link has closed. Get a new one to send again.';
        }
      };
    } catch (e) {
      fail(e);
    }
  };
}
