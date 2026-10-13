import { createWriteStream, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { join, delimiter } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { spawn } from 'node:child_process';

/**
 * The helper programs the server needs on Windows, downloaded on request into `<data>/tools` (never bundled: they are other people's
 * programs and change often): yt-dlp (downloads from YouTube), ffmpeg (converts to mp3; also reads audio for the quality check), Deno
 * (the JavaScript runtime yt-dlp needs for YouTube) and cloudflared (the optional tunnel). All from the projects' own GitHub releases.
 */
export interface Tool { id: 'ytdlp' | 'ffmpeg' | 'deno' | 'cloudflared'; label: string; why: string; url: string; /** a zip to unpack (else a single .exe) */ zip: boolean; /** files expected afterwards */ files: string[] }

export const TOOLS: Tool[] = [
  { id: 'ytdlp', label: 'yt-dlp', why: 'downloads the audio of YouTube links you add', url: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe', zip: false, files: ['yt-dlp.exe'] },
  { id: 'ffmpeg', label: 'ffmpeg', why: 'turns downloads into mp3 and checks audio quality', url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip', zip: true, files: ['ffmpeg.exe', 'ffprobe.exe'] },
  { id: 'deno', label: 'Deno', why: 'the small JavaScript engine yt-dlp needs to talk to YouTube', url: 'https://github.com/denoland/deno/releases/latest/download/deno-x86_64-pc-windows-msvc.zip', zip: true, files: ['deno.exe'] },
  { id: 'cloudflared', label: 'cloudflared', why: 'opens the Cloudflare tunnel (only if you set one up)', url: 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe', zip: false, files: ['cloudflared.exe'] },
];

export const toolsDir = (dataDir: string) => join(dataDir, 'tools');
export const isInstalled = (dir: string, t: Tool) => t.files.every((f) => existsSync(join(dir, f)));
/** PATH with the tools folder first, so the server finds yt-dlp, ffmpeg and Deno without anyone editing the system PATH. */
export const pathWith = (dir: string, current: string | undefined) => [dir, ...(current ? [current] : [])].join(delimiter);

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((res, rej) => {
    const c = spawn(cmd, args, { windowsHide: true, stdio: 'ignore' });
    c.on('error', rej);
    c.on('exit', (code) => (code === 0 ? res() : rej(new Error(`${cmd} exited with ${code}`))));
  });
}

/** Where ffmpeg's zip puts its programs: bin/ inside one top folder. Everything the tool needs is moved up into the tools folder. */
async function flatten(dir: string, files: string[], from: string) {
  const { readdirSync, statSync } = await import('node:fs');
  const find = (d: string, name: string): string | null => {
    for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) { const r = find(p, name); if (r) return r; } else if (e.toLowerCase() === name) return p; }
    return null;
  };
  for (const f of files) { const p = find(from, f); if (!p) throw new Error(`${f} was not in the download`); renameSync(p, join(dir, f)); }
}

export interface InstallProgress { tool: string; done: number; total: number | null; stage: 'download' | 'unpack' | 'done' }

/** Download one tool into `dir`. Windows ships `tar` (bsdtar), which unpacks zip files, so nothing else is needed. */
export async function installTool(dir: string, t: Tool, onProgress: (p: InstallProgress) => void = () => {}, fetchImpl: typeof fetch = fetch): Promise<void> {
  mkdirSync(dir, { recursive: true });
  const tmp = join(dir, `${t.id}.download`);
  const res = await fetchImpl(t.url, { redirect: 'follow' });
  if (!res.ok || !res.body) throw new Error(`Could not download ${t.label} (${res.status}). Check the internet connection and try again.`);
  const total = Number(res.headers.get('content-length')) || null;
  let done = 0;
  const body = Readable.fromWeb(res.body as never);
  body.on('data', (c: Buffer) => { done += c.length; onProgress({ tool: t.id, done, total, stage: 'download' }); });
  await pipeline(body, createWriteStream(tmp));
  if (t.zip) {
    onProgress({ tool: t.id, done, total, stage: 'unpack' });
    const out = join(dir, `${t.id}.unpacked`);
    rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
    await run('tar', ['-xf', tmp, '-C', out]);
    await flatten(dir, t.files, out);
    rmSync(out, { recursive: true, force: true });
    rmSync(tmp, { force: true });
  } else renameSync(tmp, join(dir, t.files[0]));
  onProgress({ tool: t.id, done, total, stage: 'done' });
}
