import { type DB, all, get, run, tx, now } from './db.ts';
import { VERSION } from './version.ts';
import { HttpError, addEmoji, createNote, exportEmoji } from './store.ts';
import { buildStandardNotesZip, parseStandardNotes, type SnTag } from './formats/standardnotes.ts';
import { buildTurboKeepZip, parseTurboKeep, type TkBundle, type TkNote } from './formats/turbokeep.ts';
import { buildVikunjaZip, parseVikunja, type VTask } from './formats/vikunja.ts';
import { ImportError, type ImportReport, type NoteOut } from './formats/types.ts';

/** Thrown inside the import transaction to undo it after counting what would have happened (preview / dry run). */
class DryRun extends Error {}

function guard<T>(fn: () => T): T {
  try { return fn(); } catch (e) { if (e instanceof ImportError) throw new HttpError(400, e.message); throw e; }
}

// ---------------- Standard Notes ----------------

export function exportStandardNotes(db: DB, userId: number, plainOnly: boolean): Uint8Array {
  const rows = all(db, 'select * from notes where user_id = ? order by created_at', userId);
  const tagRows = all(db, 'select nt.note_id, t.title from note_tags nt join tags t on t.id = nt.tag_id where t.user_id = ?', userId);
  const byNote = new Map<string, string[]>();
  for (const r of tagRows) (byNote.get(r.note_id) ?? byNote.set(r.note_id, []).get(r.note_id)!).push(r.title);
  const notes: NoteOut[] = rows.map((r) => ({ id: r.id, title: r.title, text: r.text, noteType: r.note_type, pinned: !!r.pinned, archived: !!r.archived, trashed: !!r.trashed, createdAt: r.created_at, updatedAt: r.updated_at, tags: byNote.get(r.id) ?? [] }));
  const tags: SnTag[] = all(db, 'select * from tags where user_id = ? order by title', userId).map((t) => ({
    id: t.id, title: t.title, createdAt: t.created_at, updatedAt: t.created_at, noteIds: all(db, 'select note_id from note_tags where tag_id = ?', t.id).map((r) => r.note_id as string),
  }));
  return buildStandardNotesZip(notes, tags, plainOnly);
}

export function importStandardNotes(db: DB, userId: number, files: { name: string; data: Uint8Array }[], dry: boolean): ImportReport {
  const report: ImportReport = { notes: 0, skipped: 0, tags: 0, warnings: [] };
  const run_ = () => tx(db, () => {
    const tagsBefore = Number(get(db, 'select count(*) c from tags where user_id = ?', userId)!.c);
    for (const f of files) {
      const { notes, warnings } = guard(() => parseStandardNotes(f.name, f.data));
      for (const w of warnings) if (!(report.warnings as string[]).includes(w)) (report.warnings as string[]).push(w);
      for (const n of notes) {
        let id = n.id;
        if (id) {
          const existing = get(db, 'select user_id from notes where id = ?', id);
          if (existing?.user_id === userId) { (report.skipped as number)++; continue; } // already imported
          if (existing) id = undefined; // another account on this server has it: new identity
        } else if (get(db, 'select 1 x from notes where user_id = ? and title = ? and text = ?', userId, n.title, n.text)) { (report.skipped as number)++; continue; }
        createNote(db, userId, n, { id, createdAt: n.createdAt, updatedAt: n.updatedAt });
        (report.notes as number)++;
      }
    }
    report.tags = Number(get(db, 'select count(*) c from tags where user_id = ?', userId)!.c) - tagsBefore;
    if (dry) throw new DryRun();
  });
  try { run_(); } catch (e) { if (!(e instanceof DryRun)) throw e; }
  return { ...report, dry };
}

// ---------------- Vikunja ----------------

