# Build on the pull request, publish the same files on merge

A pull request builds every app (APK, installers, web bundle) as soon as it is opened or updated. When it is merged, the push to `main` publishes **those same files** if nothing that matters has changed, so nobody waits for a second build of something that already exists. Every release is a normal release; branches never make pre-releases.

Optional. Works with `release-pipeline` naming (`v<year>.<month>.<n>`, lowercase assets). Reference files are in `files/`; source: `TurboNZL/turbocut` (`.github/workflows/build.yml`), where it was written. The decision logic is a small tested script, the workflow only calls it.

## How it decides (`scripts/ci/reuse-build.mjs`)
A build is reused only when all four hold; any doubt, or any failed lookup, means "build again":
1. the commit on `main` belongs to a merged pull request (`GET /repos/{repo}/commits/{sha}/pulls`);
2. the PR's last commit has a successful run of `build.yml` for the `pull_request` event;
3. the git **tree hash** of the PR head equals the tree of the commit on `main` (a squash or merge commit with an up-to-date base has the same tree; a base that moved does not);
4. the version stamped into the PR build (`build-meta` artifact, `meta.json`) is still the next free version. The version is inside the binaries and in `latest*.yml`, so a build made for `2026.10.7` cannot be published as `2026.10.8`.

## Workflow shape
- `version` job: picks the next version, and on a push to `main` runs the script; output `reuse` is the run id or empty. On a PR it also uploads `build-meta`.
- Build jobs (`android`, `desktop`, `web`): `if: needs.version.outputs.reuse == ''`; check out `github.event.pull_request.head.sha` (not the merge ref, otherwise the tree never matches); upload artifacts for 30 days on PRs, 1 day otherwise.
- `release` job: never on a PR; runs when builds succeeded **or were skipped**; downloads either its own artifacts or `gh run download <reuse>`; `gh release create`.
- Concurrency: PR builds cancel older builds of the same branch; releases queue and are never cancelled mid-way.
- Permissions needed: `actions: read` (download another run's artifacts), `contents: write` on `release` only.

## Gotchas
- Artifact retention is the limit: a PR merged after the artifacts expired (30 days) simply rebuilds.
- Docs-only PRs are skipped by `paths-ignore`, so they have no build and (correctly) publish nothing.
- The build matrix needs secrets-free builds (a fork PR gets none); keep signing keys that are public (debug keystore) or build signed releases only on `main`.
- Not run against real GitHub when written: the script is unit tested with a fake `gh`/`git` (`test/reuseBuild.test.ts`); the first merged PR is the real test. Read the "Can a pull request build be published as it is?" step log: it prints why it did or did not reuse.
