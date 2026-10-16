import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, symlinkSync, writeFileSync, readdirSync, utimesSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BundleUpdater, newerVersion } from '../src/bundleUpdate.ts';

/** a real release bundle (headless.mjs + web/) packed with the real tar */
function makeBundle(dir: string, tag: string, withIndex = true) {
  const src = join(dir, `src-${tag}`); mkdirSync(join(src, 'web'), { recursive: true });
  writeFileSync(join(src, 'headless.mjs'), `// ${tag}`); if (withIndex) writeFileSync(join(src, 'web', 'index.html'), `<html>${tag}</html>`);
  const file = join(dir, `bundle-${tag}.tar.gz`);
  execFileSync('tar', ['-czf', file, '-C', src, '.']);
  return readFileSync(file);
}
/** an install laid out like the installer makes it, running `current` */
function install(current: string) {
  const root = mkdtempSync(join(tmpdir(), 'tm-install-'));
  mkdirSync(join(root, 'releases', current), { recursive: true }); writeFileSync(join(root, 'releases', current, 'headless.mjs'), 'old');
  symlinkSync(join('releases', current), join(root, 'app'));
  return root;
}
function fakeGithub(releases: { tag: string; bytes?: Buffer; digest?: string; name?: string }[]) {
  const calls: string[] = [];
  const f = (async (url: string) => {
    calls.push(url);
    if (url.includes('/releases?')) {
      return new Response(JSON.stringify(releases.map((r) => ({ tag_name: r.tag, draft: false, assets: [{ name: r.name ?? `turbomusic-server-${r.tag.slice(1)}-node.tar.gz`, url: `https://api.example/asset/${r.tag}`, browser_download_url: `https://dl.example/${r.tag}.tar.gz`, digest: r.digest ?? (r.bytes ? `sha256:${createHash('sha256').update(r.bytes).digest('hex')}` : null) }] }))));
    }
    const tag = /\/(v[\d.]+)(\.tar\.gz)?$/.exec(url)?.[1];
    const r = releases.find((x) => x.tag === tag);
    return new Response(r?.bytes ? new Uint8Array(r.bytes) : null, { status: r?.bytes ? 200 : 404 });
  }) as unknown as typeof fetch;
  return { f, calls };
}
const done = (u: BundleUpdater) => new Promise<void>((resolve) => { const t = setInterval(() => { if (u.state().status !== 'running') { clearInterval(t); resolve(); } }, 20); });

describe('versions', () => { it('compare as numbers', () => { expect(newerVersion('2026.10.39', '2026.10.4')).toBe(true); expect(newerVersion('v2026.9.40', '2026.10.0')).toBe(false); expect(newerVersion('2026.10.3', '2026.10.3')).toBe(false); }); });

