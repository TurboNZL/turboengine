# Move your server to the one-folder install

The server now lives in **one folder** that you choose, for example `/mnt/data/turbomusic`. That folder holds the program, its own Node, ffmpeg, yt-dlp and (by default) your library. It updates itself from the app: Settings > Server > **Update server**. No Docker, no `turbomusic` service account, no root needed to install.

## What touches the root drive (honest list)

Almost nothing, and nothing big:

- One small **link** in `~/.config/systemd/user/` that points at `turbomusic.service` inside your folder (this is what starts the server at boot).
- The **linger flag** (`loginctl enable-linger`), which lets the service run when nobody is logged in. It is a tiny file under `/var/lib/systemd/linger`.
- **Logs** go to the system journal (`journalctl --user -u turbomusic`). yt-dlp's cache and temp files are redirected into your data folder.
- `curl` and `xz-utils` must exist once on the system (`sudo apt install curl xz-utils`), and the installer refuses to run with `--root` on the same drive as `/` unless you pass `--allow-root-drive`.
- Only if you use Spotify's Soloist: `pipewire`, `pipewire-pulse` and `wireplumber` are system packages. Soloist works in this install (it runs natively, which Docker could not do).

## Steps

1. **Back up.** Settings > Library has the database and files export. Copy your data folder too if you can.
2. **Find your library folder.** Run `sudo bash scripts/remove-old-install.sh --dry-run` (or download it from the repository). It lists the old service and prints where your library is. It changes nothing in dry-run mode.
3. **Install, pointing at the existing library**, as the account that should own it (not root):

   ```
   sudo apt install curl xz-utils
   curl -fsSL https://raw.githubusercontent.com/TurboNZL/turbomusic/main/scripts/install-server.sh | bash -s -- --root /mnt/data/turbomusic --data-dir /mnt/data/<your library folder>
   ```

   If the old service account owned the library, give it to yourself once: `sudo chown -R "$USER": /mnt/data/<your library folder>`. Stop the old server first (`sudo systemctl stop curator`), as two servers must not share one database.
   The old `curator.db` is renamed to `turbomusic.db` on first start, with its history.
4. **Check it.** The installer prints the address and token. Open the address, then Settings > Server shows the version.
5. **Devices.** The Cloudflare tunnel keeps working: point it at the same port (47813 unless you changed it). The Android app and `.deb` packages were renamed, so install the new ones and remove the old ones (`music-curator*`). Your data comes from the server.
6. **Remove the old install** once the new server works:

   ```
   sudo bash scripts/remove-old-install.sh --dry-run   # look first
   sudo bash scripts/remove-old-install.sh --yes
   ```

   It removes the old services, timer, sudoers entry, packages, service account and app checkout. It never touches the library.

## Updating and settings

- Update: Settings > Server > **Update server** (or rerun the installer with `--update`). It downloads the release bundle, checks its checksum, switches an `app` link and restarts; the last three versions are kept in `releases/`.
- Settings (port, tokens, YouTube cookies): `settings.env` in your folder, then `systemctl --user restart turbomusic`.
- Logs: `journalctl --user -u turbomusic -n 50`.
- No systemd login session (for example some containers)? Start it by hand with `/mnt/data/turbomusic/run.sh`.
