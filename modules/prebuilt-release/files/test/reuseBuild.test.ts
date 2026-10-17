import { describe, expect, it } from 'vitest';
// @ts-expect-error plain ES module script
import { findReusableRun } from '../scripts/ci/reuse-build.mjs';

const SHA = 'a'.repeat(40);
const HEAD = 'b'.repeat(40);

/** A fake gh and git: `trees` says which tree each commit has. */
function world(over: { prs?: unknown[]; runs?: unknown[]; trees?: Record<string, string>; meta?: { version?: string } | null } = {}) {
  const trees = over.trees ?? { [HEAD]: 't1', [SHA]: 't1' };
  const sh = (cmd: string, args: string[]) => {
    if (cmd === 'gh' && args[0] === 'api') return JSON.stringify(over.prs ?? [{ merged_at: '2026-10-17', merge_commit_sha: SHA, head: { sha: HEAD } }]);
    if (cmd === 'gh' && args[0] === 'run') return JSON.stringify(over.runs ?? [{ databaseId: 42 }]);
    if (cmd === 'git' && args[0] === 'fetch') return '';
    if (cmd === 'git') return trees[args[1]!.split('^')[0]!] + '\n';
    throw new Error('unexpected ' + cmd);
  };
  const readMeta = () => (over.meta === undefined ? { version: '2026.10.7' } : over.meta);
  return { sha: SHA, version: '2026.10.7', workflow: 'build.yml', repo: 'o/r', sh, readMeta };
}

describe('findReusableRun', () => {
  it('reuses a pull request build of the same tree and version', () => {
    expect(findReusableRun(world()).run).toBe('42');
  });
  it('builds again when main changed the source', () => {
    const r = findReusableRun(world({ trees: { [HEAD]: 't1', [SHA]: 't2' } }));
    expect(r.run).toBeNull();
    expect(r.why).toMatch(/changed the source/);
  });
  it('builds again when the next version moved on', () => {
    expect(findReusableRun(world({ meta: { version: '2026.10.6' } })).run).toBeNull();
  });
  it('builds again with no merged pull request, no successful run, or no metadata', () => {
    expect(findReusableRun(world({ prs: [] })).run).toBeNull();
    expect(findReusableRun(world({ prs: [{ merged_at: null, head: { sha: HEAD } }] })).run).toBeNull();
    expect(findReusableRun(world({ runs: [] })).run).toBeNull();
    expect(findReusableRun(world({ meta: null })).run).toBeNull();
  });
  it('treats a failing lookup as build again', () => {
    const w = world();
    expect(findReusableRun({ ...w, sh: () => { throw new Error('rate limited'); } }).run).toBeNull();
  });
});