describe('BundleUpdater', () => {
  it('is only offered for an install laid out by the installer', () => {
    expect(new BundleUpdater({}).available).toBe(false);
    expect(new BundleUpdater({ root: mkdtempSync(join(tmpdir(), 'tm-x-')) }).available).toBe(false);
    expect(new BundleUpdater({ root: install('2026.10.1') }).available).toBe(true);
  });
  it('downloads the newest bundle, switches `app` and asks to restart', async () => {
    const root = install('2026.10.1'), tmp = mkdtempSync(join(tmpdir(), 'tm-b-'));
    const gh = fakeGithub([{ tag: 'v2026.10.1' }, { tag: 'v2026.10.2', bytes: makeBundle(tmp, 'v2026.10.2') }]);
    let exited = 0;
    const u = new BundleUpdater({ root, fetchImpl: gh.f, exit: () => { exited++; }, exitDelayMs: 1 });
    expect(u.start()).toBe(true); expect(u.start()).toBe(false);
    await done(u); await new Promise((r) => setTimeout(r, 30));
    expect(u.state().status).toBe('done');
    expect(readlinkSync(join(root, 'app'))).toBe(join('releases', '2026.10.2'));
    expect(readFileSync(join(root, 'app', 'headless.mjs'), 'utf8')).toBe('// v2026.10.2');
    expect(existsSync(join(root, 'app', 'web', 'index.html'))).toBe(true);
    expect(exited).toBe(1);
    expect(readdirSync(join(root, 'releases')).sort()).toEqual(['2026.10.1', '2026.10.2']); // no partial files left
  });
  it('does nothing when it already runs the newest', async () => {
    const root = install('2026.10.2'), tmp = mkdtempSync(join(tmpdir(), 'tm-b-'));
    const u = new BundleUpdater({ root, fetchImpl: fakeGithub([{ tag: 'v2026.10.2', bytes: makeBundle(tmp, 'v2026.10.2') }]).f, exit: () => { throw new Error('must not restart'); }, exitDelayMs: 1 });
    u.start(); await done(u);
    expect(u.state().status).toBe('done'); expect(u.state().restarting).toBe(false);
    expect(u.state().log.join('\n')).toMatch(/is the newest/);
  });
  it('refuses a damaged download and leaves the running version alone', async () => {
    const root = install('2026.10.1'), tmp = mkdtempSync(join(tmpdir(), 'tm-b-'));
    const u = new BundleUpdater({ root, fetchImpl: fakeGithub([{ tag: 'v2026.10.2', bytes: makeBundle(tmp, 'v2026.10.2'), digest: 'sha256:' + '0'.repeat(64) }]).f });
    u.start(); await done(u);
    expect(u.state().status).toBe('error'); expect(u.state().log.join('\n')).toMatch(/damaged/);
    expect(readlinkSync(join(root, 'app'))).toBe(join('releases', '2026.10.1'));
    expect(readdirSync(join(root, 'releases'))).toEqual(['2026.10.1']);
  });
  it('refuses something that is not a server bundle', async () => {
    const root = install('2026.10.1'), tmp = mkdtempSync(join(tmpdir(), 'tm-b-'));
    const u = new BundleUpdater({ root, fetchImpl: fakeGithub([{ tag: 'v2026.10.2', bytes: makeBundle(tmp, 'v2026.10.2', false) }]).f });
    u.start(); await done(u);
    expect(u.state().status).toBe('error'); expect(u.state().log.join('\n')).toMatch(/not a server bundle/);
    expect(readlinkSync(join(root, 'app'))).toBe(join('releases', '2026.10.1'));
  });
  it('says plainly when GitHub does not show the repository, and when no release has a bundle', async () => {
    const root = install('2026.10.1');
    const u1 = new BundleUpdater({ root, fetchImpl: (async () => new Response('', { status: 404 })) as unknown as typeof fetch });
    u1.start(); await done(u1); expect(u1.state().log.join('\n')).toMatch(/does not show the repository/);
    const u2 = new BundleUpdater({ root, fetchImpl: fakeGithub([{ tag: 'v2026.10.2', name: 'something-else.zip' }]).f });
    u2.start(); await done(u2); expect(u2.state().log.join('\n')).toMatch(/No release has a server bundle/);
  });
  it('keeps the last few releases and removes older ones', async () => {
    const root = install('2026.10.1'), tmp = mkdtempSync(join(tmpdir(), 'tm-b-'));
    for (const [i, v] of ['2026.9.5', '2026.9.6', '2026.9.7'].entries()) { mkdirSync(join(root, 'releases', v)); const t = new Date(Date.now() - (10 - i) * 86400000); utimesSync(join(root, 'releases', v), t, t); }
    const u = new BundleUpdater({ root, keep: 3, fetchImpl: fakeGithub([{ tag: 'v2026.10.2', bytes: makeBundle(tmp, 'v2026.10.2') }]).f });
    u.start(); await done(u);
    expect(readdirSync(join(root, 'releases')).sort()).toEqual(['2026.10.1', '2026.10.2', '2026.9.7'].sort());
  });
});
