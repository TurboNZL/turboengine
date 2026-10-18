// Finding other TurboCut apps on the same network and sending a project to one.
//
//  Finding: every app that has sharing on announces itself in a small UDP broadcast every few seconds on the share port and listens
//  for the others. The list expires on its own (10 s without an announcement).
//  Sending: the sender asks first (POST /offer: who, what, how big). The receiving app shows that to its person, and only when they
//  press Accept does it hand out a one-time transfer id. The project, each media file and each font then arrive as separate
//  PUT /part/<transfer>/<kind> requests, streamed to a folder of their own, and POST /done/<transfer> closes it. Nothing is written
//  before Accept, only addresses on the local network are answered, and every transfer is capped at the size that was offered.
//  The port (47903, see the engine's docs/PORTS.md) is used for both TCP and UDP; TURBOCUT_SHARE_PORT changes it.
const crypto = require('node:crypto');
const dgram = require('node:dgram');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');

const DEFAULT_PORT = 47903;
const ANNOUNCE_MS = 3000;
const EXPIRE_MS = 10_000;
const OFFER_WAIT_MS = 60_000;
const KINDS = new Set(['project', 'preset', 'media', 'font']);
const MAX_JSON = 64 * 1024;

/** Addresses that mean "on this network": loopback, link-local and the private ranges. */
function isLocalAddress(ip) {
  const a = String(ip || '').replace(/^::ffff:/, '');
  if (a === '::1' || a.startsWith('fe80:') || /^f[cd][0-9a-f]{2}:/i.test(a)) return true;
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(a);
  if (!m) return false;
  const [x, y] = [Number(m[1]), Number(m[2])];
  return x === 10 || x === 127 || (x === 192 && y === 168) || (x === 172 && y >= 16 && y <= 31) || (x === 169 && y === 254);
}

/** A file name that cannot leave its folder: no path, no odd characters, never empty. */
function safeName(name, fallback = 'file') {
  const base = path.basename(String(name || '')).replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').replace(/^\.+/, '').slice(0, 120);
  return base || fallback;
}

/** The broadcast addresses of this machine's IPv4 networks, plus the global one. */
function broadcastAddresses(interfaces = os.networkInterfaces()) {
  const out = new Set(['255.255.255.255']);
  for (const list of Object.values(interfaces)) {
    for (const i of list || []) {
      if (i.family !== 'IPv4' || i.internal || !i.netmask) continue;
      const ip = i.address.split('.').map(Number);
      const mask = i.netmask.split('.').map(Number);
      out.add(ip.map((b, k) => (b | (~mask[k] & 255)) & 255).join('.'));
    }
  }
  return [...out];
}

const readJson = (req, limit = MAX_JSON) =>
  new Promise((resolve, reject) => {
    let size = 0;
    const parts = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('too large'));
        req.destroy();
      } else parts.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(parts).toString('utf8')));
      } catch {
        reject(new Error('not JSON'));
      }
    });
    req.on('error', reject);
  });

class Share extends EventEmitter {
  /**
   * @param {{ dir: string, name: string, version: string, platform?: string, port?: number, id?: string }} o
   * `dir`: where received projects are kept. Events: `devices` (the list changed), `offer` ({ offerId, from, summary }, then call `answer`),
   * `received` ({ transfer, from, dir, project, preset, media, fonts }).
   */
  constructor(o) {
    super();
    this.dir = o.dir;
    this.name = o.name;
    this.version = o.version;
    this.platform = o.platform || process.platform;
    this.port = o.port ?? (Number(process.env.TURBOCUT_SHARE_PORT) || DEFAULT_PORT);
    this.id = o.id || crypto.randomUUID();
    this.peers = new Map();
    this.pending = new Map(); // offers waiting for the person
    this.transfers = new Map(); // accepted, uploading
    this.server = null;
    this.udp = null;
    this.timers = [];
  }

  async start() {
    if (this.server) return;
    fs.mkdirSync(this.dir, { recursive: true });
    this.sweepOld();
    this.server = http.createServer((req, res) => this.handle(req, res));
    await new Promise((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(this.port, '0.0.0.0', resolve);
    });
    this.port = this.server.address().port;
    try {
      await this.startDiscovery();
    } catch {
      /* no UDP (blocked): this device can still receive from an address typed in, just not be found */
    }
  }

  async startDiscovery() {
    const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    this.udp = sock;
    sock.on('message', (msg, rinfo) => this.hear(msg, rinfo.address));
    sock.on('error', () => {});
    await new Promise((resolve, reject) => {
      sock.once('error', reject);
      sock.bind(this.discoveryPort(), () => {
        sock.setBroadcast(true);
        resolve();
      });
    });
    const tick = () => {
      this.announce();
      this.expire();
    };
    tick();
    this.timers.push(setInterval(tick, ANNOUNCE_MS));
  }

