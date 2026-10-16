import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { ImportError } from './types.ts';

/**
 * TurboKeep's own backup: everything in one file, so nothing is lost and it can be moved to another server or account.
 *   turbokeep.json   { format: "turbokeep", version: 2, exportedAt, notes[] (each with its tag names), tagStyles[] }
 * Zipped as turbokeep-<date>.zip; a bare turbokeep.json is read too. A file written by a NEWER version is refused instead of half-read.
 */
export const FORMAT = 'turbokeep';
export const FORMAT_VERSION = 2;
export const FILE = 'turbokeep.json';

/**
 * Version 2 (one kind of thing): every note carries `onList` (has a checkbox on Home), `dueDate`, `percentDone` and `position`; finished means archived.
 * Version 1 (notes with a task, projects, relations) is still read: a task becomes an item on the list, done becomes archived, its project becomes a
 * tag, comments are appended to the text, and reminders, relations, repeats, priority and start/end dates are dropped (reported as a warning).
 */
export interface TkNote {
  id: string; title: string; text: string; noteType: string; pinned: boolean; archived: boolean; trashed: boolean; tags: string[]; createdAt: string; updatedAt: string;
  onList: boolean; dueDate: string | null; percentDone: number; position: number; autoTitle?: boolean;
}
export interface TkTagStyle { title: string; emoji: string; color: string; keepTasks?: boolean }
export interface TkEmoji { id: string; name: string; mime: string; data: string }
export interface TkBundle { notes: TkNote[]; /** tags that have an emoji or a colour */ tagStyles: TkTagStyle[]; /** imported emoji (base64 PNG or WebP) */ customEmoji?: TkEmoji[] }

export function buildTurboKeepZip(bundle: TkBundle, appVersion: string): Uint8Array {
  const json = JSON.stringify({ format: FORMAT, version: FORMAT_VERSION, exportedAt: new Date().toISOString(), appVersion, ...bundle }, null, 1);
  return zipSync({ [FILE]: strToU8(json) }, { level: 6 });
}

