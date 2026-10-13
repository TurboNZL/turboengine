/** Where the updater reads the built themes from: a folder holding manifest.json, themes.json and themes.css. */
export interface Source { describe: string; fetchText(file: string): Promise<string> }

export interface GithubSourceOptions {
  /** "owner/repo" */
  repo?: string;
  ref?: string;
  dir?: string;
  /** A GitHub token with read access; needed only if the repository is private. */
  token?: string;
}

export const urlSource = (base: string, headers?: Record<string, string>): Source => ({
  describe: base,
  async fetchText(file) {
    const res = await fetch(`${base.replace(/\/$/, '')}/${file}`, { cache: 'no-cache', headers });
    if (!res.ok) throw new Error(`${file}: HTTP ${res.status}`);
    return res.text();
  },
});

/** The built themes in a GitHub repository (the build commits them to themes/dist/). Public repos use raw.githubusercontent.com. */
export function githubSource(o: GithubSourceOptions = {}): Source {
  const repo = o.repo ?? 'TurboNZL/turboengine', ref = o.ref ?? 'main', dir = o.dir ?? 'themes/dist';
  if (!o.token) return { ...urlSource(`https://raw.githubusercontent.com/${repo}/${ref}/${dir}`), describe: `github.com/${repo}@${ref}` };
  return {
    describe: `github.com/${repo}@${ref} (private)`,
    async fetchText(file) {
      const res = await fetch(`https://api.github.com/repos/${repo}/contents/${dir}/${file}?ref=${encodeURIComponent(ref)}`, {
        cache: 'no-cache', headers: { Accept: 'application/vnd.github.raw+json', Authorization: `Bearer ${o.token}`, 'X-GitHub-Api-Version': '2022-11-28' },
      });
      if (!res.ok) throw new Error(`${file}: HTTP ${res.status}${res.status === 404 || res.status === 401 ? ' (is the token allowed to read the repository?)' : ''}`);
      return res.text();
    },
  };
}
