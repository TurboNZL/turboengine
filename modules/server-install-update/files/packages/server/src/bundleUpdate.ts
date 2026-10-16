import { spawn } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readdirSync, readlinkSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, join, relative } from 'node:path';
import type { UpdateState } from './update.ts';

/**
 * "Update server" for the self-contained install (scripts/install-server.sh), which keeps everything under one folder:
 *   <root>/releases/<version>/   headless.mjs + web/      <root>/app -> releases/<version>      <root>/data   <root>/node   <root>/tools
 * The newest release's server bundle is downloaded from GitHub, unpacked next to the running one, `app` is pointed at it (one atomic
 * rename) and the server exits so its service manager starts the new code. Nothing outside <root> is touched and nothing needs root.
 */
export interface BundleUpdaterOptions {
  root?: string;
  repo?: string;
  /** a read-only GitHub token, only for a private repository */
  token?: string;
  /** the version this process runs; default: the folder `app` points at */
  currentVersion?: string;
  fetchImpl?: typeof fetch;
  /** unpack a .tar.gz into a folder (default: the system `tar`) */
  extract?: (file: string, dest: string) => Promise<void>;
  exit?: () => void;
  exitDelayMs?: number;
  /** how many unpacked releases to keep, the running one included */
  keep?: number;
}

export const BUNDLE_ASSET = /^turbomusic-server-.*-(node|termux)\.tar\.gz$/;

interface Release { tag_name: string; draft?: boolean; assets?: { name: string; url: string; browser_download_url: string; digest?: string | null }[] }

/** 2026.10.39 > 2026.10.4 > 2026.9.40 (numbers, not text) */
export function newerVersion(a: string, b: string): boolean {
  const n = (v: string) => v.replace(/^v/, '').split('.').map((x) => parseInt(x, 10) || 0);
  const x = n(a), y = n(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] ?? 0) - (y[i] ?? 0); if (d) return d > 0; }
  return false;
}

export class BundleUpdater {
  private st: UpdateState = { status: 'idle', log: [], startedAt: null, restarting: false };
  private o: BundleUpdaterOptions;
  constructor(opts: BundleUpdaterOptions) { this.o = opts; }

  /** only for an install laid out like the installer makes it: `app` is a link into `releases/` */
  get available() {
    const root = this.o.root;
    if (!root) return false;
    try { return lstatIsLink(join(root, 'app')) && existsSync(join(root, 'releases')); } catch { return false; }
  }
  get restarts() { return true; }
  state(): UpdateState { return { ...this.st, log: [...this.st.log] }; }

  private log(line: string) { this.st.log.push(line); if (this.st.log.length > 300) this.st.log.splice(0, this.st.log.length - 300); }
  currentVersion(): string {
    if (this.o.currentVersion) return this.o.currentVersion;
    try { return basename(readlinkSync(join(this.o.root!, 'app'))); } catch { return '0'; }
  }

  start(): boolean {
    if (!this.available || this.st.status === 'running') return false;
    this.st = { status: 'running', log: [], startedAt: Date.now(), restarting: false };
    void this.run().then((restart) => {
      this.st.status = 'done';
      if (restart && this.o.exit) { this.st.restarting = true; setTimeout(this.o.exit, this.o.exitDelayMs ?? 4000); }
    }, (e: Error) => { this.log(`Stopped: ${e.message}`); this.st.status = 'error'; });
    return true;
  }

