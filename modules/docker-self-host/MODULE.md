# Docker image, compose with a Cloudflare tunnel, and the web auth that goes with it

A web app served by its own Node server, shipped as one multi-arch Docker image plus a Node tarball, with an optional `cloudflared` service, and the sign-in code that is safe behind a tunnel.

Optional. For an app that has **no desktop or Android client** and is only used through the browser (TurboKeep). Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbokeep` at `9e8b5a8`.

**Replaces, for such an app:** `server-install-update` (Docker is the install; `docker compose pull && docker compose up -d` is the update) and `updaters` (nothing to self-update). **Does not replace** `release-pipeline` (the Docker job is added to it, see below). If the app also has a desktop or Android client, take the full `self-hosted-server` set instead, and `cloudflare-access` for those clients.

## Pieces
- `Dockerfile`: the build stage runs on `$BUILDPLATFORM` (pnpm install + build once, no emulation), the final image only copies `server.mjs` and the built client, runs as `node`, one volume `/data`, one port, a health check on `/api/health`. `ARG VERSION` becomes `TURBOKEEP_VERSION` (rename it for your app).
- `docker-compose.yml`: the app (published on `127.0.0.1` only, named volume) and a `cloudflared` service in the `tunnel` profile that reads `TUNNEL_TOKEN` from `.env`. The tunnel's public hostname points at `http://<service>:<port>`.
- `apps/server/src/auth.ts`: scrypt passwords, sessions and `tk_` API tokens stored as SHA-256 only, a same-site check for cookie writes, a failed-login limiter, the visitor address behind a tunnel. It imports `./db.ts` (a `sessions` table with `token_hash, user_id, kind, name, created_at, expires_at, last_used`) and `./config.ts` (`trustProxy`, `origins`); the cookie name and the token prefix are TurboKeep's. Rename together; renaming after release logs everyone out.
- The server also needs, in `server.ts`: a **setup code** (random, printed to the log) for the first account when none exists, with `TURBOKEEP_ADMIN_USER`/`_PASSWORD` as the headless alternative. See TurboKeep `apps/server/src/server.ts` and the `/api/auth/register` route.

## Release workflow jobs (add to `release-pipeline`'s `release.yml`, replacing desktop/android)
```yaml
  docker:
    needs: release
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-qemu-action@v3
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with: { registry: ghcr.io, username: '${{ github.actor }}', password: '${{ secrets.GITHUB_TOKEN }}' }
      - id: meta
        run: |
          echo "image=ghcr.io/${GITHUB_REPOSITORY,,}" >> "$GITHUB_OUTPUT"
          TAG='${{ needs.release.outputs.tag }}'; echo "version=${TAG#v}" >> "$GITHUB_OUTPUT"
      - uses: docker/build-push-action@v6
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          build-args: VERSION=${{ steps.meta.outputs.version }}
          tags: |
            ${{ steps.meta.outputs.image }}:${{ steps.meta.outputs.version }}
            ${{ steps.meta.outputs.image }}:latest
```
plus `permissions: packages: write` on the workflow, and a `node-bundle` job that tars `server.mjs` + `web/` into `<app>-<version>-node.tar.gz` (see TurboKeep `release.yml`). `check.yml` gets a `docker/build-push-action` with `push: false`.

## Gotchas (each was found or checked in TurboKeep)
- **Behind a tunnel the visitor is `CF-Connecting-IP`.** Cloudflare *appends* to an `X-Forwarded-For` the visitor sent, so its first entry is forgeable: use the CF header, else the **last** `X-Forwarded-For` entry. Both are forgeable by anyone who reaches the port directly, so publish the container port on `127.0.0.1` only.
- **Same-site check:** `Sec-Fetch-Site: same-origin` first (the browser sets it, and it survives a tunnel/proxy that rewrites `Host`), then `Origin` against `Host`/`X-Forwarded-Host`, then an allow-list env var for odd setups.
- **The first account must not be claimable by whoever finds the URL first:** print a setup code in the log (or create the admin from env).
- Cloudflare refuses request bodies over the plan's limit (100 MB Free/Pro, 200 MB Business, 500 MB Enterprise) with a 413: big imports/uploads go through the LAN.
- Use `node:sqlite` (Node >= 22.13) instead of a native module: no compiler in the image, arm64 for free. Vitest handles it. Add `--disable-warning=ExperimentalWarning` to the start command.
- Name the volume's mount point in the image and `chown` it to `node` before `VOLUME`, otherwise a fresh named volume is root-owned and the app cannot write.
- Docker has no daemon in cloud sessions: the Dockerfile and compose file were replayed by hand there (clean `pnpm install --frozen-lockfile && pnpm build`, then the bundle run from an empty folder). The `docker` job in `check.yml` (`push: false`) then built the image on GitHub and passed, so the build is proven; running the container (volume ownership, health check) still wants one `docker compose up` on a real machine.
- **New ghcr packages start private.** After the first release, set the package to public (GitHub > Packages > the package > Package settings) or `docker compose pull` is denied for everyone else; say so in the app's self-hosting guide.
- `pnpm/action-setup@v4` with both `version:` and `packageManager` fails: use `packageManager` only (see `release-pipeline`).
- The Cloudflare tunnel guide in TurboKeep (`docs/guides/CLOUDFLARE_TUNNEL.md`) is the template for the user-facing steps.

## Files
- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- `.env.example`
- `apps/server/src/auth.ts`
