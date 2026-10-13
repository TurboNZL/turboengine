import { useEffect, useState } from 'react';
import { desktop, type DiscordInfo } from '../lib/settings.ts';
import { appVersion, nativeUpdates, type UpdateState } from '../lib/native.ts';
import { Section } from './Section.tsx';

const describe = (s: UpdateState): string => {
  switch (s.status) {
    case 'checking': return 'Checking for updates…';
    case 'none': return s.message ?? 'You are on the latest version.';
    case 'downloading': return `Downloading ${s.version ?? 'the update'}${s.percent != null ? ` (${s.percent}%)` : ''}…`;
    case 'ready': return s.message ? s.message : `${s.version ?? 'The update'} is ready.`;
    case 'disabled': return s.message ?? 'Updates are not available here.';
    case 'error': return `Could not check: ${s.message ?? 'unknown error'}`;
    default: return '';
  }
};

/** Self-update of an installed app (desktop or Android): no command line. Hidden in a browser. */
export function AppUpdatesCard() {
  const up = nativeUpdates();
  const [state, setState] = useState<UpdateState>({ status: 'idle' });
  const [hasToken, setHasToken] = useState(false);
  const [token, setToken] = useState('');
  useEffect(() => {
    if (!up) return;
    let live = true;
    void up.state().then((s) => { if (live) setState(s); });
    void up.hasToken().then((h) => { if (live) setHasToken(h); });
    const off = up.onState((s) => { if (live) setState(s); });
    return () => { live = false; off(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!up) return null;
  const busy = state.status === 'checking' || state.status === 'downloading';
  return (
    <Section title="App updates">
      <p className="text-sm text-muted">The app checks GitHub for a new version when it starts and every few hours, and downloads it in the background. Version {appVersion() ?? '?'}.</p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button className="btn" disabled={busy} onClick={() => void up.check().then(setState)}>Check for updates</button>
        {state.status === 'ready' && <button className="btn btn-accent" disabled={state.installing} onClick={() => up.install()}>{desktop() ? 'Restart to update' : 'Install update'}</button>}
        <span className={state.status === 'error' || state.command ? 'text-warn' : 'text-muted'}>{describe(state)}</span>
      </div>
      {state.command && <div className="flex flex-wrap items-center gap-2 text-sm"><code className="select-all rounded-theme bg-raised px-2 py-1 text-xs">{state.command}</code>
        <button className="btn btn-ghost" onClick={() => void navigator.clipboard?.writeText(state.command!)}>Copy</button></div>}
      <details className="text-sm">
        <summary className="cursor-pointer text-muted">Private repository? Add a GitHub token{hasToken && ' (one is saved)'}</summary>
        <div className="mt-2 space-y-2">
          <p className="text-xs text-muted">While the project's repository is private, the app needs a fine-grained personal access token that can read its contents (GitHub › Settings › Developer settings › Fine-grained tokens, repository access: only this one, permission Contents: read-only). It stays on this device. Not needed once the repository is public.</p>
          <div className="flex flex-wrap items-center gap-2">
            <input className="input w-80 font-mono" type="password" placeholder={hasToken ? 'saved (type a new one to replace it)' : 'github_pat_…'} value={token} onChange={(e) => setToken(e.target.value)} />
            <button className="btn" disabled={!token.trim()} onClick={() => void up.setToken(token).then(() => { setHasToken(true); setToken(''); return up.check(); }).then(setState)}>Save &amp; check</button>
            {hasToken && <button className="btn btn-ghost" onClick={() => void up.setToken('').then(() => setHasToken(false))}>Remove</button>}
          </div>
        </div>
      </details>
    </Section>
  );
}

const DISCORD_LABEL: Record<DiscordInfo['status'], string> = {
  off: 'Off', 'no-id': 'Not set up: this build has no Discord application (see below)', connecting: 'Waiting for Discord to be running…', connected: 'Connected: your song shows on your profile',
};

/** Discord Rich Presence for the desktop app. */
export function DiscordCard() {
  const d = desktop();
  const [info, setInfo] = useState<DiscordInfo | null>(null);
  const [id, setId] = useState('');
  useEffect(() => {
    if (!d?.getDiscord) return;
    void d.getDiscord().then((i) => { setInfo(i); setId(i.discordClientId); });
    const t = setInterval(() => void d.getDiscord().then(setInfo), 4000); // the connection state changes by itself
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!d?.getDiscord || !info) return null;
  const save = (patch: { discordEnabled?: boolean; discordClientId?: string }) => void d.setDiscord(patch).then((i) => { setInfo(i); setId(i.discordClientId); });
  const valid = /^\d{15,25}$/.test(id.trim());
  return (
    <Section title="Discord">
      <p className="text-sm text-muted">Show the song you are playing on your Discord profile ("Listening to …", with a progress bar). Discord's desktop app has to be running on this computer.</p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={info.discordEnabled} onChange={(e) => save({ discordEnabled: e.target.checked })} />Show what I'm playing on Discord</label>
      <div className="text-xs text-muted">Status: {DISCORD_LABEL[info.status]}</div>
      {info.status === 'connecting' && info.detail && <div className="text-xs text-warn">{info.detail}</div>}
      {info.status === 'connecting' && !info.sockets?.length && <div className="text-xs text-muted">If Discord is running, it is probably a Flatpak or Snap one: see the Discord guide under Guides.</div>}
      <details className="text-sm">
        <summary className="cursor-pointer text-muted">{info.builtIn ? 'Use my own Discord application instead (optional)' : 'This build has no Discord application built in: use your own'}</summary>
        <div className="mt-2 space-y-2">
          <p className="text-xs text-muted">Discord only lets a program show a status under the name of a Discord application, so one is always needed behind the scenes. {info.builtIn ? 'The app brings its own; this is only for a different name or picture.' : 'Create one at discord.com/developers/applications (its name is what appears after "Listening to"; an image named logo under Rich Presence › Art Assets is the picture) and paste its Application ID.'}</p>
          <div className="flex flex-wrap items-center gap-2">
            <input className="input w-72 max-w-full font-mono" inputMode="numeric" placeholder="Application ID (18 digits)" value={id} onChange={(e) => setId(e.target.value)} />
            <button className="btn" disabled={!valid || id.trim() === info.discordClientId} onClick={() => save({ discordClientId: id.trim() })}>Save</button>
          </div>
          {id && !valid && <div className="text-xs text-warn">The ID is only digits.</div>}
        </div>
      </details>
    </Section>
  );
}

/** Settings > Desktop app: is the window painted by the GPU, and how the app starts the graphics (Automatic tries the ways one after the other). */
export function GraphicsLine() {
  const d = desktop();
  const [g, setG] = useState<{ hardware: boolean; summary: string; detail: string } | null>(null);
  const [gpu, setGpu] = useState<{ mode: string; auto: { step: number; done: boolean }; running: string; modes: { id: string; label: string; hint: string }[] } | null>(null);
  useEffect(() => { void d?.getGraphics?.().then(setG).catch(() => undefined); void d?.getGpu?.().then((x) => setGpu(x as typeof gpu)).catch(() => undefined); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (!g) return null;
  const running = gpu?.modes.find((m) => m.id === gpu.running);
  return (
    <div className="space-y-2 text-sm">
      <div><span className="text-muted">Graphics: </span><span className={g.hardware ? 'text-good' : 'text-warn'}>{g.summary}</span>{g.detail && <span className="text-muted"> · {g.detail}</span>}</div>
      {gpu && d?.setGpu && <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="gpu-mode" className="text-muted">Graphics start-up</label>
          <select id="gpu-mode" className="input !w-auto" value={gpu.mode} onChange={(e) => { if (confirm('The app restarts to apply this. Continue?')) void d.setGpu!(e.target.value); }}>
            <option value="auto">Automatic (tries the options below until the GPU works)</option>
            {gpu.modes.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          {gpu.mode === 'auto' && !g.hardware && gpu.auto.done && <button className="btn" onClick={() => void d.setGpu!('auto')}>Search again</button>}
          {d.openGpuPage && <button className="btn" onClick={() => d.openGpuPage!()}>Open Chromium's GPU report</button>}
          {d.gpuReport && <button className="btn" onClick={() => void d.gpuReport!().then((t) => navigator.clipboard?.writeText(t))}>Copy graphics report</button>}
        </div>
        <p className="text-xs text-muted">
          {gpu.mode === 'auto'
            ? (gpu.auto.done ? `Settled on “${running?.label ?? gpu.running}”.` : `Looking for a way to start the GPU: now trying “${running?.label ?? gpu.running}”. If it does not work the app restarts itself with the next option (at most five tries).`)
            : (running?.hint ?? '')}
          {!g.hardware && gpu.mode === 'auto' && gpu.auto.done ? ' None of the options gave hardware acceleration: the driver may be missing (check glxinfo -B).' : ''}
        </p>
      </div>}
    </div>
  );
}
