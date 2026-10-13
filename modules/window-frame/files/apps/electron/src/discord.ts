import { Client } from '@xhayper/discord-rpc';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** What the player is doing, as the web client reports it. Seconds, not milliseconds. */
export interface Presence { title: string; artist: string; album: string; duration: number; position: number; playing: boolean }

/** Discord rejects strings shorter than 2 or longer than 128 characters. */
const fit = (s: string, fallback = ''): string => {
  const t = (s || fallback).trim();
  if (t.length < 2) return t.length ? `${t} ` : '';
  return t.length > 128 ? `${t.slice(0, 127)}…` : t;
};

/** The Discord activity for a state of the player ("Listening to Music Curator", with a progress bar while playing). Pure, so it is tested. */
export function buildActivity(p: Presence, now = Date.now()) {
  const a: Record<string, unknown> = {
    type: 2, // Listening
    details: fit(p.title, 'Unknown track'),
    state: fit(p.playing ? p.artist : `Paused${p.artist ? ` · ${p.artist}` : ''}`),
    largeImageKey: 'logo', largeImageText: fit(p.album || 'Music Curator'),
    instance: false,
  };
  if (!a.state) delete a.state;
  if (p.playing && Number.isFinite(p.position)) {
    const start = Math.round(now - Math.max(0, p.position) * 1000);
    a.startTimestamp = start;
    if (p.duration > 0 && Number.isFinite(p.duration)) a.endTimestamp = start + Math.round(p.duration * 1000);
  }
  return a;
}

/** The folders Discord's local socket (`discord-ipc-0`) can be in, per Discord's own client and the sandboxed packagings of it. */
export function socketFolders(env: NodeJS.ProcessEnv = process.env, platform = process.platform): string[] {
  if (platform === 'win32') return [];
  const base = env.XDG_RUNTIME_DIR || env.TMPDIR || env.TMP || env.TEMP || '/tmp';
  return [base, join(base, 'snap.discord'), ...['com.discordapp.Discord', 'com.discordapp.DiscordCanary', 'com.discordapp.DiscordPTB', 'dev.vencord.Vesktop'].map((a) => join(base, 'app', a))];
}

/** Sockets that exist right now (any `discord-ipc-N`), so Settings can say whether a Discord program is there at all. */
export function findSockets(env: NodeJS.ProcessEnv = process.env, platform = process.platform): string[] {
  const out: string[] = [];
  for (const dir of socketFolders(env, platform)) {
    try { for (const f of readdirSync(dir)) if (/^discord-ipc-\d+$/.test(f)) out.push(join(dir, f)); } catch { /* folder missing */ }
  }
  return out;
}

/** A graphical session started from a launcher can lack XDG_RUNTIME_DIR, which is where Discord puts its socket on Linux. */
function ensureRuntimeDir() {
  if (process.platform === 'linux' && !process.env.XDG_RUNTIME_DIR && typeof process.getuid === 'function') {
    const dir = `/run/user/${process.getuid()}`;
    if (existsSync(dir)) process.env.XDG_RUNTIME_DIR = dir;
  }
}

/** Discord limits how fast an activity may change (5 updates per 20 seconds); a faster stream is dropped. */
const MIN_GAP_MS = 4_000;

/**
 * Discord Rich Presence over the local Discord client (IPC). It needs the id of a Discord application, which is the name shown after
 * "Listening to" (create one at discord.com/developers/applications; upload an image called `logo` under Rich Presence > Art Assets
 * for the picture). Nothing happens while Discord is not running: it keeps trying quietly and shows the current song once it is.
 */
export class DiscordPresence {
  private client: Client | null = null;
  private ready = false;
  private last: Presence | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private clientId = '';
  private enabled = false;
  /** the state the user can see in Settings */
  status: 'off' | 'no-id' | 'connecting' | 'connected' = 'off';
  /** why it is not connected, in a sentence the user can act on (empty when connected or off) */
  detail = '';
  private lastSent = 0;
  private sendTimer: ReturnType<typeof setTimeout> | null = null;

  configure(clientId: string, enabled: boolean) {
    const changed = clientId.trim() !== this.clientId || enabled !== this.enabled;
    this.clientId = clientId.trim(); this.enabled = enabled;
    if (!changed) return;
    void this.stop().then(() => { if (this.enabled && this.clientId) this.start(); else this.status = this.enabled ? 'no-id' : 'off'; });
  }

  update(p: Presence | null) { this.last = p; if (this.ready) this.schedule(); }

  /** Send now when the last send is old enough, else once the gap has passed (always the newest state). */
  private schedule() {
    if (this.sendTimer) return;
    const wait = Math.max(0, this.lastSent + MIN_GAP_MS - Date.now());
    if (!wait) { void this.apply(); return; }
    this.sendTimer = setTimeout(() => { this.sendTimer = null; void this.apply(); }, wait);
  }

  private start() {
    ensureRuntimeDir();
    this.status = 'connecting';
    this.detail = '';
    const client = new Client({ clientId: this.clientId });
    this.client = client;
    client.on('ready', () => { if (this.client !== client) return; this.ready = true; this.status = 'connected'; this.detail = ''; this.lastSent = 0; void this.apply(); });
    client.on('disconnected', () => { if (this.client !== client) return; this.ready = false; this.status = 'connecting'; this.detail = 'Discord closed the connection; trying again.'; this.retry(); });
    client.login().catch((e: unknown) => { // Discord is not running (yet), or its socket is out of reach
      if (this.client !== client) return;
      const sockets = findSockets();
      this.detail = sockets.length
        ? `Found Discord at ${sockets[0]} but could not talk to it${e instanceof Error && e.message ? ` (${e.message})` : ''}. Is it the same user, and not a second Discord program?`
        : `No Discord found: no discord-ipc socket in ${socketFolders().join(', ') || 'the named pipes'}. Start Discord's desktop program (a browser tab does not count).`;
      this.retry();
    });
  }

  private retry() {
    if (this.timer || !this.enabled) return;
    this.timer = setTimeout(() => { this.timer = null; void this.stop().then(() => { if (this.enabled && this.clientId) this.start(); }); }, 20_000);
  }

  private async apply() {
    const user = this.client?.user;
    if (!user || !this.ready) return;
    this.lastSent = Date.now();
    try {
      if (this.last) await user.setActivity(buildActivity(this.last) as Parameters<typeof user.setActivity>[0]);
      else await user.clearActivity();
    } catch { /* Discord went away; the disconnect handler retries */ }
  }

  async stop() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.sendTimer) { clearTimeout(this.sendTimer); this.sendTimer = null; }
    const c = this.client; this.client = null; this.ready = false;
    if (c) { try { await c.user?.clearActivity(); } catch { /* ignore */ } try { await c.destroy(); } catch { /* ignore */ } }
  }
}
