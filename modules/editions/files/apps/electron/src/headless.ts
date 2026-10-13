import { networkInterfaces, homedir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from '../../../packages/server/src/config.ts';
import { startServer } from '../../../packages/server/src/start.ts';

/**
 * The server edition without a window or a tray: the same library server the Raspberry Pi runs, packaged with its own runtime (the Electron
 * binary acting as plain Node, so nothing has to be installed first). It is what the Linux server .deb (a systemd service) and the Linux
 * server AppImage run. Settings come from the environment (CURATOR_DATA_DIR, CURATOR_PORT, CURATOR_HOST, CURATOR_TOKEN, ...) or from flags.
 */
export interface HeadlessArgs { dataDir?: string; port?: string; host?: string; help: boolean }

/** `--data-dir X`, `--data-dir=X`, `--port`, `--host`, `--help`; anything else (the AppImage adds --no-sandbox, for one) is ignored. */
export function parseHeadlessArgs(argv: string[]): HeadlessArgs {
  const out: HeadlessArgs = { help: false };
  const keys = { '--data-dir': 'dataDir', '--port': 'port', '--host': 'host' } as const;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--help' || a === '-h') { out.help = true; continue; }
    const eq = a.indexOf('=');
    const name = (eq === -1 ? a : a.slice(0, eq)) as keyof typeof keys;
    if (!(name in keys)) continue;
    const value = eq === -1 ? argv[++i] : a.slice(eq + 1);
    if (value) out[keys[name]] = value;
  }
  return out;
}

export const HELP = `Music Curator Server (headless)
  --data-dir DIR   where the library lives (default: $CURATOR_DATA_DIR, else ~/music-curator-data)
  --port N         default 47813
  --host ADDR      default 0.0.0.0 (all network interfaces)
The access token is printed at start and kept in DIR/token.`;

/** Flags beat the environment, which beats the defaults. */
export function headlessEnv(args: HeadlessArgs, env: NodeJS.ProcessEnv, home = homedir()): NodeJS.ProcessEnv {
  return {
    ...env,
    CURATOR_DATA_DIR: args.dataDir ?? env.CURATOR_DATA_DIR ?? join(home, 'music-curator-data'),
    ...(args.port ? { CURATOR_PORT: args.port } : {}),
    ...(args.host ? { CURATOR_HOST: args.host } : {}),
  };
}

async function main() {
  const args = parseHeadlessArgs(process.argv.slice(2));
  if (args.help) { console.log(HELP); return; }
  const config = loadConfig(headlessEnv(args, process.env));
  process.env.TMPDIR ??= join(config.dataDir, 'tmp');
  const running = await startServer(config);
  const ips = Object.values(networkInterfaces()).flat().filter((i) => i && i.family === 'IPv4' && !i.internal).map((i) => i!.address);
  console.log(`Music Curator server
  data dir : ${config.dataDir}
  listening: ${config.host}:${running.port}
  urls     : ${ips.map((ip) => `http://${ip}:${running.port}`).join(', ') || '(no LAN address found)'}
  token    : ${config.token}   (also stored in ${config.dataDir}/token)`);
  for (const sig of ['SIGINT', 'SIGTERM'] as const) process.on(sig, () => { void running.close().then(() => process.exit(0)); });
}

// only when run as the program, not when a test imports the helpers
if (process.env.VITEST === undefined) main().catch((e) => { console.error(`Music Curator server cannot start: ${(e as Error).message}`); process.exit(1); });
