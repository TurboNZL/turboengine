# New app checklist (the AI does the files; the user does the GitHub settings)

A new program is not set up until all of this is done. The AI must do the first block itself and then **remind the user, in plain words, of the second block** before saying the app is ready.

## The AI creates
1. **A default `main` branch.** A new repository has no branch until something is pushed: create it with the first commit (`git checkout -b main`, commit, `git push -u origin main`) and make it the default branch. Releases, `auto-pr.yml` and `check.yml` all key off `main`. Work then continues on a separate branch, never on `main`.
2. **`LICENSE`: MIT** (copy `templates/LICENSE`; copyright holder "TurboNZL" unless the owner says otherwise) and `"license": "MIT"` in every `package.json`.
3. **`README.md`** (from `templates/README.md`): what it is, how to run it, how releases work, the license.
4. **If it runs a server: a port.** Take the next free number in `docs/PORTS.md` (never 8080), add its row, make it a setting, and read `docs/SERVER_APPS.md` to choose the hosting way (native service or Docker).
5. `CLAUDE.md`, `PROJECT_BRIEF.md` and `.turboengine.json` from the templates, and the engine modules the app needs (always `release-pipeline`, `updaters`, `appearance`, `guides-and-docs`, `logos`; plus `self-hosted-server` if it runs its own server).
6. **Tokens can be recovered** (apps with their own server and accounts): a per-device token on every pairing, a `new-token` server command, and a Settings card that lists and removes devices (`modules/device-pairing/MODULE.md`). Do not ship a server where a lost token means a lost account.
7. **A logo**: copy the `logos` module, set `branding/logo.json` (`name`, an `emblem`; ask the user what the app's one-word idea is and draw it, see `modules/logos/MODULE.md`), run `node scripts/gen-icons.mjs --png --sheet sheet.png` and check the sheet at 32 and 16 px.

## The user must do (the AI cannot, so it reminds them)
1. **Enable GitHub Actions** for the repository: *Settings > Actions > General > Actions permissions* (allow actions; a new or forked repository may have them off).
2. **Workflow permissions:** same page, *Workflow permissions*: choose **Read and write permissions** and tick **Allow GitHub Actions to create and approve pull requests**. Without these `auto-pr.yml` cannot open pull requests and `release.yml` cannot create releases.
3. **Update the Claude connection** if Claude's GitHub access is set to *select repositories only*: add the new repository to the Claude GitHub App's repository list (GitHub > Settings > Applications > Claude > Configure, or the install page https://github.com/apps/claude/installations/select_target) and reconnect on claude.ai if asked. Until then Claude sessions cannot see, clone or push to the new repository.
4. Optional but usual: protect `main` only after the first release has worked (a protection rule can block the release job's tag/push).

If the app was created from a Claude session, say these four things in the last message, not only in the docs.