/** Everything on the list goes out as the tasks of one project; notes that are not on the list have no place in Vikunja and are counted in `notListed`. */
export function exportVikunja(db: DB, user: { id: number; username: string }): { zip: Uint8Array; notListed: number } {
  const u = get(db, 'select created_at from users where id = ?', user.id)!;
  const tagRows = all(db, 'select nt.note_id, g.title, g.color, g.created_at from note_tags nt join tags g on g.id = nt.tag_id where g.user_id = ? order by g.title', user.id);
  const labelIds = new Map<string, number>();
  const labels = new Map<string, VTask['labels']>();
  for (const r of tagRows) {
    if (!labelIds.has(r.title)) labelIds.set(r.title, labelIds.size + 1);
    (labels.get(r.note_id) ?? labels.set(r.note_id, []).get(r.note_id)!).push({ id: labelIds.get(r.title)!, title: r.title, hexColor: r.color, created: r.created_at, updated: r.created_at });
  }
  const rows = all(db, 'select * from notes where user_id = ? and trashed = 0 and on_list = 1 order by archived, position, created_at', user.id);
  const notListed = Number(get(db, 'select count(*) c from notes where user_id = ? and trashed = 0 and on_list = 0', user.id)!.c);
  const tasks: VTask[] = rows.map((n, i) => ({
    id: i + 1, index: i + 1, title: (n.title || n.text.split('\n')[0]?.slice(0, 120) || 'Untitled').replace(/\s*\n\s*/g, ' '), /* Vikunja titles are one line */ description: n.title ? n.text : n.text.split('\n').slice(1).join('\n').trim(),
    done: !!n.archived, doneAt: n.archived ? n.updated_at : null, dueDate: n.due_date, percentDone: n.percent_done, isFavorite: !!n.pinned, position: n.position,
    created: n.created_at, updated: n.updated_at, labels: labels.get(n.id) ?? [],
  }));
  return { notListed, zip: buildVikunjaZip({ id: user.id, username: user.username, created: u.created_at }, { id: 1, title: 'TurboKeep', created: u.created_at, updated: now(), tasks }) };
}

const COMMENTS = '--- Comments ---';

/** Every Vikunja task becomes an item on the list; its project (and parents) becomes a tag, done becomes archived, comments are appended to the text. */
export function importVikunja(db: DB, user: { id: number; username: string }, data: Uint8Array, dry: boolean): ImportReport {
  const { projects, warnings } = guard(() => parseVikunja(data));
  const report: ImportReport = { notes: 0, tags: 0, warnings: [...warnings] };
  const byId = new Map(projects.map((p) => [p.oldId, p]));
  const tagOf = (id: number | null, depth = 0): string => {
    const p = id ? byId.get(id) : undefined;
    if (!p || depth > 20) return '';
    if (!p.parentOldId && p.title.toLowerCase() === 'inbox') return '';
    return [tagOf(p.parentOldId, depth + 1), p.title.replace(/\./g, ' ').trim()].filter(Boolean).join('.');
  };
  let dropped = 0;
  try {
    tx(db, () => {
      const tagsBefore = Number(get(db, 'select count(*) c from tags where user_id = ?', user.id)!.c);
      const total = projects.reduce((n, p) => n + p.tasks.length, 0);
      let pos = Number(get(db, 'select coalesce(min(position), 1) m from notes where user_id = ?', user.id)!.m) - total - 1;
      for (const p of projects) {
        const projectTag = tagOf(p.oldId);
        for (const t of p.tasks) {
          const tags = [...new Set([...(projectTag ? [projectTag] : []), ...t.labels.map((l) => l.title.replace(/\s+/g, ' ').trim())].filter(Boolean))];
          let text = t.description;
          if (t.comments.length) text = `${text.trimEnd()}\n\n${COMMENTS}\n${t.comments.map((c) => `${c.author ? `${c.author}, ` : ''}${(c.created ?? '').slice(0, 10)}: ${c.comment}`).join('\n')}\n`.trimStart();
          if (t.reminders.length || t.priority || t.repeatAfter || t.repeatMode === 1 || t.startDate || t.endDate || Object.keys(t.related).length) dropped++;
          createNote(db, user.id, { title: t.title, text, tags, onList: true, archived: t.done || p.isArchived, pinned: t.isFavorite, dueDate: t.dueDate, percentDone: t.percentDone, position: pos++ },
            { createdAt: t.created, updatedAt: t.updated });
          (report.notes as number)++;
        }
      }
      if (dropped) (report.warnings as string[]).push(`${dropped} task${dropped === 1 ? '' : 's'} had reminders, repeats, a priority, start/end dates or related tasks, which TurboKeep does not keep.`);
      report.tags = Number(get(db, 'select count(*) c from tags where user_id = ?', user.id)!.c) - tagsBefore;
      if (dry) throw new DryRun();
    });
  } catch (e) { if (!(e instanceof DryRun)) throw e; }
  return { ...report, dry };
}

