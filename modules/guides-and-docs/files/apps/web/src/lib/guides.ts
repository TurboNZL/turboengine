/**
 * The guides that ship with the project (everything in docs/guides/ and the README: guides only; development notes live in docs/development/), bundled into the web client so Settings → Guides can show
 * them offline, on the Raspberry Pi's copy of the client, and inside the Android app. Each is loaded only when opened.
 */
const files = import.meta.glob('../../../../docs/guides/**/*.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;
const readme = import.meta.glob('../../../../README.md', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;

export interface Guide { name: string; title: string; group: 'Start' | 'Apps' | 'Servers'; load: () => Promise<string> }

const TITLE: Record<string, [string, Guide['group']]> = {
  GETTING_STARTED: ['Getting started', 'Start'], README: ['About TurboMusic', 'Start'],
  DESKTOP_APP: ['Desktop app', 'Apps'], ANDROID_APP: ['Android app', 'Apps'], CONNECT: ['Play on a device', 'Apps'], DISCORD: ['Discord status', 'Apps'], SPOTIFY: ['Spotify', 'Apps'],
  WINDOWS_SERVER: ['Server on Windows', 'Servers'], DEPLOY_PI: ['Server on Linux or a Raspberry Pi', 'Servers'], UPDATING: ['Updating a Linux server', 'Servers'], YTDLP_COOKIES: ['YouTube downloads and cookies', 'Servers'],
};
const ORDER = Object.keys(TITLE);

/** `../../../../docs/appearance/THEMES.md` -> `appearance/THEMES`; the README is `README`. */
export const guideName = (path: string) => (/README\.md$/.test(path) && !path.includes('/docs/') ? 'README' : path.replace(/^.*\/docs\/(?:guides\/)?/, '').replace(/\.md$/, ''));

export function listGuides(): Guide[] {
  const all = [...Object.entries(readme), ...Object.entries(files)].map(([path, load]): Guide => {
    const name = guideName(path);
    const known = TITLE[name];
    return { name, load, title: known?.[0] ?? name.replace(/^appearance\//, '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()), group: known?.[1] ?? 'Apps' };
  });
  const rank = (g: Guide) => { const i = ORDER.indexOf(g.name); return i === -1 ? 1000 : i; };
  return all.sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title));
}
