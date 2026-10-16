import { useRef, useState, type ReactNode } from 'react';
import { ChevronRight, Download, Upload } from 'lucide-react';
import { api, download, type Report } from '../lib/api.ts';
import { useStore } from '../lib/store.ts';
import { Section } from './Section.tsx';
import { Dialog } from './Dialog.tsx';

const LABEL: Record<string, string> = { notes: 'items', skipped: 'already here (skipped)', tags: 'new tags' };
type Kind = 'turbokeep' | 'standardnotes' | 'vikunja';

function ImportBox({ kind, accept, multiple, hint }: { kind: Kind; accept: string; multiple: boolean; hint: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshMeta = useStore((s) => s.refreshMeta);

  async function go(dry: boolean) {
    setBusy(true); setError(null);
    try { const r = await api.importFiles(kind, files, dry); setReport(r); if (!dry) { void refreshMeta(); setFiles([]); if (input.current) input.current.value = ''; } }
    catch (e) { setError((e as Error).message); setReport(null); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-2">
      <input ref={input} type="file" accept={accept} multiple={multiple} aria-label={`File to import (${kind})`} className="block w-full text-sm" onChange={(e) => { setFiles([...(e.target.files ?? [])]); setReport(null); setError(null); }} />
      <p className="text-xs text-muted">{hint}</p>
      <div className="flex flex-wrap gap-2">
        <button className="btn" disabled={!files.length || busy} onClick={() => void go(true)}>Preview</button>
        <button className="btn btn-accent" disabled={!files.length || busy || !report?.dry} onClick={() => void go(false)} title={report?.dry ? '' : 'Preview first'}><Upload size={15} />Import</button>
      </div>
      {error && <div role="alert" className="rounded-theme bg-bad/15 p-2.5 text-sm text-bad">{error}</div>}
      {report && (
        <div className="rounded-theme bg-raised p-3 text-sm" aria-live="polite">
          <div className="font-medium">{report.dry ? 'Would import (nothing has been written yet):' : 'Imported:'}</div>
          <ul className="mt-1 list-disc pl-5">{Object.entries(report).filter(([k, v]) => typeof v === 'number' && LABEL[k]).map(([k, v]) => <li key={k}>{v as number} {LABEL[k]}</li>)}</ul>
          {report.warnings.map((w) => <p key={w} className="mt-1.5 text-warn">{w}</p>)}
        </div>)}
    </div>
  );
}

/** An export button with the message that may come back from it. */
function ExportButtons({ items }: { items: { label: string; path: string; name: string; note?: (r: { notExported: number }) => string | null }[] }) {
  const [msg, setMsg] = useState<string | null>(null);
  const run = async (i: (typeof items)[number]) => {
    setMsg(null);
    try { const r = await download(i.path, i.name); setMsg(i.note?.(r) ?? null); } catch (e) { setMsg((e as Error).message); }
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">{items.map((i) => <button key={i.path} className="btn" onClick={() => void run(i)}><Download size={15} />{i.label}</button>)}</div>
      {msg && <p className="rounded-theme bg-raised p-2.5 text-sm" role="status">{msg}</p>}
    </div>
  );
}

/** One platform's whole story: what it can export, and what it can import. */
const PLATFORMS: Record<Exclude<Kind, 'turbokeep'>, { title: string; blurb: string; body: ReactNode }> = {
  standardnotes: {
    title: 'Standard Notes', blurb: 'Notes: the decrypted backup zip, or plain text files.',
    body: (
      <>
        <div className="space-y-2"><h3 className="text-sm font-semibold">Export</h3>
          <p className="text-xs text-muted">The same zip Standard Notes writes for a decrypted backup: a JSON backup with tags, pins and dates that Standard Notes can import, plus every note as a <code>.txt</code> file in <code>Items/Note/</code>. Everything goes, finished items and the bin included; Standard Notes has no list, so the checkbox, date and progress stay behind.</p>
          <ExportButtons items={[{ label: 'Standard Notes backup (.zip)', path: '/api/export/standardnotes', name: 'standard-notes.zip' }, { label: 'Plain text files only (.zip)', path: '/api/export/standardnotes?plain=1', name: 'notes-plaintext.zip' }]} /></div>
        <div className="space-y-2 border-t border-line pt-4"><h3 className="text-sm font-semibold">Import</h3>
          <ImportBox kind="standardnotes" multiple accept=".zip,.txt,.md,.markdown,.json" hint="Use the decrypted zip (Standard Notes: Account > Data Backups > Download backup > Decrypted), its JSON file, or plain .txt / .md files. Importing the same backup twice does not duplicate anything. Imported notes are filed under their tags and are not on your task list." /></div>
      </>),
  },
  vikunja: {
    title: 'Vikunja', blurb: 'Tasks: Vikunja\'s data export zip.',
    body: (
      <>
        <div className="space-y-2"><h3 className="text-sm font-semibold">Export</h3>
          <p className="text-xs text-muted">Vikunja's own data export format (<code>VERSION</code> + <code>data.json</code>). In Vikunja: Settings &gt; Import from other services &gt; Vikunja file. Everything on your task list becomes a task of one project, finished ones as done, tags as coloured labels. Notes that are not on the list are left out (Vikunja has only tasks).</p>
          <ExportButtons items={[{ label: 'Vikunja export (.zip)', path: '/api/export/vikunja', name: 'vikunja.zip', note: (r) => (r.notExported ? `${r.notExported} note${r.notExported === 1 ? ' is' : 's are'} not on your task list and ${r.notExported === 1 ? 'was' : 'were'} left out.` : null) }]} /></div>
        <div className="space-y-2 border-t border-line pt-4"><h3 className="text-sm font-semibold">Import</h3>
          <ImportBox kind="vikunja" multiple={false} accept=".zip,.json" hint="Vikunja: Settings > Export your data, then pick the zip it gives you (or its data.json). Each task goes onto your task list; its project and labels become tags, done tasks are finished, due date and progress are kept, comments are added to the text. Reminders, repeats, priority, start and end dates, related tasks and attachments are not kept." /></div>
      </>),
  },
};

export function ImportExport() {
  const [open, setOpen] = useState<null | 'standardnotes' | 'vikunja'>(null);
  return (
    <>
      <Section title="TurboKeep">
        <p className="text-sm text-muted">Your data is yours: nothing here is locked in. This is the backup that keeps everything (items, tags with their emoji and colour, the list, dates, progress, your order, pins, the archive and the bin), for moving to another TurboKeep server or keeping a copy you can read.</p>
        <div className="space-y-2"><h3 className="text-sm font-semibold">Export</h3>
          <ExportButtons items={[{ label: 'TurboKeep backup (.zip)', path: '/api/export/turbokeep', name: 'turbokeep.zip' }]} /></div>
        <div className="space-y-2 border-t border-line pt-4"><h3 className="text-sm font-semibold">Import</h3>
          <ImportBox kind="turbokeep" multiple={false} accept=".zip,.json" hint="A zip made by TurboKeep's export (or its turbokeep.json; older backups with tasks, lists and comments are read too). Items that are already here (same id) are skipped, so importing twice is safe." /></div>
      </Section>
      <Section title="Other apps">
        <p className="text-sm text-muted">One window per app, with its import and its export together.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(PLATFORMS) as (keyof typeof PLATFORMS)[]).map((k) => (
            <button key={k} className="card flex min-h-16 items-center gap-3 p-4 text-left hover:border-accent" onClick={() => setOpen(k)}>
              <span className="min-w-0 flex-1"><span className="block font-semibold">{PLATFORMS[k].title}</span><span className="block text-xs text-muted">{PLATFORMS[k].blurb}</span></span><ChevronRight size={18} className="shrink-0 text-muted" />
            </button>))}
        </div>
      </Section>
      {open && <Dialog title={PLATFORMS[open].title} wide onClose={() => setOpen(null)}>{PLATFORMS[open].body}</Dialog>}
    </>
  );
}
