import { api } from './store.ts';

/**
 * Rank previews inside the Android app. The page's own `<audio>` goes through AccessProxy (a hand-made native proxy) and Chromium
 * does not get a seekable, sized stream from it: the preview waited for most of the file and then started near the END. So the
 * page asks for just the middle of the file itself (two small `Range` fetches, which are fast: the speed test shows ~100 ms) and
 * plays that piece from its first second. MP3 frames find their own start, so a slice from the middle of the file plays fine;
 * other formats keep the normal path.
 */
export const SLICE_BYTES = 768 * 1024; // 19 s of a 320 kbps file, longer for lower rates: always more than the 15 s preview

/** The total size from a `Content-Range: bytes 0-0/12345` header, or null. */
export function totalFromRange(header: string | null | undefined): number | null {
  const m = /\/(\d+)\s*$/.exec(header ?? '');
  const n = m ? Number(m[1]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** The byte range centred on the middle of a file of `total` bytes; null when the file is not much bigger than the slice (use it whole). */
export function sliceWindow(total: number, bytes = SLICE_BYTES): { start: number; end: number } | null {
  if (total <= bytes * 2) return null;
  const start = Math.floor(total / 2 - bytes / 2);
  return { start, end: start + bytes - 1 };
}

const isMp3 = (type: string | null) => /mpeg|mp3/i.test(type ?? '');

/** The middle of an MP3 on the server as a blob, or null when anything about it is unusual (another format, no Range support, an error). */
export async function middleSlice(hash: string): Promise<Blob | null> {
  try {
    const a = api();
    const head = await a.fetchLink(a.fileUrl(hash), { headers: { Range: 'bytes=0-0' } });
    const total = head.status === 206 ? totalFromRange(head.headers.get('Content-Range')) : null;
    void head.body?.cancel();
    if (!total || !isMp3(head.headers.get('Content-Type'))) return null;
    const win = sliceWindow(total);
    if (!win) return null;
    const res = await a.fetchLink(a.fileUrl(hash), { headers: { Range: `bytes=${win.start}-${win.end}` } });
    if (res.status !== 206) return null;
    const buf = await res.arrayBuffer();
    return buf.byteLength > 0 ? new Blob([buf], { type: 'audio/mpeg' }) : null;
  } catch { return null; }
}