  /** true when a new version was put in place and the server should restart */
  private async run(): Promise<boolean> {
    const root = this.o.root!, f = this.o.fetchImpl ?? fetch, repo = this.o.repo ?? 'TurboNZL/turbomusic';
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'turbomusic-server', ...(this.o.token ? { Authorization: `Bearer ${this.o.token}` } : {}) };
    this.log(`Running ${this.currentVersion()}. Looking for a newer release…`);
    const res = await f(`https://api.github.com/repos/${repo}/releases?per_page=20`, { headers });
    if (!res.ok) throw new Error(res.status === 404 || res.status === 401 ? 'GitHub does not show the repository (a private one needs a token in TURBOMUSIC_GITHUB_TOKEN).' : res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0' ? "GitHub's hourly limit for requests without a token is used up. Try again later, or put a read-only token in TURBOMUSIC_GITHUB_TOKEN." : `GitHub answered ${res.status}.`);
    const releases = (await res.json() as Release[]).filter((r) => !r.draft && r.assets?.some((a) => BUNDLE_ASSET.test(a.name)));
    if (!releases.length) throw new Error('No release has a server bundle yet.');
    const latest = releases.reduce((a, b) => (newerVersion(b.tag_name, a.tag_name) ? b : a));
    const version = latest.tag_name.replace(/^v/, '');
    if (!newerVersion(version, this.currentVersion())) { this.log(`${this.currentVersion()} is the newest version.`); return false; }
    const asset = latest.assets!.find((a) => BUNDLE_ASSET.test(a.name))!;
    this.log(`Downloading ${asset.name}…`);
    const dir = join(root, 'releases');
    const partial = join(dir, `.${version}.partial`), tarball = join(dir, `.${version}.tar.gz`), target = join(dir, version);
    rmSync(partial, { recursive: true, force: true }); rmSync(tarball, { force: true });
    // a private repository's assets come through the API url with the token; a public one straight from the download url
    const dl = await f(this.o.token ? asset.url : asset.browser_download_url, { headers: { ...headers, Accept: 'application/octet-stream' }, redirect: 'follow' });
    if (!dl.ok || !dl.body) throw new Error(`The download failed (${dl.status}).`);
    // the bundle is a few MB: read it whole instead of streaming (Node's streamed web responses can assert and take the whole process down when a connection ends mid-stream)
    const bytes = Buffer.from(await dl.arrayBuffer());
    writeFileSync(tarball, bytes);
    const want = asset.digest?.startsWith('sha256:') ? asset.digest.slice(7) : null;
    if (want) {
      if (createHash('sha256').update(bytes).digest('hex') !== want) { rmSync(tarball, { force: true }); throw new Error('The download is damaged (checksum differs). Nothing was changed.'); }
      this.log('Checksum ok.');
    }
    mkdirSync(partial, { recursive: true });
    await (this.o.extract ?? tarExtract)(tarball, partial);
    rmSync(tarball, { force: true });
    if (!existsSync(join(partial, 'headless.mjs')) || !existsSync(join(partial, 'web', 'index.html'))) { rmSync(partial, { recursive: true, force: true }); throw new Error('The download is not a server bundle. Nothing was changed.'); }
    rmSync(target, { recursive: true, force: true });
    renameSync(partial, target);
    // one atomic switch: a new link renamed over the old one, so the server never sees a half-way state
    const link = join(root, 'app'), next = join(root, '.app.next');
    rmSync(next, { force: true });
    symlinkSync(relative(root, target), next);
    renameSync(next, link);
    this.log(`Now on ${version}. Restarting…`);
    this.prune(dir, version);
    return true;
  }

  /** older unpacked releases are removed, a few are kept so a bad one can be undone by pointing `app` back */
  private prune(dir: string, current: string) {
    const keep = this.o.keep ?? 3;
    const old = readdirSync(dir).filter((n) => !n.startsWith('.') && n !== current).map((n) => ({ n, t: statSync(join(dir, n)).mtimeMs })).sort((a, b) => b.t - a.t).slice(Math.max(0, keep - 1));
    for (const o of old) rmSync(join(dir, o.n), { recursive: true, force: true });
  }
}

const lstatIsLink = (p: string) => lstatSync(p).isSymbolicLink();

function tarExtract(file: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const c = spawn('tar', ['-xzf', file, '-C', dest], { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    c.stderr.on('data', (d: Buffer) => { err += d.toString(); });
    c.on('error', (e) => reject(new Error(`Could not run tar: ${e.message}`)));
    c.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`tar stopped with code ${code}: ${err.trim().slice(-200)}`))));
  });
}
