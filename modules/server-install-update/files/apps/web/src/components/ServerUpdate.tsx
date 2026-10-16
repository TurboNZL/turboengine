import { useEffect, useRef, useState } from 'react';
import { ArrowUpCircle } from 'lucide-react';
import { api, useStore } from '../lib/store.ts';
import type { ServerUpdate } from '../lib/api.ts';
import { Section } from './Section.tsx';

/** Settings: update the home server (git pull, install, rebuild the web client, restart) without a terminal. Shown only when the server offers it. */
export function ServerUpdateCard() {
  const configured = useStore((s) => !!s.settings.token || !s.settings.serverUrl);
  const [info, setInfo] = useState<ServerUpdate | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [updated, setUpdated] = useState(false);
  const timer = useRef<number | null>(null);

  const read = () => api().updateInfo().then(setInfo, () => null);
  useEffect(() => { if (configured) void read(); return () => { if (timer.current) clearTimeout(timer.current); }; }, [configured]); // eslint-disable-line react-hooks/exhaustive-deps

  /** follow the update; once the server starts restarting it stops answering, so wait for it to come back */
  const follow = (sawRestart = false, tries = 0) => {
    timer.current = window.setTimeout(async () => {
      try {
        const s = await api().updateInfo();
        setInfo(s);
        if (s.status === 'running') return follow(false, 0);
        if (s.status === 'error') { setWaiting(false); return; }
        if (s.status === 'done' && s.restarting) return follow(true, 0); // about to go down; keep asking until it is back
        setWaiting(false);
        // after a restart the new process starts with a clean state ('idle'): coming back after the restart IS the success
        if (s.status === 'done' || sawRestart) { setUpdated(true); setNote(sawRestart ? 'Updated and restarted.' : 'Updated. Restart the server yourself to run the new code.'); }
      } catch {
        if (tries > 120) { setWaiting(false); setNote('The server did not come back within 3 minutes. Check it with: journalctl -u turbomusic -n 50'); return; }
        follow(sawRestart, tries + 1); // restarting: no answer yet
      }
    }, sawRestart ? 2000 : 1200);
  };

  if (!configured || !info?.available) return null;
  const running = waiting || info.status === 'running';
  const start = async () => {
    if (!window.confirm('Update the server now? It downloads the newest version, rebuilds, and restarts: syncing and playback from it pause for about a minute.')) return;
    setNote(null); setUpdated(false); setWaiting(true);
    try { await api().startUpdate(); follow(); } catch (e) { setWaiting(false); setNote(e instanceof Error ? e.message : 'Could not start the update'); }
  };
  return (
    <Section title="Update server">
      <p className="text-sm text-muted">Downloads the newest version of TurboMusic onto the server, rebuilds the web client and restarts the server. Your library and files are not touched. The apps on your devices update separately (Settings → This app); a browser gets the new web client when you reload it.</p>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button className="btn btn-accent" disabled={running} onClick={() => void start()}><ArrowUpCircle size={15} />{running ? 'Updating…' : 'Update server'}</button>
        {updated && !running && <button className="btn" onClick={() => location.reload()}>Reload this page</button>}
        {note && <span className={info.status === 'error' ? 'text-warn' : 'text-muted'}>{note}</span>}
      </div>
      {(running || info.status === 'error' || info.status === 'done') && info.log.length > 0 && (
        <pre className="max-h-56 overflow-auto rounded-theme bg-raised p-3 text-xs">{info.log.slice(-40).join('\n')}</pre>
      )}
    </Section>
  );
}