const str = (v: unknown, max = 1_000_000) => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const bool = (v: unknown) => v === true;
const date = (v: unknown): string | null => { if (typeof v !== 'string' || !v) return null; const t = Date.parse(v); return Number.isNaN(t) ? null : new Date(t).toISOString(); };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseTurboKeep(data: Uint8Array): { bundle: TkBundle; warnings: string[] } {
  let text: string;
  if (data.length > 3 && data[0] === 0x50 && data[1] === 0x4b) {
    let entries: Record<string, Uint8Array>;
    try { entries = unzipSync(data, { filter: (f) => f.name === FILE || f.name.endsWith(`/${FILE}`) }); } catch { throw new ImportError('That file looks like a zip but cannot be opened.'); }
    const name = Object.keys(entries)[0];
    if (!name) throw new ImportError(`This zip has no ${FILE}, so it is not a TurboKeep backup.`);
    text = strFromU8(entries[name]!);
  } else text = strFromU8(data);
  let j: any;
  try { j = JSON.parse(text); } catch { throw new ImportError(`${FILE} is not valid JSON.`); }
  if (j?.format !== FORMAT) throw new ImportError('That is not a TurboKeep backup.');
  if (typeof j.version !== 'number' || j.version > FORMAT_VERSION) throw new ImportError(`This backup was made by a newer TurboKeep (format ${j.version}); update TurboKeep first.`);
  const warnings: string[] = [];

  // version 1 had lists ("projects"): their names become tags
  const projects = new Map<number, { title: string; parentId: number | null; isInbox: boolean }>();
  for (const p of Array.isArray(j.projects) ? j.projects : []) if (p && Number.isInteger(p.id)) projects.set(p.id, { title: str(p.title, 250).replace(/\./g, ' '), parentId: Number.isInteger(p.parentId) ? p.parentId : null, isInbox: bool(p.isInbox) });
  const projectTag = (id: number): string => { const p = projects.get(id); return !p || p.isInbox ? '' : [p.parentId ? projectTag(p.parentId) : '', p.title].filter(Boolean).join('.'); };

  const seen = new Set<string>();
  const notes: TkNote[] = [];
  let lost = 0;
  for (const n of Array.isArray(j.notes) ? j.notes : []) {
    if (!n || typeof n.id !== 'string' || !UUID.test(n.id) || seen.has(n.id.toLowerCase())) { warnings.push('A note without a valid id (or listed twice) was skipped.'); continue; }
    seen.add(n.id.toLowerCase());
    const tags = [...new Set((Array.isArray(n.tags) ? n.tags : []).map((x: unknown) => str(x, 80).trim()).filter(Boolean))] as string[];
    const base = {
      id: n.id.toLowerCase(), title: str(n.title, 1000), text: str(n.text), noteType: str(n.noteType, 40) || 'plain-text', pinned: bool(n.pinned), archived: bool(n.archived), trashed: bool(n.trashed), tags,
      createdAt: date(n.createdAt) ?? new Date().toISOString(), updatedAt: date(n.updatedAt) ?? date(n.createdAt) ?? new Date().toISOString(),
    };
    const t = n.task && typeof n.task === 'object' ? n.task : null;
    if (j.version >= 2 || !t) {
      notes.push({ ...base, onList: bool(n.onList), dueDate: date(n.dueDate), percentDone: Math.min(1, Math.max(0, num(n.percentDone))), position: num(n.position), autoTitle: bool(n.autoTitle) });
      continue;
    }
    // a version 1 task
    const pt = Number.isInteger(t.projectId) ? projectTag(t.projectId) : '';
    if (pt && !tags.includes(pt)) tags.push(pt);
    const comments = (Array.isArray(t.comments) ? t.comments : []).filter((c: any) => c && str(c.comment));
    if (comments.length) base.text = `${base.text.trimEnd()}\n\n--- Comments ---\n${comments.map((c: any) => `${str(c.author, 60) ? `${str(c.author, 60)}, ` : ''}${(date(c.createdAt) ?? '').slice(0, 10)}: ${str(c.comment)}`).join('\n')}\n`.trimStart();
    if ((Array.isArray(t.reminders) && t.reminders.length) || num(t.priority) || num(t.repeatAfter) || t.repeatMode === 1 || t.startDate || t.endDate) lost++;
    notes.push({ ...base, tags, archived: base.archived || bool(t.done), pinned: base.pinned || bool(t.isFavorite), onList: true, dueDate: date(t.dueDate), percentDone: Math.min(1, Math.max(0, num(t.percentDone))), position: num(t.position) });
  }
  if (Array.isArray(j.relations) && j.relations.length) warnings.push(`${j.relations.length} task relation${j.relations.length === 1 ? '' : 's'} in this backup were left out (TurboKeep no longer has them).`);
  if (lost) warnings.push(`${lost} task${lost === 1 ? '' : 's'} had reminders, repeats, a priority or start/end dates, which TurboKeep no longer keeps.`);
  const tagStyles: TkTagStyle[] = (Array.isArray(j.tagStyles) ? j.tagStyles : []).filter((t: any) => t && typeof t.title === 'string' && t.title).map((t: any) => ({
    title: String(t.title).slice(0, 200), emoji: typeof t.emoji === 'string' ? (/^:[0-9a-f]{12}:$/.test(t.emoji) ? t.emoji : [...t.emoji].slice(0, 4).join('')) : '', color: /^[0-9a-f]{6}$/i.test(String(t.color ?? '')) ? String(t.color).toLowerCase() : '', keepTasks: t.keepTasks === true }));
  const customEmoji: TkEmoji[] = (Array.isArray(j.customEmoji) ? j.customEmoji : []).filter((e: any) => e && /^[0-9a-f]{12}$/.test(String(e.id)) && typeof e.data === 'string').slice(0, 300).map((e: any) => ({ id: String(e.id), name: str(e.name, 60), mime: str(e.mime, 40), data: e.data }));
  return { bundle: { notes, tagStyles, customEmoji }, warnings };
}
