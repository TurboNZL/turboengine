# Ports: every program on a machine needs its own

**Two programs cannot listen on the same port on the same machine.** The second one fails to start ("address already in use"), or, worse, a client quietly reaches the wrong program. The owner runs several TurboNZL servers (and other things) on one Raspberry Pi, so every server app gets **its own port, chosen on purpose, from the list below**, never a convenient default.

## The rules
1. **Never default to a common port.** 80, 443, 3000, 5000, 5173, 8000, 8080, 8443, 8888 and 9000 are what everything else on the machine already wants. TurboMusic's owner asked for "something obscure, not 8080" and that is the standing rule.
2. **TurboNZL apps use 47800 to 47999.** Take the next free number in the table below **in the same commit that creates the app**, and add the row here. The range is above the ports other software normally asks for, and it is below the range Windows and macOS hand out for outgoing connections (49152 and up). **On Linux it is inside the default outgoing range (32768 to 60999)**, so in principle an outgoing connection can be holding one of these numbers at the moment a server starts, and the server then fails with "address already in use". That is rare (the system picks outgoing ports at random from tens of thousands) and a restart clears it, but a machine that runs these servers can rule it out for good by reserving the range: `echo 'net.ipv4.ip_local_reserved_ports = 47800-47999' | sudo tee /etc/sysctl.d/60-turbonzl-ports.conf && sudo sysctl --system`. Reserved ports are simply never given to outgoing connections; a program that asks for one explicitly (our servers) still gets it. Check what is already taken on your own machine: `ss -ltn` on Linux, `netstat -ano | findstr LISTEN` on Windows.
3. **Every server app reads its port from `<APP>_PORT`** (`TURBOMUSIC`'s is `CURATOR_PORT`, kept for compatibility) and its installer or compose file takes the same setting (`--port N`, `TURBOKEEP_PORT=` in `.env`). A user whose number is taken changes one setting; nothing in the app may assume the default.
4. **Say it where people look:** the app's `SELF_HOSTING` guide has one sentence that port numbers must be unique per machine and how to change this one, and the README shows the real default.
5. **Docker has two ports.** *Inside* the container the app may use any number (its own network namespace: 8080 there clashes with nothing), but the number *published on the machine* is the one that must be unique, so publish `${APP_BIND:-0.0.0.0}:${APP_PORT:-<registry number>}:<inside>` (`0.0.0.0` so other computers can open it; `127.0.0.1` only once a tunnel on the same machine does the reaching). A tunnel that runs in the same compose project points at the **inside** port (`http://turbokeep:8080`); a tunnel that runs on the host points at the **published** one (`http://localhost:47901`).
6. **Development servers** (Vite on 5173, an API on its own) clash too when two apps are developed at once. Vite moves to the next free port by itself; an API dev server does not, so a repo's dev scripts read the same `<APP>_PORT`.

## Registry

| Port | App | Setting | Notes |
|---|---|---|---|
| 47813 | TurboMusic server | `CURATOR_PORT` (installer `--port`) | The original; its installed servers and paired devices use it. Do not change the default. |
| 47900 | TurboPantry server | `TURBOPANTRY_PORT` (installer `--port`) | |
| 47901 | TurboKeep | `TURBOKEEP_PORT` (compose `.env`, or the same variable without Docker) | 8080 inside its container only. |
| 47902 | TurboCut web server | `--port` of `scripts/serve.mjs` | **Reserved.** Today `serve.mjs` still defaults to 8080: move the default here when convenient. |
| 47903 | TurboCut device sharing (desktop app) | `TURBOCUT_SHARE_PORT` (both) | **TCP** (the transfer listener) and **UDP** (broadcast to find other TurboCut apps), only while sharing is on. Not a server app: nothing to install. See `modules/device-share`. |
| 47904 to 47999 | next apps | | Take the next one, add the row. |

Tunnels and reverse proxies use these numbers in their config, so a change of port is a change in three places (the app's setting, the tunnel's service URL, any firewall rule): say so in the app's tunnel guide.

## Checking before you start
```
ss -ltn | grep -E ':47[89][0-9]{2}\b'      # what already listens in the TurboNZL range
sudo lsof -iTCP:47901 -sTCP:LISTEN         # who has one port
docker ps --format '{{.Names}}\t{{.Ports}}' # what Docker has published
```