  discoveryPort() {
    return Number(process.env.TURBOCUT_SHARE_PORT) || DEFAULT_PORT;
  }

  announce() {
    if (!this.udp) return;
    const msg = Buffer.from(JSON.stringify({ app: 'turbocut', v: 1, id: this.id, name: this.name, port: this.port, version: this.version, platform: this.platform }));
    for (const to of broadcastAddresses()) this.udp.send(msg, this.discoveryPort(), to, () => {});
  }

  /** An announcement arrived. Exposed so it can be tested without a network. */
  hear(msg, address) {
    let m;
    try {
      m = JSON.parse(msg.toString('utf8'));
    } catch {
      return;
    }
    if (m?.app !== 'turbocut' || m.id === this.id || typeof m.id !== 'string' || !Number.isInteger(m.port) || !isLocalAddress(address)) return;
    const known = this.peers.get(m.id);
    const next = { id: m.id, name: String(m.name || 'TurboCut').slice(0, 60), ip: String(address).replace(/^::ffff:/, ''), port: m.port, version: String(m.version || ''), platform: String(m.platform || ''), seen: Date.now() };
    this.peers.set(m.id, next);
    if (!known || known.name !== next.name || known.ip !== next.ip || known.port !== next.port) this.emit('devices', this.devices());
  }

  expire(now = Date.now()) {
    let changed = false;
    for (const [id, p] of this.peers) if (now - p.seen > EXPIRE_MS) (this.peers.delete(id), (changed = true));
    if (changed) this.emit('devices', this.devices());
  }

  devices() {
    return [...this.peers.values()].map(({ id, name, ip, port, version, platform }) => ({ id, name, ip, port, version, platform })).sort((a, b) => a.name.localeCompare(b.name));
  }

  stop() {
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
    try {
      this.udp?.close();
    } catch {
      /* already closed */
    }
    this.udp = null;
    this.server?.close();
    this.server = null;
    this.peers.clear();
    for (const [id, p] of this.pending) (clearTimeout(p.timer), p.resolve(false), this.pending.delete(id));
  }

  /** Delete received projects older than a day. */
  sweepOld(now = Date.now()) {
    try {
      for (const d of fs.readdirSync(this.dir)) {
        const p = path.join(this.dir, d);
        if (now - fs.statSync(p).mtimeMs > 24 * 3600_000) fs.rmSync(p, { recursive: true, force: true });
      }
    } catch {
      /* nothing to sweep */
    }
  }

  /** The person's answer to an offer. */
  answer(offerId, accept) {
    const p = this.pending.get(offerId);
    if (!p) return;
    clearTimeout(p.timer);
    this.pending.delete(offerId);
    p.resolve(accept === true);
  }

  // ---------------------------------------------------------------- receiving
  async handle(req, res) {
    const reply = (code, body) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    try {
      if (!isLocalAddress(req.socket.remoteAddress)) return reply(403, { error: 'local network only' });
      const url = new URL(req.url, 'http://x');
      const parts = url.pathname.split('/').filter(Boolean);
      if (req.method === 'GET' && parts[0] === 'hello') return reply(200, { app: 'turbocut', id: this.id, name: this.name, version: this.version });
      if (req.method === 'POST' && parts[0] === 'offer') return await this.onOffer(req, reply);
      if (req.method === 'PUT' && parts[0] === 'part' && parts.length === 3) return await this.onPart(req, reply, parts[1], parts[2], url.searchParams.get('name'));
      if (req.method === 'POST' && parts[0] === 'done' && parts.length === 2) return await this.onDone(reply, parts[1]);
      reply(404, { error: 'not found' });
    } catch (e) {
      reply(400, { error: e instanceof Error ? e.message : 'bad request' });
    }
  }

  async onOffer(req, reply) {
    const o = await readJson(req);
    const bytes = Number(o.bytes);
    if (!Number.isFinite(bytes) || bytes < 0 || bytes > 64 * 1024 ** 3) return reply(400, { error: 'bad size' });
    const offerId = crypto.randomUUID();
    const from = { id: String(o.from?.id || ''), name: String(o.from?.name || 'Another TurboCut').slice(0, 60) };
    const summary = { project: String(o.project || 'Untitled').slice(0, 80), media: Math.max(0, Number(o.media) | 0), fonts: Math.max(0, Number(o.fonts) | 0), bytes };
    const accepted = await new Promise((resolve) => {
      const timer = setTimeout(() => (this.pending.delete(offerId), resolve(false)), OFFER_WAIT_MS);
      this.pending.set(offerId, { resolve, timer });
      if (this.listenerCount('offer') === 0) return this.answer(offerId, false);
      this.emit('offer', { offerId, from, summary });
    });
    if (!accepted) return reply(200, { accepted: false });
    const transfer = crypto.randomBytes(16).toString('hex');
    const dir = path.join(this.dir, transfer);
    fs.mkdirSync(dir, { recursive: true });
    this.transfers.set(transfer, { dir, from, summary, cap: bytes + 1024 * 1024, got: 0, files: [], n: 0 });
    reply(200, { accepted: true, transfer });
  }

