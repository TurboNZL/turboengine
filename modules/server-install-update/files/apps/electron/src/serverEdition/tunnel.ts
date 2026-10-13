import { spawn, type ChildProcess } from 'node:child_process';
import { join } from 'node:path';

/** What cloudflared prints that matters to a person. Pure, so it is tested. */
export type TunnelState = { status: 'off' | 'starting' | 'connected' | 'error'; message: string };

export function parseTunnelLine(line: string): Partial<TunnelState> | null {
  if (/Registered tunnel connection/i.test(line)) return { status: 'connected', message: 'Connected to Cloudflare.' };
  if (/Unauthorized|invalid (tunnel )?token|failed to unmarshal tunnel token|Provided Tunnel token is not valid/i.test(line)) return { status: 'error', message: 'Cloudflare did not accept the tunnel token. Copy it again from the tunnel page.' };
  if (/no such host|network is unreachable|failed to dial|connection refused/i.test(line) && /ERR|error/i.test(line)) return { status: 'starting', message: 'Cannot reach Cloudflare yet. Retrying…' };
  return null;
}

/** Keeps `cloudflared tunnel run --token …` running (restarted if it dies), and reports what it says. */
export class Tunnel {
  state: TunnelState = { status: 'off', message: 'Not set up.' };
  private child: ChildProcess | null = null;
  private wanted = false;
  private retry: ReturnType<typeof setTimeout> | undefined;
  constructor(private readonly toolsDir: string, private readonly onState: (s: TunnelState) => void = () => {}) {}

  private set(s: Partial<TunnelState>) { this.state = { ...this.state, ...s }; this.onState(this.state); }

  start(token: string, exists: () => boolean) {
    this.stop();
    if (!token.trim()) return;
    if (!exists()) { this.set({ status: 'error', message: 'cloudflared has not been downloaded yet.' }); return; }
    this.wanted = true;
    this.set({ status: 'starting', message: 'Starting the tunnel…' });
    // the token is passed as an argument as cloudflared documents; it is never logged here
    const child = spawn(join(this.toolsDir, 'cloudflared.exe'), ['tunnel', '--no-autoupdate', 'run', '--token', token.trim()], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    this.child = child;
    const onData = (d: Buffer) => { for (const line of String(d).split(/\r?\n/)) { const s = parseTunnelLine(line); if (s) this.set(s); } };
    child.stdout?.on('data', onData); child.stderr?.on('data', onData);
    child.on('error', (e) => this.set({ status: 'error', message: `Could not start cloudflared: ${e.message}` }));
    child.on('exit', () => {
      this.child = null;
      if (!this.wanted) return;
      if (this.state.status !== 'error') this.set({ status: 'starting', message: 'The tunnel stopped. Starting it again…' });
      this.retry = setTimeout(() => this.start(token, exists), 8000);
    });
  }

  stop() {
    this.wanted = false; clearTimeout(this.retry);
    this.child?.kill(); this.child = null;
    this.set({ status: 'off', message: 'Not running.' });
  }
}