// ---------------- TurboKeep (everything together) ----------------

export function exportTurboKeep(db: DB, userId: number): Uint8Array {
  const tagRows = all(db, 'select nt.note_id, t.title from note_tags nt join tags t on t.id = nt.tag_id where t.user_id = ? order by nt.position, t.title', userId);
  const tags = new Map<string, string[]>();
  for (const r of tagRows) (tags.get(r.note_id) ?? tags.set(r.note_id, []).get(r.note_id)!).push(r.title);
  const notes: TkNote[] = all(db, 'select * from notes where user_id = ? order by created_at, id', userId).map((n) => ({
    id: n.id, title: n.title, text: n.text, noteType: n.note_type, pinned: !!n.pinned, archived: !!n.archived, trashed: !!n.trashed, tags: tags.get(n.id) ?? [], createdAt: n.created_at, updatedAt: n.updated_at,
    onList: !!n.on_list, dueDate: n.due_date, percentDone: n.percent_done, position: n.position, autoTitle: !!n.auto_title,
  }));
  const bundle: TkBundle = {
    notes,
    tagStyles: all(db, "select title, emoji, color, keep_tasks from tags where user_id = ? and (emoji != '' or color != '' or keep_tasks = 1) order by title", userId).map((t) => ({ title: t.title, emoji: t.emoji, color: t.color, ...(t.keep_tasks ? { keepTasks: true } : {}) })),
    customEmoji: exportEmoji(db, userId),
  };
  return buildTurboKeepZip(bundle, VERSION);
}

export function importTurboKeep(db: DB, user: { id: number; username: string }, data: Uint8Array, dry: boolean): ImportReport {
  const { bundle, warnings } = guard(() => parseTurboKeep(data));
  const report: ImportReport = { notes: 0, tags: 0, skipped: 0, warnings: [...warnings] };
  try {
    tx(db, () => {
      const tagsBefore = Number(get(db, 'select count(*) c from tags where user_id = ?', user.id)!.c);
      // imported emoji first (a tag's look may use one); an id another account already has gets a new one
      const remap = new Map<string, string>();
      for (const e of bundle.customEmoji ?? []) {
        if (get(db, 'select 1 x from custom_emoji where id = ? and user_id = ?', e.id, user.id)) continue;
        try { const row = addEmoji(db, user.id, e.name, new Uint8Array(Buffer.from(e.data, 'base64')), get(db, 'select 1 x from custom_emoji where id = ?', e.id) ? undefined : e.id); if (row.id !== e.id) remap.set(`:${e.id}:`, `:${row.id}:`); } catch { /* a damaged picture is skipped */ }
      }
      for (const n of bundle.notes) {
        let id = n.id;
        const existing = get(db, 'select user_id from notes where id = ?', id);
        if (existing?.user_id === user.id) { (report.skipped as number)++; continue; } // already here: importing twice adds nothing
        if (existing) id = crypto.randomUUID(); // another account on this server has that id
        createNote(db, user.id, n, { id, createdAt: n.createdAt, updatedAt: n.updatedAt });
        (report.notes as number)++;
      }
      // tag looks: only fill in a tag that has none yet, so importing never overwrites what you chose here
      for (const t of bundle.tagStyles) run(db, "update tags set emoji = case when emoji = '' then ? else emoji end, color = case when color = '' then ? else color end where user_id = ? and title = ?", remap.get(t.emoji) ?? t.emoji, t.color, user.id, t.title);
      for (const t of bundle.tagStyles) if (t.keepTasks) run(db, 'update tags set keep_tasks = 1 where user_id = ? and title = ?', user.id, t.title);
      report.tags = Number(get(db, 'select count(*) c from tags where user_id = ?', user.id)!.c) - tagsBefore;
      if (dry) throw new DryRun();
    });
  } catch (e) { if (!(e instanceof DryRun)) throw e; }
  return { ...report, dry };
}
