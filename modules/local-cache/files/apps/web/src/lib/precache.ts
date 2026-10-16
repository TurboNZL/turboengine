import { api } from './api.ts';
import { notesKey } from './prefetch.ts';
import { rememberNote, remember } from './cache.ts';
import { tasksInTags, viewParams, type Scope } from './views.ts';
import type { CountTasks } from './settings.ts';

/**
 * Settings > Items > Speed > "Remember everything now": fetches every list the pages can show (Tasks, All notes, Due soon, each tag, the same for the Archive), the
 * tags, your emoji and every item in full, and keeps them under the current caching level, so nothing needs a wait afterwards. `say` reports progress.
 */
export async function precacheEverything(countTasks: CountTasks, say: (m: string) => void): Promise<{ lists: number; notes: number }> {
  let lists = 0;
  const put = async (params: ReturnType<typeof viewParams>) => { const l = await api.notes(params); remember(`notes:${notesKey(params)}`, l); lists++; };
  say('Tags…');
  const [live, archived] = await Promise.all([api.tags('live', tasksInTags(countTasks, false)), api.tags('archived', tasksInTags(countTasks, true))]);
  remember('tags', live); remember(`tags:archived:${tasksInTags(countTasks, true)}`, archived);
  void api.emoji().catch(() => {});
  const scopes: Scope[] = ['list', 'all', 'due'];
  for (const archive of [false, true]) {
    say(archive ? 'The Archive…' : 'Home…');
    const withTasks = tasksInTags(countTasks, archive);
    for (const scope of scopes) if (!(archive && scope === 'due')) await put(viewParams({ scope }, archive, withTasks));
    for (const t of (archive ? archived : live).filter((x) => x.count > 0)) await put(viewParams({ scope: 'list', tag: t.title }, archive, withTasks));
  }
  say('Every item in full…');
  const everything = await api.notes({ view: 'all' });
  for (const n of everything) rememberNote(n);
  say('');
  return { lists, notes: everything.length };
}
