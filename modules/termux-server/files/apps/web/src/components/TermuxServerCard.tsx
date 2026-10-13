import { useState } from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { useStore } from '../lib/store.ts';
import { explainTermuxFailure, termux, termuxSupported, termuxUrl, useTermux } from '../lib/termux.ts';
import { Section } from './Section.tsx';

const Step = ({ done, n, title, children }: { done: boolean; n: number; title: string; children?: React.ReactNode }) => (
  <li className="flex gap-3">
    {done ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-good" /> : <Circle size={18} className="mt-0.5 shrink-0 text-muted" />}
    <div className="min-w-0 flex-1 space-y-1.5"><div className="text-sm font-medium">{n}. {title}</div>{children}</div>
  </li>
);

/**
 * Settings > This app, Android only: run the TurboMusic server on this phone (beta). The server lives in Termux; the app installs, starts and
 * stops it. The only thing typed by hand is one pasted line, once (Termux's own safety switch can only be flipped from inside Termux).
 */
export function TermuxServerCard() {
  const { status, up, refresh } = useTermux();
  const { settings, updateSettings, syncNow } = useStore();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!termuxSupported() || !status) return null;

  const url = termuxUrl(status.port);
  const usingIt = settings.serverUrl === url && settings.token === status.token && !!status.token;
  const r = status.result;
  const starting = status.module && !up && r.state === 'running';
  const failed = r.state === 'failed' ? explainTermuxFailure(r) : null;
  const act = (fn: () => boolean) => { setError(null); if (!fn()) setError('Termux did not accept the command. Is it installed, and is Android allowing this app to run commands in it (step 3)?'); window.setTimeout(refresh, 600); };
  const useHere = () => { updateSettings({ serverUrl: url, token: status.token }); void syncNow(); };
  const lanHint = 'Other devices on your Wi-Fi can reach it at this phone’s address, port ' + status.port + '.';

  return (
    <Section title="Server module (beta)">
      <p className="text-sm text-muted">Run the TurboMusic server on this phone, so it can hold your library and serve your other devices. It runs inside <b>Termux</b>, which this app sets up and controls; you never type commands except one pasted line, once. It is idle most of the time, but downloads and conversions use battery, so plug in for big imports. Beta: expect rough edges.</p>

      {!status.module && <ol className="space-y-4">
        <Step n={1} title="Get Termux" done={status.termuxInstalled}>
          <p className="text-xs text-muted">Install Termux from <b>F-Droid</b> or its GitHub releases (not the Play Store version, which is abandoned).</p>
          {!status.termuxInstalled && <button className="btn" onClick={() => termux.openInstallPage()}>Open the Termux page (F-Droid)</button>}
        </Step>
        <Step n={2} title="One-time step in Termux" done={status.granted && !failed?.includes('one-time')}>
          <p className="text-xs text-muted">Termux only takes commands from other apps after you switch that on inside Termux. Copy the line, open Termux, paste it (long-press → Paste), press Enter. Then come back.</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn" disabled={!status.termuxInstalled} onClick={() => { termux.copyLine(); setCopied(true); }}>{copied ? 'Copied ✓' : 'Copy the line'}</button>
            <button className="btn" disabled={!status.termuxInstalled} onClick={() => termux.openTermux()}>Open Termux</button>
          </div>
        </Step>
        <Step n={3} title="Let this app run commands in Termux" done={status.granted}>
          <button className="btn" disabled={!status.termuxInstalled || status.granted} onClick={() => { termux.requestPermission(); window.setTimeout(refresh, 1200); }}>{status.granted ? 'Allowed' : 'Allow'}</button>
        </Step>
        <Step n={4} title="Install and start the server" done={false}>
          <p className="text-xs text-muted">Termux downloads Node, ffmpeg and yt-dlp and the server (a few minutes, a few hundred MB). The app tells you when it is up.</p>
          <button className="btn btn-accent" disabled={!status.termuxInstalled || !status.granted} onClick={() => act(termux.install)}>Install the server</button>
        </Step>
      </ol>}

      {status.module && <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className={up ? 'chip !text-good' : starting ? 'chip' : 'chip !text-warn'}>{up ? 'Running' : starting ? 'Installing or starting…' : 'Stopped'}</span>
          {starting && <Loader2 size={14} className="animate-spin text-muted" />}
          {up ? <button className="btn" onClick={() => act(termux.stop)}>Stop</button> : <button className="btn btn-accent" disabled={starting} onClick={() => act(termux.start)}>Start</button>}
          <button className="btn btn-ghost" onClick={() => act(termux.install)} title="Download the newest server bundle and start it">Update / repair</button>
        </div>
        {up && !usingIt && <div className="flex flex-wrap items-center gap-2 rounded-theme bg-raised p-3 text-sm">This app is not using it yet.<button className="btn btn-accent" onClick={useHere}>Use it on this phone</button></div>}
        {up && usingIt && <p className="text-sm text-good">This app is using the server on this phone. {lanHint}</p>}
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5" checked={status.autoStart} onChange={(e) => { termux.setOptions(e.target.checked, status.wake); refresh(); }} />Start the server when this app opens</label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5" checked={status.wake} onChange={(e) => { termux.setOptions(status.autoStart, e.target.checked); refresh(); }} /><span>Keep the phone awake while it runs (uses more battery; takes effect at the next start). Without it Android may pause the server when the screen is off.</span></label>
        <div className="flex flex-wrap gap-2 border-t border-line pt-3">
          <button className="btn text-bad" onClick={() => {
            const del = confirm('Remove the server module?\n\nOK removes the program and keeps your library files in Termux.\nIf you also want the library deleted, press Cancel and use “Remove and delete the library”.');
            if (!del) return;
            act(() => termux.remove(false));
            if (usingIt) updateSettings({ serverUrl: '', token: '' });
          }}>Remove the server module…</button>
          <button className="btn btn-ghost text-bad" onClick={() => {
            if (!confirm('Remove the server module AND delete the library stored in Termux (database, audio, pictures)? This cannot be undone.')) return;
            act(() => termux.remove(true));
            if (usingIt) updateSettings({ serverUrl: '', token: '' });
          }}>Remove and delete the library</button>
        </div>
      </div>}

      {(error || failed) && <div role="alert" className="rounded-theme bg-bad/15 p-3 text-sm text-bad">{error ?? failed}</div>}
    </Section>
  );
}