  onPart(req, reply, transfer, kind, name) {
    const t = this.transfers.get(transfer);
    if (!t || !KINDS.has(kind)) return reply(404, { error: 'no such transfer' });
    const file = `${String(t.n++).padStart(3, '0')}-${kind}-${safeName(name, kind)}`;
    const out = fs.createWriteStream(path.join(t.dir, file));
    let failed = false;
    return new Promise((resolve) => {
      req.on('data', (c) => {
        t.got += c.length;
        if (t.got > t.cap && !failed) {
          failed = true;
          out.destroy();
          reply(413, { error: 'more than was offered' });
          req.destroy();
        }
      });
      req.pipe(out);
      out.on('finish', () => {
        if (!failed) {
          t.files.push({ kind, name: safeName(name, kind), file });
          reply(200, { ok: true });
        }
        resolve();
      });
      out.on('error', () => {
        if (!failed) reply(500, { error: 'could not write' });
        resolve();
      });
      req.on('error', () => resolve());
    });
  }

  onDone(reply, transfer) {
    const t = this.transfers.get(transfer);
    if (!t) return reply(404, { error: 'no such transfer' });
    this.transfers.delete(transfer);
    const project = t.files.find((f) => f.kind === 'project');
    if (!project) return reply(400, { error: 'the project itself did not arrive' });
    const by = (k) => t.files.filter((f) => f.kind === k).map((f) => ({ name: f.name, file: f.file, path: path.join(t.dir, f.file) }));
    this.emit('received', { transfer, from: t.from, dir: t.dir, project: fs.readFileSync(path.join(t.dir, project.file), 'utf8'), preset: by('preset')[0] ? fs.readFileSync(by('preset')[0].path, 'utf8') : null, media: by('media'), fonts: by('font') });
    reply(200, { ok: true });
  }

  // ---------------------------------------------------------------- sending
  /** Ask a device to take a project. Resolves with what the parts must be sent to. Throws a sentence for the person. */
  async offer(deviceId, summary) {
    const dev = this.peers.get(deviceId);
    if (!dev) throw new Error('That device is no longer on the network.');
    const body = JSON.stringify({ from: { id: this.id, name: this.name }, project: summary.project, media: summary.media, fonts: summary.fonts, bytes: summary.bytes });
    const r = await this.request(dev, 'POST', '/offer', body, OFFER_WAIT_MS + 5000);
    if (!r.accepted) throw new Error(`${dev.name} did not accept it.`);
    return { dev, transfer: r.transfer };
  }

  /** Start one part. Returns `{ write(chunk): Promise, end(): Promise }`; the other side stores what is written. */
  openPart(dev, transfer, kind, name) {
    const req = http.request({ host: dev.ip, port: dev.port, method: 'PUT', path: `/part/${transfer}/${kind}?name=${encodeURIComponent(name)}`, headers: { 'Content-Type': 'application/octet-stream', 'Transfer-Encoding': 'chunked' } });
    const done = new Promise((resolve, reject) => {
      req.on('response', (res) => {
        res.resume();
        res.on('end', () => (res.statusCode === 200 ? resolve() : reject(new Error(res.statusCode === 413 ? 'The other device received more than it was told to expect.' : `The other device refused a part (${res.statusCode}).`))));
      });
      req.on('error', () => reject(new Error('Lost the connection to the other device.')));
    });
    done.catch(() => {});
    return {
      write: (chunk) => new Promise((resolve, reject) => req.write(chunk, (e) => (e ? reject(e) : resolve()))),
      end: () => (req.end(), done),
      abort: () => req.destroy(),
    };
  }

  async finish(dev, transfer) {
    const r = await this.request(dev, 'POST', `/done/${transfer}`, '{}', 30_000);
    if (!r.ok) throw new Error('The other device could not finish opening it.');
  }

  request(dev, method, p, body, timeout) {
    return new Promise((resolve, reject) => {
      const req = http.request({ host: dev.ip, port: dev.port, method, path: p, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, timeout }, (res) => {
        const parts = [];
        res.on('data', (c) => parts.push(c));
        res.on('end', () => {
          try {
            const j = JSON.parse(Buffer.concat(parts).toString('utf8'));
            if (res.statusCode >= 400) reject(new Error(j.error || `The other device answered ${res.statusCode}.`));
            else resolve(j);
          } catch {
            reject(new Error('The other device sent something unexpected.'));
          }
        });
      });
      req.on('timeout', () => (req.destroy(), reject(new Error('The other device did not answer.'))));
      req.on('error', () => reject(new Error('Could not reach the other device.')));
      req.end(body);
    });
  }
}

module.exports = { Share, isLocalAddress, safeName, broadcastAddresses, DEFAULT_PORT };
