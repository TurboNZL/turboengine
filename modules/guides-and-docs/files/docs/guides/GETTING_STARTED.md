# Getting started

TurboMusic keeps your music library, plays it, and lets you rank it by choosing between two tracks at a time. **You need nothing but one of the first two options below.** A home server (option 3) is optional and only matters once you want the same library on several devices; it can be a Windows PC, a Linux computer or a Raspberry Pi.

## 1. On a computer: the desktop app (simplest)
1. Open the [latest release](https://github.com/TurboNZL/turbomusic/releases/latest) and download the installer for your system (Windows `.exe`, Linux `.AppImage` or `.deb`).
2. Install and open it. It brings its own server and stores your library in a folder (Settings → This app shows where; you can change it). There is nothing to connect or type.
3. To bring music in, press **Add** (top right):
   - **Add audio files**: pick mp3/flac/m4a files from your computer.
   - **Import album from YouTube**: paste a YouTube Music album link. This needs **yt-dlp** and **ffmpeg** on the computer: Windows `winget install yt-dlp ffmpeg`, Linux `sudo apt install ffmpeg yt-dlp` (or the [yt-dlp releases](https://github.com/yt-dlp/yt-dlp/releases)). Settings → Server → Test connection says whether they are found.
   - **Import from Spotify**: your playlists or your account data (see [SPOTIFY.md](SPOTIFY.md)).
4. The app updates itself: when a new version is out it downloads in the background and installs when you close it.

## 2. In a browser or on a phone, no install
Open the address of a TurboMusic server in any browser (option 3 gives you one). The app works offline once loaded and syncs when the server is reachable. On Android you can also install the **Android app** from the same releases page (`turbomusic-<version>-android.apk`: allow "install unknown apps" for your browser once). It plays in the background, with a media notification and Android Auto.

## 3. A home server (the same library on all your devices)
Any computer that stays on can be the server: a **Windows PC** ([WINDOWS_SERVER.md](WINDOWS_SERVER.md): an installer with a setup wizard), or a **Linux machine such as a Raspberry Pi** (below). Pick one; you can change your mind later because the library moves with a backup.

### Linux or Raspberry Pi
**You need:** a Raspberry Pi (64-bit Raspberry Pi OS, any model that runs it), its power supply, a network cable or Wi-Fi, and a drive for the music (an external USB drive; **not the SD card**, which wears out). You do this once.

1. Plug the drive in. Find its name and mount it: `lsblk -f` shows it; if it already appears under `/media/...` or `/mnt/...` you can use that folder. (Making the mount permanent: [DEPLOY_PI.md](DEPLOY_PI.md) section 1.)
2. On the Pi (a terminal, or `ssh` from your computer), run one command, with the folder on the drive where the library should live:
   ```
   curl -fsSL https://raw.githubusercontent.com/TurboNZL/turbomusic/main/scripts/install-pi.sh | sudo bash -s -- --data-dir /mnt/music/curator
   ```
   It installs everything it needs (Node, ffmpeg, yt-dlp, the app), starts the server, and prints the address and the token. It takes a few minutes. Run it again at any time to repair or update; add `--dry-run` first to see exactly what it would do.
3. Open the printed address (for example `http://raspberrypi.local:47813`) in a browser. The first screen asks for the **token** the installer printed (it is also in `<your folder>/token`). Paste it, and you are in.
4. On every other device (phone, desktop app): Settings → Server → type the address and the token → Save & sync.

Check the server's health any time in Settings → Server → **Server health** (free space, temperature, power, memory). If the library is on the SD card it warns you, and **Storage locations** can move the music to a drive.

**Away from home:** do not open the port to the internet. Use [Tailscale](https://tailscale.com) (free for personal use) on the Pi and your phone: DEPLOY_PI.md section 5 has the two commands.

## First ten minutes in the app
1. **Add music** (above). Albums, singles, eras and playlists appear in the side bar.
2. **Rank** (side bar): two tracks side by side, tap the one you like more. After a few dozen votes every track has a rating from 0 to 10, and *Stats* and *Discover* start to say something useful.
3. **Health** (side bar): a checklist of what is incomplete (covers, links, dates, duplicates), each with a one-click tool where one exists, such as *Find dates automatically* and *Find YouTube Music albums* (it searches YouTube for each album that has no link and opens the importer with the best match, one release at a time). Videos YouTube reports as gone are listed as *Dead YouTube links*.
4. **Settings → Appearance:** pick a colour theme and a UI style (there are many, including old Windows and macOS looks).
5. **Back up** (Settings → Server → Backup): export the database and the files before you try anything big.

## If something does not work
| What you see | What to do |
|---|---|
| "Token rejected" / "Wrong token" | The token is the text in `<data folder>/token` on the server. Copy it again (Settings → Copy access token on a connected device). |
| YouTube import says yt-dlp or ffmpeg was not found | Install them on the **server** (the computer that runs it) or, for the desktop app, on the computer. Settings → Test connection shows what is found. |
| Downloads fail with `HTTP Error 403` | yt-dlp is too old: `sudo yt-dlp -U` (the installer also updates it weekly). Then press *Download missing audio* again. |
| "Sign in to confirm you're not a bot" | [YTDLP_COOKIES.md](YTDLP_COOKIES.md). |
| The server will not start | On a Raspberry Pi or Linux server: `journalctl -u curator -n 50`, and [DEPLOY_PI.md](DEPLOY_PI.md) → Troubleshooting. |

All guides are also inside the app: **Settings → Guides**.
