/**
 * A tiny EventSource that sends headers (the browser's cannot). Only what Connect uses: named events, onopen, onerror, close.
 * Needed when the server sits behind Cloudflare Access and this page is on another origin, so the service token must be a header.
 * After an error it stays CLOSED (readyState 2) and the caller starts over, which is what Connect already does.
 */
export interface EventSourceLike {
  onopen: (() => void) | null;
  onerror: (() => void) | null;
  readonly readyState: number;
  addEventListener(type: string, fn: (e: MessageEvent) => void): void;
  close(): void;
}

/** Split an SSE text buffer into complete events; returns the rest. Pure. */
export function parseSse(buffer: string): { events: { type: string; data: string }[]; rest: string } {
  const parts = buffer.replace(/\r\n/g, '\n').split('\n\n');
  const rest = parts.pop() ?? '';
  const events: { type: string; data: string }[] = [];
  for (const block of parts) {
    let type = 'message';
    const data: string[] = [];
    for (const line of block.split('\n')) {
      if (line.startsWith(':')) continue;
      if (line.startsWith('event:')) type = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
    }
    if (data.length) events.push({ type, data: data.join('\n') });
  }
  return { events, rest };
}

export class HeaderEventSource implements EventSourceLike {
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readyState = 0;
  private listeners = new Map<string, ((e: MessageEvent) => void)[]>();
  private ctl = new AbortController();

  constructor(url: string, headers: Record<string, string>) { void this.run(url, headers); }

  addEventListener(type: string, fn: (e: MessageEvent) => void) { this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn]); }
  close() { this.readyState = 2; this.ctl.abort(); }

  private async run(url: string, headers: Record<string, string>) {
    try {
      const res = await fetch(url, { headers: { ...headers, Accept: 'text/event-stream' }, signal: this.ctl.signal });
      if (!res.ok || !res.body) throw new Error(String(res.status));
      this.readyState = 1; this.onopen?.();
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const { events, rest } = parseSse(buf);
        buf = rest;
        for (const ev of events) for (const fn of this.listeners.get(ev.type) ?? []) fn(new MessageEvent(ev.type, { data: ev.data }));
      }
    } catch { /* closed or failed: reported below */ }
    if (this.readyState !== 2) { this.readyState = 2; this.onerror?.(); }
  }
}
