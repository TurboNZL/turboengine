import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export interface UpdateState {
  status: 'idle' | 'running' | 'done' | 'error';
  /** the last lines of the script's output */
  log: string[];
  startedAt: number | null;
  /** the server is about to exit so its service manager starts the new version */
  restarting: boolean;
}

/**
 * "Update server" from the app: runs the checkout's scripts/update.sh in live mode (git pull, install, build the web client; the
 * service is not touched) and then exits so systemd (Restart=on-failure) starts the new server code. Without a service manager the
 * update still happens but the server is not restarted (the app says so).
 */
export class Updater {
  private st: UpdateState = { status: 'idle', log: [], startedAt: null, restarting: false };
  private opts: { script?: string; restart?: boolean; exit?: () => void; exitDelayMs?: number };
  constructor(opts: { script?: string; restart?: boolean; exit?: () => void; exitDelayMs?: number }) { this.opts = opts; }

  get available() { return !!this.opts.script && existsSync(this.opts.script); }
  get restarts() { return !!this.opts.restart; }
  state(): UpdateState { return { ...this.st, log: [...this.st.log] }; }

  /** false when an update is already running */
  start(): boolean {
    if (!this.available || this.st.status === 'running') return false;
    const script = this.opts.script!;
    this.st = { status: 'running', log: [], startedAt: Date.now(), restarting: false };
    const add = (chunk: Buffer) => {
      for (const line of chunk.toString().split(/\r?\n/)) if (line.trim()) this.st.log.push(line);
      if (this.st.log.length > 300) this.st.log.splice(0, this.st.log.length - 300);
    };
    const child = spawn('bash', [script, '--live'], { cwd: resolve(dirname(script), '..'), stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', add);
    child.stderr.on('data', add);
    child.on('error', (e) => { this.st.log.push(`Could not run the update script: ${e.message}`); this.st.status = 'error'; });
    child.on('close', (code) => {
      if (code !== 0) { if (this.st.status !== 'error') this.st.status = 'error'; this.st.log.push(`The update script stopped with code ${code}.`); return; }
      this.st.status = 'done';
      if (this.opts.restart && this.opts.exit) {
        this.st.restarting = true;
        // let the app read the final state first; a non-zero exit makes systemd (Restart=on-failure) start the new code
        setTimeout(this.opts.exit, this.opts.exitDelayMs ?? 4000);
      }
    });
    return true;
  }
}
