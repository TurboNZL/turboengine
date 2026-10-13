# Updating a home server (Linux or Raspberry Pi)

**Easiest:** open the app → **Settings → Server → Update server**. It does everything below and restarts the server.

**From a terminal**, as your normal login user on the server (the one with `sudo`, e.g. `pi-admin`):

```
sudo -u curator -H /home/curator/music-curator/scripts/update.sh
```
A server set up before `scripts/install-pi.sh` existed, with Node from nvm, uses the older form that loads nvm first:
```
sudo -u curator -H bash -c 'export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && bash ~/music-curator/scripts/update.sh'
```

What it does, in order (it prints each step and stops at the first one that fails):

1. runs as the `curator` user (`sudo -u curator -H`; `-H` makes `$HOME` that user's home, so `~` and nvm resolve correctly),
2. loads nvm so `node` and `pnpm` are on the `PATH`,
3. runs `~/music-curator/scripts/update.sh`, which
   - stops the `curator` service,
   - `git pull --ff-only`,
   - `pnpm install` for the core, server and web packages,
   - builds the web client (`pnpm --filter @curator/web build`),
   - starts the service again and checks that it is running.

The server serves the freshly built web client from `apps/web/dist`, so this one command updates both. Open devices pick up the new client the next time they load the page.

## From the app: Settings > Update server

Once the server runs as the systemd service from [DEPLOY_PI.md](DEPLOY_PI.md), Settings has an **Update server** button (it only appears when the server can do it). It runs `scripts/update.sh --live` (git pull, install, build the web client; no `sudo` needed because the service is not stopped), shows the output, then the server exits and systemd starts the new code (`Restart=on-failure` in the unit). The page waits for the server to come back. It needs the checkout to be a git clone owned by the service user and Node at `NODE_BIN` in the script, like the terminal command. Turn it off with `CURATOR_UPDATE=0`; outside systemd it is only offered with `CURATOR_UPDATE=1` (the update then happens but you restart the server yourself). The desktop and Android apps update separately (Settings > App updates).

## Things to know

- **First time only:** the code must already be on the server (`git clone https://github.com/TurboNZL/turbomusic/ ~/music-curator` as the `curator` user), and the `curator` systemd service must exist. See [DEPLOY_PI.md](DEPLOY_PI.md) sections 2 and 3.
- **Passwordless `systemctl`.** The script runs `sudo systemctl stop|start curator`, and the `curator` user has no sudo rights by default. Allow exactly that once, from your login user:
  ```
  sudo visudo -f /etc/sudoers.d/curator
  curator ALL=(root) NOPASSWD: /usr/bin/systemctl stop curator, /usr/bin/systemctl start curator, /usr/bin/systemctl is-active --quiet curator
  ```
  (check the path with `command -v systemctl`).
- **Node:** the script uses the `node` on the `PATH` (the installer puts it in `/usr/local/bin`), or the newest nvm install of the `curator` user. Set `CURATOR_NODE_BIN=/path/to/node/bin` to force one.
- **If a step fails after the service was stopped,** it stays stopped. Fix the cause and run the command again; the script is safe to re-run.
- **Your data is not touched.** The library, files and token live in `CURATOR_DATA_DIR` (on the external drive), not in the checkout.
- **The first start after this release converts old data by itself.** Every track and album that still has the old single-artist field gets a "Lead artist" credit instead; the web client does this once after it has synced, and the changes sync back to the server like any other edit.
- yt-dlp: a server set up with `scripts/install-pi.sh` updates it weekly by itself (`systemctl list-timers curator-ytdlp-update.timer`). Otherwise run `sudo yt-dlp -U` now and then; YouTube breaks old versions regularly (a `403 Forbidden` on downloads means it is too old).
- **Desktop and Android apps** update themselves from the project's GitHub releases. A release is created the moment a change is merged, and its installers are attached a few minutes later; a check in between used to say "Cannot find latest-linux.yml". The app now treats that as "not ready yet" and tries again later.

## Check it worked

```
sudo systemctl status curator --no-pager
curl -s http://localhost:47813/api/health          # {"ok":true,...}
```
In the app: Settings → Server → Test connection shows the yt-dlp / ffmpeg versions and whether a cookies file is configured.
