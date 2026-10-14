# Self-hosted server: the mandatory set

An app that runs its own server must ship these together, so every TurboNZL server is reached, installed and updated the same way. Has no files; it lists what is required.

Recommended for every app. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbomusic` at `62934e8`.

**Requires:** `cloudflare-access`, `server-install-update`, `updaters`, `release-pipeline`.

A bundle, not code. If an app runs **its own server** (a library, a project store, anything the apps talk to), these modules are not optional:

| Module | Why it is mandatory here |
|---|---|
| `cloudflare-access` | the way a server is reached from outside the home network is a Cloudflare tunnel; every client must be able to send the Access token |
| `server-install-update` | one way to install the server on Linux/Windows and one in-app button to update it |
| `updaters` | the apps update themselves (.deb, AppImage, Windows, APK) the same way the server does |
| `release-pipeline` | the releases the updaters read |

The install in `server-install-update` has two flavours: the systemd/Windows tray one, and **Docker** (preferred for a new server: no service account). Either way the same four are required.

Add to `.turboengine.json` all four plus this name, then do the checklist: Access fields in Settings (id, secret) wired into every request path, pairing code carries them, the update card appears on a service install, the guide for installing the server exists in `docs/guides`.

## Web-only apps (no desktop or Android client)
The set above assumes clients that connect to a server from elsewhere (apps on phones and desktops). An app that is **only a web page served by its own server** (TurboKeep) takes `docker-self-host` instead of `server-install-update` and `updaters`, keeps `release-pipeline` (with the `docker`/`node-bundle` jobs), and does **not** need the Access service-token fields: the page is on the same origin as the API, so the browser's own Cloudflare Access cookie covers every request (service-token headers are only for scripts, documented in its tunnel guide). Record each of those decisions in `.turboengine.json` `notes`, and take the full set (plus `cloudflare-access`, `device-pairing`) the day a native client appears.
