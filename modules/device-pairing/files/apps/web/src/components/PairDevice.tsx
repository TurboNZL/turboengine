import { useState } from 'react';
import { Smartphone } from 'lucide-react';
import { type PairCodec, type PairPayload } from '../lib/pairCode.ts';

/**
 * "Pair a device": make a code (or link) from this device's connection for another device, and/or enter a code made on another device. Generalised from
 * TurboMusic's `PairDevice` (components/ServerHealthCard.tsx). Uses only the hook classes (.btn .btn-accent .input), so it takes the app's look.
 *
 *  - `getToken`: the access token to put in the code. TurboMusic hands over the token typed in Settings; an app that makes tokens on demand (TurboKeep:
 *    `api.createToken`) makes a new one here, so every paired device can be revoked on its own.
 *  - `access`: this device's Cloudflare Access service token (included only when both parts are set). `askAccess` also shows two fields to type it
 *    in (for an app whose Settings has no such fields): a web page on the server's own address needs none, but the device being paired may.
 *  - `onUse`: applies a code entered here; leave it out to show only the "make a code" half (a device that is paired from outside, like an Android app).
 * Build the code from what is typed, not from what was saved (the service-token fields only save with a Save button).
 */
export function PairDevice({ codec, appName, defaultAddress, getToken, access, askAccess, onUse, label = 'Pair a device', addressPlaceholder = 'https://app.example.com', afterMake }: {
  codec: PairCodec; appName: string; defaultAddress: string; getToken: () => string | Promise<string>; access?: { id: string; secret: string }; askAccess?: boolean;
  onUse?: (p: PairPayload) => void; label?: string; addressPlaceholder?: string;
  /** a line shown under a made code (where to paste it) */ afterMake?: string;
}) {
  const [open, setOpen] = useState(false);
  const [addr, setAddr] = useState(defaultAddress);
  const [cfId, setCfId] = useState('');
  const [cfSecret, setCfSecret] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [entered, setEntered] = useState('');
  const say = (m: string) => { setNote(m); setTimeout(() => setNote(null), 6000); };

  const id = (askAccess ? cfId : access?.id)?.trim() ?? '', secret = (askAccess ? cfSecret : access?.secret)?.trim() ?? '';
  const hasAccess = !!(id && secret);
  const make = async () => {
    setBusy(true);
    try { setCode(codec.encode({ url: addr.trim(), token: await getToken(), access: hasAccess ? { id, secret } : undefined })); }
    catch (e) { say((e as Error).message || 'Could not make a code.'); } finally { setBusy(false); }
  };
  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); say(`${what} copied.`); } catch { say('Your browser blocked copying here (it needs https or localhost). Select it by hand instead.'); }
  };
  const use = () => {
    const p = codec.decode(entered);
    if (!p) { say(`That is not a pairing code. It starts with ${codec.prefix}`); return; }
    if (!confirm(`Connect this device to ${p.url || 'this address'}?`)) return;
    onUse?.(p); setEntered(''); say('Connected.');
  };

  return (
    <div className="space-y-2 text-sm">
      <button type="button" className="btn" aria-expanded={open} onClick={() => setOpen((o) => !o)}><Smartphone size={15} />{label}</button>
      {open && (
        <div className="space-y-4 rounded-theme border border-line p-3">
          <div className="space-y-2">
            <div className="font-medium">Send this connection to another device</div>
            <label className="block space-y-1">Address the other device should use<input className="input" placeholder={addressPlaceholder} value={addr} onChange={(e) => { setAddr(e.target.value); setCode(''); }} /></label>
            <p className="text-xs text-muted">Use the address that works from where that device will be (the tunnel address for a phone on mobile data, not a home-network one).</p>
            {askAccess && <div className="space-y-1">
              <div className="text-xs text-muted">Only if the server is behind Cloudflare Access: its service token (Zero Trust &gt; Access &gt; Service Auth).</div>
              <input className="input" aria-label="Cloudflare Access client ID" placeholder="Client ID (optional)" value={cfId} onChange={(e) => { setCfId(e.target.value); setCode(''); }} autoComplete="off" />
              <input className="input" aria-label="Cloudflare Access client secret" type="password" placeholder="Client secret (optional)" value={cfSecret} onChange={(e) => { setCfSecret(e.target.value); setCode(''); }} autoComplete="off" /></div>}
            <p className="text-xs text-muted">The code holds: the address above, an access token{hasAccess ? ' and the Cloudflare Access service token (client ID and secret)' : ''}. {hasAccess ? '' : 'No Cloudflare Access service token is set, so none is included.'}</p>
            <button type="button" className="btn btn-accent" disabled={busy} onClick={() => void make()}>Make a code</button>
            {code && <div className="space-y-2">
              <textarea readOnly className="input font-mono text-xs" rows={3} aria-label="Pairing code" value={code} onFocus={(e) => e.currentTarget.select()} />
              <div className="flex flex-wrap gap-2"><button type="button" className="btn" onClick={() => void copy(code, 'Code')}>Copy code</button>
                {addr.trim() && <button type="button" className="btn" onClick={() => void copy(codec.link(addr.trim(), code), 'Link')}>Copy link</button>}</div>
              {afterMake && <p className="text-xs text-muted">{afterMake}</p>}
              <p className="text-xs text-warn">The code contains an access token: whoever has it can read and change your {appName} data. Send it only to yourself, and revoke the token if it leaks.</p>
            </div>}
          </div>
          {onUse && <div className="space-y-2 border-t border-line pt-3">
            <div className="font-medium">Use a code from another device</div>
            <div className="flex gap-2"><input className="input font-mono" aria-label="Pairing code to use" placeholder={`${codec.prefix}…`} value={entered} onChange={(e) => setEntered(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && use()} /><button type="button" className="btn shrink-0" disabled={!entered.trim()} onClick={use}>Connect</button></div>
          </div>}
        </div>)}
      {note && <div className="text-muted" role="status">{note}</div>}
    </div>
  );
}
