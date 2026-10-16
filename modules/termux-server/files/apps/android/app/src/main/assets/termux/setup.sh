# TurboMusic server module: install (or repair, or update) inside Termux. Run by the app through Termux's RUN_COMMAND; the app fills in the @…@ values.
# Safe to run again. Everything lives in ~/turbomusic-server (program) and ~/turbomusic-data (the library, never touched here).
set -e
export DEBIAN_FRONTEND=noninteractive
echo "[turbomusic] installing packages (this takes a few minutes the first time)"
pkg update -y -o Dpkg::Options::="--force-confold" || true
pkg install -y -o Dpkg::Options::="--force-confold" nodejs curl tar ffmpeg python
pkg install -y yt-dlp || pip install -U yt-dlp
node -e 'const [a,b]=process.versions.node.split(".").map(Number); if (a<22||(a===22&&b<13)) { console.error("Node "+process.version+" is too old (need 22.13+)"); process.exit(4); }'
D="$HOME/turbomusic-server"
mkdir -p "$D" "$HOME/turbomusic-data"
fetch() { if [ -n "@GH_TOKEN@" ]; then curl -fsSL -H "Authorization: Bearer @GH_TOKEN@" "$@"; else curl -fsSL "$@"; fi; }
echo "[turbomusic] finding the server bundle in the project's releases"
URL=$(fetch "https://api.github.com/repos/@OWNER@/@REPO@/releases?per_page=20" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const rs=JSON.parse(s).filter(r=>!r.draft);for(const r of rs){const a=(r.assets||[]).find(a=>a.name.endsWith("-termux.tar.gz"));if(a){console.log(a.browser_download_url);return}}console.log("")})')
if [ -z "$URL" ]; then echo "[turbomusic] no server bundle is attached to any release yet"; exit 3; fi
echo "[turbomusic] downloading $URL"
fetch -o "$D/bundle.tgz" "$URL"
rm -rf "$D/web" "$D/headless.mjs"
tar -xzf "$D/bundle.tgz" -C "$D"
rm -f "$D/bundle.tgz"
echo "$URL" > "$D/installed-from"
test -f "$D/headless.mjs" && test -f "$D/web/index.html"
echo "[turbomusic] installed"
