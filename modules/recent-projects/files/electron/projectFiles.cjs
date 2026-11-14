// Project files and media paths for the desktop app. The page is sandboxed and cannot touch the disk, so the shell does the saving and opening
// of `.turbocut` files (with the system's own dialogs) and serves media from the paths a saved project remembers.
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_EXT = /\.(turbocut|json)$/i;
const MEDIA_EXT = /\.(mp4|m4v|mov|mkv|webm|avi|mpg|mpeg|ts|3gp|ogv|mp3|m4a|aac|wav|flac|ogg|opus)$/i;
const MAX_PROJECT_BYTES = 64 * 1024 * 1024;

/** A path the page may ask us to read or write as a project: absolute, no NUL, a project extension. Returns the normalised path or throws a sentence. */
function projectPath(p) {
  if (typeof p !== 'string' || p.length === 0 || p.length > 1024 || p.includes('\0') || !path.isAbsolute(p)) throw new Error('That is not a usable file path.');
  if (!PROJECT_EXT.test(p)) throw new Error('A project file ends in .turbocut.');
  return path.normalize(p);
}

/** A media path the page may have served: absolute, a media extension, an existing regular file. Returns the normalised path or null. */
function mediaPath(p) {
  if (typeof p !== 'string' || p.length === 0 || p.length > 1024 || p.includes('\0') || !path.isAbsolute(p) || !MEDIA_EXT.test(p)) return null;
  const f = path.normalize(p);
  try {
    return fs.statSync(f).isFile() ? f : null;
  } catch {
    return null;
  }
}

/** Write to a temporary file in the same folder, then rename it over the target: a crash halfway never leaves a half-written project. */
function writeAtomic(file, text) {
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmp, text, 'utf8');
    fs.renameSync(tmp, file);
  } catch (e) {
    fs.rmSync(tmp, { force: true });
    throw e;
  }
}

function readProject(file) {
  const st = fs.statSync(file);
  if (!st.isFile() || st.size > MAX_PROJECT_BYTES) throw new Error('That file is not a project TurboCut can open.');
  return fs.readFileSync(file, 'utf8');
}

/** Register the IPC handlers. `dialog` is Electron's, `win` returns the window to attach dialogs to, `documents` is the folder the dialogs start in. */
function setupProjectFiles({ ipcMain, dialog, win, documents }) {
  const filters = [{ name: 'TurboCut project', extensions: ['turbocut'] }, { name: 'All files', extensions: ['*'] }];
  ipcMain.handle('project:save-as', async (_e, defaultName, text) => {
    if (typeof text !== 'string') throw new Error('Nothing to save.');
    const name = path.basename(String(defaultName || 'project.turbocut')).replace(/[\\/:*?"<>|\0]/g, ' ');
    const r = await dialog.showSaveDialog(win(), { title: 'Save project', defaultPath: path.join(documents(), name), filters: [filters[0]] });
    if (r.canceled || !r.filePath) return null;
    const file = projectPath(/\.(turbocut|json)$/i.test(r.filePath) ? r.filePath : `${r.filePath}.turbocut`);
    writeAtomic(file, text);
    return { path: file };
  });
  ipcMain.handle('project:write', (_e, file, text) => {
    if (typeof text !== 'string') throw new Error('Nothing to save.');
    writeAtomic(projectPath(file), text);
  });
  ipcMain.handle('project:read', (_e, file) => ({ text: readProject(projectPath(file)) }));
  ipcMain.handle('project:open', async () => {
    const r = await dialog.showOpenDialog(win(), { title: 'Open project', defaultPath: documents(), properties: ['openFile'], filters });
    if (r.canceled || !r.filePaths[0]) return null;
    const file = projectPath(r.filePaths[0]);
    return { path: file, text: readProject(file) };
  });
  // Which of these remembered media paths still hold a file (and how big): the page uses it to know what it can open again by itself.
  ipcMain.handle('media:stat', (_e, list) => {
    const out = {};
    for (const p of Array.isArray(list) ? list.slice(0, 500) : []) {
      const f = mediaPath(p);
      if (f) out[p] = fs.statSync(f).size;
    }
    return out;
  });
}

module.exports = { setupProjectFiles, projectPath, mediaPath, writeAtomic, readProject, MEDIA_EXT };
