import { useState } from 'react';
import { RefreshCw, Undo2 } from 'lucide-react';
import { Section } from './Section.tsx';
import { useStore } from '../lib/store.ts';
import { themeEngine } from '../lib/appearance.ts';
import { useCatalog } from '../lib/useCatalog.ts';

/** Where the look comes from, and the button that fetches newer themes. The themes live in their own repository, so they can change without an app update. */
export function ThemeUpdates() {
  useCatalog();
  const { settings, updateSettings } = useStore();
  const engine = themeEngine(settings);
  const v = engine.version();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function check() {
    setBusy(true); setMsg(null);
    try { setMsg((await engine.update()).message); } finally { setBusy(false); }
  }

  return (
    <Section title="Themes">
      <p className="text-sm text-muted">
        The colours, UI styles and layouts come from the turbothemes repository, not from this app, so they can improve without an app update.
        {' '}Now using: <span className="font-medium text-fg">{v.origin === 'downloaded' ? 'downloaded themes' : 'the themes built into this app'}</span> <span className="tabular-nums">({v.hash})</span>
        {v.checkedAt ? <>, last checked {new Date(v.checkedAt).toLocaleString()}</> : null}.
      </p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={settings.themeUpdates} onChange={(e) => updateSettings({ themeUpdates: e.target.checked })} />Look for newer themes automatically</label>
      <label className="block text-sm"><span className="mb-1 block font-medium">GitHub access token <span className="font-normal text-muted">(only if the themes repository is private)</span></span>
        <input type="password" autoComplete="off" className="input" value={settings.themesToken} onChange={(e) => updateSettings({ themesToken: e.target.value.trim() })} placeholder="github_pat_…" />
        <span className="text-xs text-muted">Needs read access to the repository's contents. Kept on this device only. From {v.source}.</span></label>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn" disabled={busy} onClick={() => void check()}><RefreshCw size={15} className={busy ? 'animate-spin' : ''} />Check for newer themes</button>
        {v.origin === 'downloaded' && <button className="btn" onClick={() => { engine.resetToBuiltin(); setMsg('Back to the themes built into this app.'); }}><Undo2 size={15} />Use the built-in themes</button>}
        {msg && <span className="text-sm text-muted" aria-live="polite">{msg}</span>}
      </div>
    </Section>
  );
}
