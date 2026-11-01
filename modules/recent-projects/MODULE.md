# Project files and recent projects

A project is a **file** the person chose a place for, not a cache. Optional. Source: `TurboNZL/turbocut` (runs there, tested in headless Chromium with a fake shell API and in real Electron).

- `src/app/projectFiles.ts`: `ProjectRef` (a path through the Electron shell, a File System Access handle, or a path under Documents/TurboCut on Android), `saveAs`, `writeRef`, `readRef`, `openDialog`. A browser without handles downloads a copy.
- `electron/projectFiles.cjs`: the save/open dialogs, atomic write (temporary file then rename), only `.turbocut`/`.json` absolute paths, `media:stat`; main.cjs also needs a `/media/<encoded path>` branch in its protocol handler (existing media files only), a `will-prevent-unload` message box, and preload bridges `project` and `media` (`webUtils.getPathForFile`).
- `src/app/mediaPaths.ts`: remembers `Asset.path` (desktop only) so opening a project finds its media by itself.
- `src/app/recent.ts`: `rememberFile(project, ref)`, `listRecent()`, `recentRef(key)`, `forgetRecent(key)`, `ago()`. IndexedDB version 2 drops the old version-1 rows, which held a copy of every edit.

## Rules
Save asks where the first time and writes back after; autosave only writes to an existing file; unsaved work is asked about (Save, Discard, Cancel; Escape cancels) before New, Open and closing; a "new project" shape on the home screen is a new project.

## Gotchas
- `beforeunload` blocks closing silently in Electron: answer `will-prevent-unload` with a message box.
- Handles clone into IndexedDB, but a test double with functions does not: fake the shell API instead.
- A project file may contain any path: serve only existing files with a media extension.
- Android's Documents write and real-Chrome handles are untested.
