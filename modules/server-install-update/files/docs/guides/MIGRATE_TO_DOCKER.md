# Move your server to Docker (and off the old `curator` account)

Docker runs the server in a container as an ordinary unprivileged user, so you need **no dedicated service account, no systemd unit of your own, no sudoers entry and no Node on the host**. Your library stays where it is: the container just opens the same folder. An update becomes `docker compose pull && docker compose up -d`.

This guide is for a server that was installed the old way (the one-command installer, or the server `.deb`). It takes about fifteen minutes. Nothing is deleted until the end, so you can go back at any point.

**What does not carry over:** Spotify's *Soloist* and "Send the sound to the apps" need the host's sound server, which a container does not have. If you use them, keep running the server directly. Spotify as a speaker through the Spotify app (the recommended way) is not affected.

## 1. Back up first
1. In the app: **Settings**, the section *Backup: export and import*: export the database (and the files if you can; they are large). Or simply copy the data folder somewhere: it is the safety net.
2. Find the data folder. On a server made by the one-command installer (service `curator`, user `curator`):
   ```
   systemctl cat curator | grep -i DATA_DIR
   ```
   It shows `CURATOR_DATA_DIR=/some/path` (the installer's default is `/var/lib/curator`; often it is a folder on your external drive). For the server `.deb` (service `music-curator-server`, user `music-curator`) it is `/var/lib/music-curator` unless `/etc/music-curator/server.env` says otherwise. Write the path down: it is `<DATA>` below. Inside it you will see `curator.db` (the database), `files/`, `token`, maybe `cache/` and `tmp/`.

## 2. Stop the old server
```
sudo systemctl stop curator        # the .deb: music-curator-server
sudo systemctl disable curator
```
(Stopping first matters: two servers must never open the same database.)

## 3. Install Docker
Raspberry Pi OS / Debian / Ubuntu:
```
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER      # log out and in again afterwards
```
Check with `docker run --rm hello-world`.

## 4. Get the compose file
```
mkdir ~/turbomusic && cd ~/turbomusic
curl -fsSLO https://raw.githubusercontent.com/TurboNZL/turbomusic/main/docker-compose.yml
curl -fsSL https://raw.githubusercontent.com/TurboNZL/turbomusic/main/.env.example -o .env
```
Edit `.env`: set `TURBOMUSIC_DATA=<DATA>` (the absolute path from step 1). Leave `TURBOMUSIC_TOKEN` blank: the server keeps using the token already stored in `<DATA>/token`, so every phone and computer stays connected.

## 5. Let the container's user own the folder
The server in the container runs as user id 1000 (`node`). Give it the folder (the old `curator` account no longer needs it):
```
sudo chown -R 1000:1000 <DATA>
```
If your `files/`, `cache/` or `tmp/` folder is a **symlink to another drive** (the *Move storage* button in Settings → Server makes those), that drive must also be visible inside the container at the same path. Add it under `volumes:` in the compose file, for example `- /mnt/bigdrive:/mnt/bigdrive`. `ls -l <DATA>` shows the links.

## 6. Start it
```
docker compose pull
docker compose up -d
docker compose logs -f
```
The log shows the data folder, the address and the token. The first start renames `curator.db` to `turbomusic.db` (and its `-wal`/`-shm` files) by itself; that is the only change to your data. Open `http://<this machine>:47813` and check that your library is there.

## 7. The Cloudflare tunnel
- **Already running on the host** (a `cloudflared` service): nothing to change, the server is on the same port (47813).
- **Move it into Docker too:** put the tunnel token in `.env` (`TUNNEL_TOKEN=...`), stop the host service (`sudo systemctl disable --now cloudflared`) and start with `docker compose --profile tunnel up -d`. In the tunnel's public hostname settings the service stays `http://turbomusic:47813` for the container, or `http://localhost:47813` if cloudflared stays on the host.
- Cloudflare Access (service tokens) works exactly as before.

## 8. Point your devices at it
- **Phones and other computers on the web client:** nothing, the address and token are unchanged.
- **Android app:** the app has a new package name, so it installs next to the old one as a **new app**. Install the new APK, sign in once (Settings → Server: the address and token, or paste a pairing code made by *Pair a device* on a connected device), let it sync, then uninstall the old app.
- **Desktop app (.deb):** the package is now `turbomusic` (it was `music-curator`). Install the new `.deb`, then `sudo apt remove music-curator music-curator-app`. Its settings folder is moved with Settings → This app → *Move to the TurboMusic folder* (in the old app) or simply set the server address again.

## 9. Updating from now on
```
cd ~/turbomusic
docker compose pull && docker compose up -d
```
The image also updates yt-dlp every time the container starts. The **Update server** button in Settings is for the old git-based install and does not appear in Docker.

## 10. Remove the old install (after a few days of it working)
```
sudo systemctl disable --now curator curator-ytdlp-update.timer 2>/dev/null
sudo rm -f /etc/systemd/system/curator.service /etc/systemd/system/curator-ytdlp-update.* /etc/sudoers.d/curator
sudo systemctl daemon-reload
sudo userdel curator               # the account; its home folder with the old checkout stays until you delete it
rm -rf ~/music-curator             # the old checkout, if you made one under your own account
```
For the `.deb` instead: `sudo systemctl disable --now music-curator-server`, `sudo apt remove music-curator-server` and `sudo userdel music-curator` (the package keeps `/var/lib/music-curator`; only delete that folder if `<DATA>` is somewhere else and you have checked the library works).

## If something is wrong
- **The page is empty after the start:** the container opened a different folder than the library. `docker compose exec turbomusic ls /data` should show `turbomusic.db` and `files`.
- **`unable to open database file` / permission denied:** step 5 (the folder must belong to user 1000).
- **Songs do not play:** `ls -l <DATA>/files` — if it is a link, mount its target (step 5).
- **YouTube downloads fail:** `docker compose exec turbomusic yt-dlp --version`, then `docker compose restart` (it updates itself on start); see [YTDLP_COOKIES.md](YTDLP_COOKIES.md).
- **Going back:** `docker compose down`, `sudo chown -R curator:curator <DATA>`, rename `turbomusic.db` back to `curator.db` and start the old service (older versions of the server only know the old file name).
