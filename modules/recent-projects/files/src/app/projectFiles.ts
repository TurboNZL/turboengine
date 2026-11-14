import { projectFileName } from '../core/projectFile.ts';
import { pickFiles, platform, saveFile } from './platform.ts';

/**
 * Where a project lives. A project is a `.turbocut` file the person chose a place for; TurboCut keeps a reference to that file (never a copy
 * of the edit in its own storage), so Save writes back to it and the recent list opens it from there.
 *  - desktop app: a path on the computer (a real save dialog; the shell does the reading and writing);
 *  - a browser with the File System Access API: a file handle (the browser asks again for permission now and then);
 *  - Android: a file under Documents/TurboCut;
 *  - any other browser: no reference is possible, so Save downloads a copy each time.
 */
export type ProjectRef = { kind: 'path'; path: string } | { kind: 'handle'; handle: FileSystemFileHandle };

export interface OpenedProject {
  name: string;
  text: string;
  ref: ProjectRef | null;
}

interface DesktopApi {
  saveAs(defaultName: string, text: string): Promise<{ path: string } | null>;
  write(path: string, text: string): Promise<void>;
  read(path: string): Promise<{ text: string }>;
  open(): Promise<{ path: string; text: string } | null>;
}

const desktop = (): DesktopApi | undefined => (globalThis as any).turbocut?.project;
const FOLDER = 'TurboCut';
const TYPES = [{ description: 'TurboCut project', accept: { 'application/json': ['.turbocut'] } }];

/** The last part of a path, whichever separator it uses. */
export const baseName = (path: string): string => path.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || path;

export const refName = (ref: ProjectRef): string => (ref.kind === 'handle' ? ref.handle.name : baseName(ref.path));

/** A short line for the recent list: where the file is. Browsers do not reveal folders, so a handle shows its file name only. */
export const refWhere = (ref: ProjectRef): string => (ref.kind === 'handle' ? ref.handle.name : platform === 'android' ? `Documents/${ref.path}` : ref.path);

const fsa = (): { save?: (o: object) => Promise<FileSystemFileHandle>; open?: (o: object) => Promise<FileSystemFileHandle[]> } => ({
  save: (window as any).showSaveFilePicker?.bind(window),
  open: (window as any).showOpenFilePicker?.bind(window),
});

/** Whether Save can write back to the same place next time. False in browsers without file handles: they download a copy instead. */
export const canKeepFile = (): boolean => !!desktop() || platform === 'android' || !!fsa().save;

const aborted = (e: unknown): boolean => e instanceof DOMException && e.name === 'AbortError';

async function androidFs() {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
  return { Filesystem, Directory, Encoding };
}

/** Ask where to save, and save there. Resolves null when the person cancels. `ref` is null where the browser cannot keep one (the file was downloaded). */
export async function saveAs(projectName: string, text: string): Promise<{ ref: ProjectRef | null; name: string } | null> {
  const name = projectFileName(projectName);
  const d = desktop();
  if (d) {
    const r = await d.saveAs(name, text);
    return r ? { ref: { kind: 'path', path: r.path }, name: baseName(r.path) } : null;
  }
  if (platform === 'android') {
    try {
      const { Filesystem, Directory, Encoding } = await androidFs();
      await Filesystem.mkdir({ path: FOLDER, directory: Directory.Documents, recursive: true }).catch(() => {});
      // A second project with the same name must not overwrite the first.
      let path = `${FOLDER}/${name}`;
      for (let i = 2; await Filesystem.stat({ path, directory: Directory.Documents }).then(() => true, () => false); i++) path = `${FOLDER}/${name.replace(/\.turbocut$/, '')} ${i}.turbocut`;
      await Filesystem.writeFile({ path, data: text, directory: Directory.Documents, encoding: Encoding.UTF8 });
      return { ref: { kind: 'path', path }, name: baseName(path) };
    } catch {
      await saveFile(text, name, 'application/json'); // storage not allowed: hand it to the share sheet instead
      return { ref: null, name };
    }
  }
  const pick = fsa().save;
  if (pick) {
    try {
      const handle = await pick({ suggestedName: name, types: TYPES });
      await write(handle, text);
      return { ref: { kind: 'handle', handle }, name: handle.name };
    } catch (e) {
      if (aborted(e)) return null;
      throw e;
    }
  }
  await saveFile(text, name, 'application/json');
  return { ref: null, name };
}

async function write(handle: FileSystemFileHandle, text: string): Promise<void> {
  const w = await handle.createWritable();
  try {
    await w.write(text);
  } finally {
    await w.close();
  }
}

/** Whether a file can be written without asking the person (a browser handle needs its permission to still be granted). */
export async function canWriteQuietly(ref: ProjectRef): Promise<boolean> {
  if (ref.kind === 'path') return true;
  try {
    return (await (ref.handle as any).queryPermission({ mode: 'readwrite' })) === 'granted';
  } catch {
    return false;
  }
}

/** Write the project back to where it lives. Throws a sentence when the file cannot be written (moved, read-only, permission withdrawn). */
export async function writeRef(ref: ProjectRef, text: string): Promise<void> {
  if (ref.kind === 'handle') {
    if ((await (ref.handle as any).requestPermission?.({ mode: 'readwrite' })) === 'denied') throw new Error('The browser did not allow writing to that file.');
    return write(ref.handle, text);
  }
  const d = desktop();
  if (d) return d.write(ref.path, text);
  const { Filesystem, Directory, Encoding } = await androidFs();
  await Filesystem.writeFile({ path: ref.path, data: text, directory: Directory.Documents, encoding: Encoding.UTF8 });
}

export async function readRef(ref: ProjectRef): Promise<OpenedProject> {
  if (ref.kind === 'handle') {
    if ((await (ref.handle as any).requestPermission?.({ mode: 'read' })) === 'denied') throw new Error('The browser did not allow reading that file.');
    return { name: ref.handle.name, text: await (await ref.handle.getFile()).text(), ref };
  }
  const d = desktop();
  if (d) return { name: baseName(ref.path), text: (await d.read(ref.path)).text, ref };
  const { Filesystem, Directory, Encoding } = await androidFs();
  const r = await Filesystem.readFile({ path: ref.path, directory: Directory.Documents, encoding: Encoding.UTF8 });
  return { name: baseName(ref.path), text: typeof r.data === 'string' ? r.data : await r.data.text(), ref };
}

/** Ask for a project file and read it. Resolves null when the person cancels. */
export async function openDialog(): Promise<OpenedProject | null> {
  const d = desktop();
  if (d) {
    const r = await d.open();
    return r ? { name: baseName(r.path), text: r.text, ref: { kind: 'path', path: r.path } } : null;
  }
  const pick = fsa().open;
  if (pick) {
    try {
      const [handle] = await pick({ types: TYPES, multiple: false });
      if (!handle) return null;
      return { name: handle.name, text: await (await handle.getFile()).text(), ref: { kind: 'handle', handle } };
    } catch (e) {
      if (aborted(e)) return null;
      throw e;
    }
  }
  const f = (await pickFiles('.turbocut,.json,application/json'))[0];
  return f ? { name: f.name, text: await f.text(), ref: null } : null;
}
