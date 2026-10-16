import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Context, MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { type DB, get, run, now } from './db.ts';
import type { Config } from './config.ts';

export const COOKIE = 'turbokeep_session';
export interface AuthUser { id: number; username: string; tokenHash: string; kind: string }

export function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(pw, salt, 64);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}
export function verifyPassword(pw: string, stored: string): boolean {
  const [alg, s, k] = stored.split('$');
  if (alg !== 'scrypt' || !s || !k) return false;
  const want = Buffer.from(k, 'base64');
  const got = scryptSync(pw, Buffer.from(s, 'base64'), want.length);
  return timingSafeEqual(want, got);
}

const sha = (s: string) => createHash('sha256').update(s).digest('hex');

/** Creates a session (browser) or an API token and returns the secret, which is shown once and never stored. */
export function createSession(db: DB, userId: number, kind: 'session' | 'api', name: string, days: number | null): { secret: string; hash: string } {
  const secret = (kind === 'api' ? 'tk_' : '') + randomBytes(32).toString('base64url');
  const hash = sha(secret);
  const expires = days ? new Date(Date.now() + days * 86400_000).toISOString() : null;
  run(db, 'insert into sessions (token_hash, user_id, kind, name, created_at, expires_at) values (?,?,?,?,?,?)', hash, userId, kind, name, now(), expires);
  return { secret, hash };
}

function lookup(db: DB, secret: string): AuthUser | null {
  const h = sha(secret);
  const r = get(db, 'select u.id, u.username, s.kind, s.expires_at from sessions s join users u on u.id = s.user_id where s.token_hash = ?', h);
  if (!r) return null;
  if (r.expires_at && r.expires_at < now()) { run(db, 'delete from sessions where token_hash = ?', h); return null; }
  run(db, 'update sessions set last_used = ? where token_hash = ?', now(), h);
  return { id: r.id, username: r.username, tokenHash: h, kind: r.kind };
}

/**
 * The address the request really came from: behind a Cloudflare tunnel that is CF-Connecting-IP, not the tunnel's own. Otherwise the LAST entry of
 * X-Forwarded-For, the one the nearest proxy added: a client can put anything in front of it (Cloudflare appends to what the client sent).
 * Both headers can be forged by anyone who reaches the port directly, which is why, once a tunnel is in use, TURBOKEEP_BIND=127.0.0.1 should keep the port off the network.
 */
export function clientIp(c: Context, cfg: Config): string {
  if (cfg.trustProxy) {
    const h = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')?.split(',').pop()?.trim();
    if (h) return h;
  }
  const info = (c.env as any)?.incoming?.socket;
  return info?.remoteAddress ?? 'local';
}

export function isHttps(c: Context, cfg: Config): boolean {
  if (cfg.trustProxy && (c.req.header('x-forwarded-proto') ?? '').split(',')[0]?.trim() === 'https') return true;
  return new URL(c.req.url).protocol === 'https:';
}

/**
 * A cookie session can be ridden by another site, so a cookie-authenticated write must come from this site: its Origin has to be the host the
 * request was sent to (the public name behind a tunnel: Host, or X-Forwarded-Host) or one listed in TURBOKEEP_ORIGINS. Bearer tokens are exempt.
 */
function sameSite(c: Context, cfg: Config): boolean {
  // the browser sets Sec-Fetch-Site itself (a page cannot forge it); it stays right even when a proxy or tunnel rewrites the Host header
  const fetchSite = c.req.header('sec-fetch-site');
  if (fetchSite === 'same-origin' || fetchSite === 'none') return true;
  if (fetchSite === 'cross-site') return false;
  const origin = c.req.header('origin');
  if (!origin) return true; // not a browser cross-site request
  let o: URL;
  try { o = new URL(origin); } catch { return false; }
  const hosts = [c.req.header('host'), cfg.trustProxy ? c.req.header('x-forwarded-host')?.split(',')[0]?.trim() : undefined].filter(Boolean);
  return hosts.includes(o.host) || cfg.origins.includes(o.origin);
}

export function requireAuth(db: DB, cfg: Config): MiddlewareHandler<{ Variables: { user: AuthUser } }> {
  return async (c, next) => {
    const bearer = /^Bearer\s+(.+)$/i.exec(c.req.header('authorization') ?? '')?.[1];
    const cookie = getCookie(c, COOKIE);
    const user = (bearer && lookup(db, bearer)) || (!bearer && cookie ? lookup(db, cookie) : null);
    if (!user) return c.json({ error: 'Not signed in' }, 401);
    if (!bearer && !['GET', 'HEAD', 'OPTIONS'].includes(c.req.method) && !sameSite(c, cfg)) return c.json({ error: 'Cross-site request refused' }, 403);
    c.set('user', user);
    await next();
  };
}

/** Failed sign-ins per address: 10 in 10 minutes, then wait. In memory on purpose (a restart clears it). */
export class LoginLimiter {
  private hits = new Map<string, number[]>();
  constructor(private max = 10, private windowMs = 600_000) {}
  blocked(key: string): boolean {
    const t = Date.now();
    const list = (this.hits.get(key) ?? []).filter((x) => t - x < this.windowMs);
    this.hits.set(key, list);
    return list.length >= this.max;
  }
  fail(key: string) { this.hits.set(key, [...(this.hits.get(key) ?? []), Date.now()]); }
  clear(key: string) { this.hits.delete(key); }
}
