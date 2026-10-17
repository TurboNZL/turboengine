// Decides whether a push to main can publish the builds a pull request already made, instead of building again.
//
// A build is reusable when ALL of these hold:
//   1. the commit on main came from a merged pull request;
//   2. that pull request's last commit has a successful run of the build workflow (event pull_request);
//   3. the source tree is identical (git tree hash of the PR head == tree of the commit on main). This is true for a
//      squash or a merge commit when main had not moved since the PR was last updated; anything else changes the tree;
//   4. the version the PR build was stamped with is still the next free one (otherwise the files carry the wrong version).
// Anything else answers "build again". The script never guesses: a failed lookup is "build again".
//
// Usage in a workflow: node scripts/ci/reuse-build.mjs --sha $GITHUB_SHA --version 2026.10.7  (needs `gh` and git history)
// Prints `run=<id>` or `run=` as a GitHub output line.
import { execFileSync } from 'node:child_process';

/**
 * @param {{ sha: string, version: string, workflow: string, repo: string,
 *           sh: (cmd: string, args: string[]) => string, readMeta: (runId: string) => { version?: string } | null }} o
 * @returns {{ run: string | null, why: string }}
 */
export function findReusableRun({ sha, version, workflow, repo, sh, readMeta }) {
  try {
    const prs = JSON.parse(sh('gh', ['api', `repos/${repo}/commits/${sha}/pulls`]));
    const pr = prs.find((p) => p.merged_at && p.merge_commit_sha === sha) ?? prs.find((p) => p.merged_at);
    if (!pr) return { run: null, why: 'the commit did not come from a merged pull request' };
    const head = pr.head.sha;
    const runs = JSON.parse(sh('gh', ['run', 'list', '--repo', repo, '--workflow', workflow, '--commit', head, '--event', 'pull_request', '--status', 'success', '--json', 'databaseId', '--limit', '1']));
    if (!runs.length) return { run: null, why: `no successful pull request build for ${head.slice(0, 7)}` };
    // A squash or rebase merge leaves the PR's commits out of main's history; GitHub still serves them by hash.
    try { sh('git', ['fetch', '--no-tags', '--depth=1', 'origin', head]); } catch { /* the tree lookup below decides */ }
    const prTree = sh('git', ['rev-parse', `${head}^{tree}`]).trim();
    const mainTree = sh('git', ['rev-parse', `${sha}^{tree}`]).trim();
    if (prTree !== mainTree) return { run: null, why: 'main changed the source after the pull request was built' };
    const id = String(runs[0].databaseId);
    const meta = readMeta(id);
    if (!meta || meta.version !== version) return { run: null, why: `the pull request build is version ${meta?.version ?? '?'}, the next release is ${version}` };
    return { run: id, why: `reusing run ${id} built from the same tree` };
  } catch (e) {
    return { run: null, why: `lookup failed: ${e instanceof Error ? e.message.split('\n')[0] : e}` };
  }
}

const arg = (n) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const sh = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const repo = process.env.GITHUB_REPOSITORY;
  const out = findReusableRun({
    sha: arg('sha'),
    version: arg('version'),
    workflow: arg('workflow') ?? 'build.yml',
    repo,
    sh,
    readMeta: (id) => {
      try {
        const dir = execFileSync('mktemp', ['-d'], { encoding: 'utf8' }).trim();
        sh('gh', ['run', 'download', id, '--repo', repo, '-n', 'build-meta', '-D', dir]);
        return JSON.parse(sh('cat', [`${dir}/meta.json`]));
      } catch {
        return null;
      }
    },
  });
  console.error(out.why);
  console.log(`run=${out.run ?? ''}`);
}
