import { haptic } from '../lib/haptics.ts';
import { EqualizerCard } from '../components/EqualizerCard.tsx';
import { guessDeviceName } from '../lib/connect.ts';
import { desktop } from '../lib/settings.ts';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { Api, type ServerStatus } from '../lib/api.ts';
import { api, useStore } from '../lib/store.ts';
import { cn, fmtBytes } from '../lib/cn.ts';
import { cacheBytes, removeAudio } from '../lib/files.ts';
import { AliasesManager, DefaultImages, PlaybackRules, ReleaseNamesManager, Vocabulary } from '../components/SettingsExtras.tsx';
import { AppearanceLayout, WallpaperCard } from '../components/AppearanceCard.tsx';
import { Section } from '../components/Section.tsx';
import { TermuxServerCard } from '../components/TermuxServerCard.tsx';
import { SpotifyCard } from '../components/SpotifyCard.tsx';
import { BackupCard } from '../components/BackupCard.tsx';
import { GuidesTab } from '../components/GuidesTab.tsx';
import { ServerUpdateCard } from '../components/ServerUpdate.tsx';
import { ConnectionTokens, PairDevice, ServerHealthCard } from '../components/ServerHealthCard.tsx';
import { AppUpdatesCard, DiscordCard, GraphicsLine } from '../components/AppSettings.tsx';


