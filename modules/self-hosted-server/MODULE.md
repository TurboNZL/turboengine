# Self-hosted server: the mandatory set

An app that runs its own server must ship these together, so every TurboNZL server is reached, installed and updated the same way. Has no files; it lists what is required.

Recommended for every app. Reference files are in `files/` (the paths are the paths in the app); source: `TurboNZL/turbomusic` at `ea3f5ea`.

**Requires:** `cloudflare-access`, `server-install-update`, `updaters`, `release-pipeline`.

A bundle, not code. If an app runs **its own server** (a library, a project store, anything the apps talk to), these modules are not optional:

| Module | Why it is mandatory here |
|---|---|
| `cloudflare-access` | the way a server is reached from outside the home network is a Cloudflare tunnel; every client must be able to send the Access token |
| `server-install-update` | one way to install the server on Linux/Windows and one in-app button to update it |
| `updaters` | the apps update themselves (.deb, AppImage, Windows, APK) the same way the server does |
| `release-pipeline` | the releases the updaters read |

Add to `.turboengine.json` all four plus this name, then do the checklist: Access fields in Settings (id, secret) wired into every request path, pairing code carries them, the update card appears on a service install, the guide for installing the server exists in `docs/guides`.
