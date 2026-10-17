// Imported emoji: the web page shrinks a picture to emoji size and sends it as base64; this keeps it (see MODULE.md for the table, the routes and the cache header).
// Copied from TurboKeep's store.ts; `DB`, `all`, `get`, `run`, `now` and `HttpError` are the app's own helpers.
import { randomBytes } from 'node:crypto';
import { type DB, all, get, run, now } from './db.ts';
import { HttpError } from './store.ts';

export interface EmojiRow { id: string; name: string }
const MAX_EMOJI = 300, MAX_EMOJI_BYTES = 120_000;
const isPng = (b: Uint8Array) => b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
const isWebp = (b: Uint8Array) => b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;

/** An imported picture nothing uses (here: no tag shows it; change the `not exists` to whatever refers to a picture in your app) is deleted. One imported a moment ago is kept for a while: it is made before it is chosen. Without a user, every account's. */
export const EMOJI_GRACE_MS = 10 * 60_000;
export function pruneEmoji(db: DB, userId?: number, graceMs = EMOJI_GRACE_MS) {
  const before = new Date(Date.now() - graceMs).toISOString();
  run(db, `delete from custom_emoji where created_at < ? ${userId === undefined ? '' : 'and user_id = ?'} and not exists (select 1 from tags t where t.user_id = custom_emoji.user_id and t.emoji = ':' || custom_emoji.id || ':')`, ...(userId === undefined ? [before] : [before, userId]));
}

export const listEmoji = (db: DB, userId: number): EmojiRow[] => (pruneEmoji(db, userId), all(db, 'select id, name from custom_emoji where user_id = ? order by created_at', userId).map((r) => ({ id: r.id as string, name: r.name as string })));

/** The page has already shrunk the picture to emoji size; this only checks it is a small PNG or WebP and keeps it. */
export function addEmoji(db: DB, userId: number, name: unknown, data: Uint8Array, id?: string): EmojiRow {
  if (data.length > MAX_EMOJI_BYTES) throw new HttpError(413, 'That emoji is too big: the page should shrink it to emoji size first');
  const mime = isPng(data) ? 'image/png' : isWebp(data) ? 'image/webp' : null;
  if (!mime) throw new HttpError(400, 'An emoji is a PNG or WebP picture');
  if (Number(get(db, 'select count(*) c from custom_emoji where user_id = ?', userId)!.c) >= MAX_EMOJI) throw new HttpError(400, `You can keep ${MAX_EMOJI} emoji`);
  const key = id ?? randomBytes(6).toString('hex');
  run(db, 'insert into custom_emoji (id, user_id, name, mime, data, created_at) values (?,?,?,?,?,?)', key, userId, String(name ?? '').trim().slice(0, 60), mime, data, now());
  return { id: key, name: String(name ?? '').trim().slice(0, 60) };
}
export const getEmoji = (db: DB, userId: number, id: string) => get(db, 'select mime, data from custom_emoji where id = ? and user_id = ?', id, userId) as { mime: string; data: Uint8Array } | undefined;
export function deleteEmoji(db: DB, userId: number, id: string) {
  run(db, 'delete from custom_emoji where id = ? and user_id = ?', id, userId);
  run(db, "update tags set emoji = '' where user_id = ? and emoji = ?", userId, `:${id}:`);
}
export const exportEmoji = (db: DB, userId: number) => all(db, 'select id, name, mime, data from custom_emoji where user_id = ? order by created_at', userId).map((r) => ({ id: r.id as string, name: r.name as string, mime: r.mime as string, data: Buffer.from(r.data as Uint8Array).toString('base64') }));