export function SettingsPage() {
  const { settings, updateSettings, sync, syncNow } = useStore();
  const [url, setUrl] = useState(settings.serverUrl);
  const [token, setToken] = useState(settings.token);
  const [cfId, setCfId] = useState(settings.cfAccessId);
  const [cfSecret, setCfSecret] = useState(settings.cfAccessSecret);
  const [status, setStatus] = useState<ServerStatus | string | null>(null);
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null);
  const [acq, setAcq] = useState<string | null>(null);

  useEffect(() => { void navigator.storage?.estimate?.().then((e) => setUsage({ usage: e.usage ?? 0, quota: e.quota ?? 0 })); }, []);

  async function test() {
    setStatus('Checking…');
    const a = new Api({ serverUrl: url, token, cfAccessId: cfId, cfAccessSecret: cfSecret });
    try { await a.health(); setStatus(await a.status()); }
    catch (e) {
      const m = (e as Error).message;
      setStatus(m === 'Wrong token' ? 'Server found, but the token is wrong.'
        : /^(401|403)$|Server said 40[13]/.test(m) ? 'Cloudflare Access turned the request away: check the service token (and that the Access policy action is Service Auth).'
        : `Cannot reach the server.${cfId ? ' With Cloudflare Access in front, also check the service token and the CORS setting described below.' : ''}`);
    }
  }
  const save = () => { updateSettings({ serverUrl: url.trim(), token: token.trim(), cfAccessId: cfId.trim(), cfAccessSecret: cfSecret.trim() }); };

  const limitBytes = settings.storageLimitMb * 1024 * 1024;
  const audioCache = useStore((s) => s.audioCache);
  const audioBytes = cacheBytes(audioCache);
  const [params, setParams] = useSearchParams();
  const tabs = [{ id: 'look', label: 'Appearance' }, { id: 'server', label: 'Server' }, { id: 'library', label: 'Library' }, { id: 'playback', label: 'Playback & storage' }, { id: 'spotify', label: 'Spotify' }, { id: 'guides', label: 'Guides' }, { id: 'app', label: 'This app' }];
  const tab = tabs.some((t) => t.id === params.get('tab')) ? params.get('tab')! : 'look';

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <h1 className="text-2xl font-bold">Settings</h1>
      <div role="tablist" aria-label="Settings sections" className="flex flex-wrap gap-x-1 border-b border-line pb-px">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} data-selected={tab === t.id || undefined} onClick={() => setParams({ tab: t.id }, { replace: true })}
            className={cn('-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors', tab === t.id ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg')}>{t.label}</button>))}
      </div>

      {tab === 'look' && <>
      <AppearanceLayout />

      <Section title="Wallpaper"><WallpaperCard /></Section>
      </>}

      {tab === 'server' && <>
      <ServerUpdateCard />

      <Section title="Server">
        <p className="text-sm text-muted">Optional. Everything works offline; with a server this device syncs your library, votes and audio. Leave the URL empty if this app is served by the server itself.</p>
        <label className="block space-y-1 text-sm">URL<input className="input" placeholder="http://raspberrypi.local:47813" value={url} onChange={(e) => setUrl(e.target.value)} /></label>
        <label className="block space-y-1 text-sm">Token<input className="input font-mono" type="password" placeholder="contents of <data dir>/token" value={token} onChange={(e) => setToken(e.target.value)} /></label>
        <details className="rounded-theme border border-line p-3 text-sm" open={!!(cfId || cfSecret)}>
          <summary className="cursor-pointer">Cloudflare Access service token{cfId && cfSecret ? ' (set)' : ''}</summary>
          <div className="mt-3 space-y-2">
            <p className="text-xs text-muted">Only if the server is behind Cloudflare Access with a Service Auth policy. Create a service token in Zero Trust (Access › Service credentials), add it to the policy, and paste the two halves here. They are sent as <code>CF-Access-Client-Id</code> and <code>CF-Access-Client-Secret</code> on every request. This is separate from the access token above, which TurboMusic itself checks.</p>
            <label className="block space-y-1">Client ID<input className="input font-mono" autoComplete="off" placeholder="xxxxxxxx.access" value={cfId} onChange={(e) => setCfId(e.target.value)} /></label>
            <label className="block space-y-1">Client secret<input className="input font-mono" type="password" autoComplete="off" value={cfSecret} onChange={(e) => setCfSecret(e.target.value)} /></label>
            <p className="text-xs text-muted">From the web client on the server&apos;s own address nothing else is needed. From another origin (the Android or desktop app) the browser first sends a preflight request that Access must let through: in the Access application&apos;s CORS settings turn on <em>Bypass options requests to origin</em>, and turn the <em>binding cookie</em> off. Live audio from Soloist (beaming) and file downloads cannot carry the headers.</p>
          </div>
        </details>
        <div className="flex flex-wrap items-center gap-2"><button className="btn" onClick={test}>Test connection</button><button className="btn btn-accent" onClick={save}>Save &amp; sync</button>
          <button className="btn btn-ghost" onClick={() => void syncNow()} disabled={sync.state === 'syncing'}><RefreshCw size={15} className={cn(sync.state === 'syncing' && 'animate-spin')} />Sync now</button></div>
        <ConnectionTokens />
        <PairDevice draft={{ token, cfAccessId: cfId, cfAccessSecret: cfSecret }} />
        {status && <div className="rounded-theme bg-raised p-3 text-sm">{typeof status === 'string' ? status : <>Connected · {status.files.count} files ({fmtBytes(status.files.bytes)}) · cursor {status.cursor}
          {status.tools && <div className={status.tools.ytdlp && status.tools.ffmpeg ? 'text-good' : 'text-warn'}>yt-dlp: {status.tools.ytdlp ?? 'NOT FOUND'} · ffmpeg: {status.tools.ffmpeg ?? 'NOT FOUND'} · cookies: {status.tools.cookies ? 'set' : 'not set'}{!(status.tools.ytdlp && status.tools.ffmpeg) && ' — YouTube import and downloads will not work until both are installed on the server.'}</div>}</>}</div>}
        <div className="text-xs text-muted">Status: {sync.state}{sync.error && ` — ${sync.error}`} · {sync.pending} changes waiting · last sync {sync.lastSync ? new Date(sync.lastSync).toLocaleTimeString() : 'never'}</div>
      </Section>

      <ServerHealthCard />

      <Section title="Backup: export and import"><BackupCard /></Section>
      </>}

      {tab === 'library' && <>
      <Section title="Genres and roles"><Vocabulary /></Section>

      <Section title="Release names"><ReleaseNamesManager /></Section>

      <Section title="Artist aliases"><AliasesManager /></Section>

      <Section title="Default images"><p className="text-sm text-muted">Shown for albums and artists that have no image of their own. Synced with your library.</p><DefaultImages /></Section>
      </>}

      {tab === 'spotify' && <SpotifyCard />}

      {tab === 'guides' && <GuidesTab />}

      {tab === 'app' && <>
      <AppUpdatesCard />
      <Section title="This device (Play on a device)">
        <p className="text-sm text-muted">Every device that uses your server appears in the player's device list, so you can play on another device or use this one as its remote. This is the name it shows.</p>
        <label className="block space-y-1 text-sm">Device name<input className="input" placeholder={guessDeviceName()} value={settings.deviceName} onChange={(e) => updateSettings({ deviceName: e.target.value })} /></label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 shrink-0" checked={settings.haptics} onChange={(e) => { updateSettings({ haptics: e.target.checked }); if (e.target.checked) haptic('confirm'); }} /><span>Haptic feedback <span className="text-muted">(a small vibration on presses, sliders and votes; phones only, and the Android app follows the system touch-feedback setting)</span></span></label>
      </Section>
      {desktop() && <Section title="Desktop app">
        {!desktop()!.serverModule
          ? <><p className="text-sm text-muted">The server module is not installed: this app has no library of its own. Enter your server's address and token under Server to see your music; until then it works as a local copy in this window. Install the module to run a server on this computer (a library folder, YouTube downloads, other devices connecting to it).</p>
            {desktop()!.setServerModule && <div><button className="btn btn-accent" onClick={() => void desktop()!.setServerModule!(true)}>Install the server module…</button></div>}</>
          : <>
            <p className="text-sm text-muted">This app runs its own server and keeps your library in a folder. Put it on a big drive: audio you keep offline lives there too. To use your home server instead, fill in its address and token under Server.</p>
            <div className="flex flex-wrap items-center gap-2 text-sm"><code className="rounded-theme bg-raised px-2 py-1">{desktop()!.dataDir}</code>
              <button className="btn" onClick={() => void desktop()!.showLibraryFolder()}>Show folder</button>
              <button className="btn" onClick={() => void desktop()!.chooseLibraryFolder()}>Change folder…</button>
              {desktop()!.setServerModule && <button className="btn btn-ghost" onClick={() => void desktop()!.setServerModule!(false)}>Remove the server module…</button>}</div></>}
        {desktop()!.setCustomFrame && <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 shrink-0" checked={!!desktop()!.customFrame} onChange={(e) => void desktop()!.setCustomFrame!(e.target.checked)} /><span>Window decorations from the theme <span className="text-muted">(draws the title bar, minimise, maximise and close in the current UI style instead of the system's. Off by default; restarts the app.)</span></span></label>}
        <GraphicsLine />
        <p className="text-xs text-muted">Version {desktop()!.version}. {!desktop()!.serverModule ? '' : "Changing the folder restarts the app and starts with an empty library there, unless you copy the old folder's contents over first."}</p>
      </Section>}
      <TermuxServerCard />
      <DiscordCard />
      </>}

      {tab === 'playback' && <>
      <Section title="Sound (equalizer)"><EqualizerCard /></Section>

      <Section title="Playback rules"><PlaybackRules /></Section>

      <Section title="Storage limiter">
        <p className="text-sm text-muted">Off by default: nothing is capped. Turn it on to stop offline audio on this device from growing past a size you choose (any app, browser, desktop or phone). With “Make room automatically” the tracks played longest ago are removed instead of stopping.</p>
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={settings.storageLimitOn} onChange={(e) => updateSettings({ storageLimitOn: e.target.checked })} />Limit offline audio on this device</label>
        <div className="h-2 overflow-hidden rounded-full bg-raised"><div className="h-full bg-accent" style={{ width: settings.storageLimitOn ? `${Math.min(100, (audioBytes / limitBytes) * 100)}%` : '0%' }} /></div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>{fmtBytes(audioBytes)} of offline audio ({Object.keys(audioCache).length} files){settings.storageLimitOn ? ` · limit ${settings.storageLimitMb} MB` : ' · no limit'}{usage ? ` · this device allows ${fmtBytes(usage.quota)}` : ''}</span>
          <span className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">Limit MB<input className="input !w-24" type="number" min={100} step={100} disabled={!settings.storageLimitOn} value={settings.storageLimitMb} onChange={(e) => updateSettings({ storageLimitMb: Number(e.target.value) || 2048 })} /></label>
            <label className="flex items-center gap-1.5" title="When full, remove the offline tracks you played longest ago to make room"><input type="checkbox" disabled={!settings.storageLimitOn} checked={settings.evictOldest} onChange={(e) => updateSettings({ evictOldest: e.target.checked })} />Make room automatically</label>
            <button className="btn" disabled={!audioBytes} onClick={() => void removeAudio(Object.keys(audioCache))}>Clear offline audio</button></span></div>
      </Section>
      </>}
    </div>
  );
}
