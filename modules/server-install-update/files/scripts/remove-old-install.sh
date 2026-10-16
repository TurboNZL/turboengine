#!/usr/bin/env bash
# Removes the OLD system-wide server install (the first-generation one: a service called "curator" or "music-curator-server",
# its weekly yt-dlp timer, its sudoers entry, its service account and its app checkout) in one go.
# It NEVER touches your library folder: it only tells you where it is, so you can give it to install-server.sh (--data-dir).
#
#   sudo bash remove-old-install.sh --dry-run     # shows what it would remove
#   sudo bash remove-old-install.sh --yes         # does it
#
#   --delete-home   also delete the old service account's home folder (default: kept; it can hold the app checkout and nothing of yours)
#   --yes           do not ask
#   --dry-run       only list
set -euo pipefail

YES=0; DRY=0; DELETE_HOME=0
for a in "$@"; do
  case "$a" in
    --yes) YES=1 ;; --dry-run) DRY=1 ;; --delete-home) DELETE_HOME=1 ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) echo "unknown option: $a (try --help)" >&2; exit 1 ;;
  esac
done
[ "$(id -u)" = 0 ] || { echo "Run this with sudo: it removes system services and an account." >&2; exit 1; }

UNITS=(curator.service curator-ytdlp-update.service curator-ytdlp-update.timer music-curator-server.service)
PACKAGES=(music-curator music-curator-app music-curator-server)
USERS=(curator music-curator)
SUDOERS=(/etc/sudoers.d/curator)
ETC=(/etc/music-curator)

found=0; plan=()
say() { printf '%s\n' "$*"; }
add() { plan+=("$1"); found=1; say "  - $2"; }

say "Looking for the old install..."
LIB=()
for u in "${UNITS[@]}"; do
  for dir in /etc/systemd/system /lib/systemd/system /usr/lib/systemd/system; do
    if [ -f "$dir/$u" ]; then
      add "unit:$u:$dir" "service file $dir/$u"
      d="$(grep -h -o 'CURATOR_DATA_DIR=[^ "]*' "$dir/$u" 2>/dev/null | head -1 | cut -d= -f2)"; [ -z "$d" ] || LIB+=("$d")
    fi
  done
done
for f in "${ETC[@]}"; do
  if [ -d "$f" ]; then add "etc:$f" "settings folder $f"; d="$(grep -h -o '^CURATOR_DATA_DIR=.*' "$f/server.env" 2>/dev/null | head -1 | cut -d= -f2)"; [ -z "$d" ] || LIB+=("$d"); fi
done
for f in "${SUDOERS[@]}"; do [ ! -f "$f" ] || add "sudoers:$f" "sudoers entry $f"; done
for p in "${PACKAGES[@]}"; do dpkg -s "$p" >/dev/null 2>&1 && add "pkg:$p" "installed package $p" || true; done
HOMES=()
for u in "${USERS[@]}"; do
  if id "$u" >/dev/null 2>&1; then
    h="$(getent passwd "$u" | cut -d: -f6)"; add "user:$u:$h" "account '$u' (home: $h)"; HOMES+=("$h")
  fi
done
[ -d /var/lib/music-curator ] && LIB+=(/var/lib/music-curator) || true
[ -d /var/lib/curator ] && LIB+=(/var/lib/curator) || true

if [ "$found" = 0 ]; then say "Nothing of the old install was found. Nothing to do."; exit 0; fi
say
if [ "${#LIB[@]}" -gt 0 ]; then
  say "Your library (NOT touched) is probably in:"; printf '  %s\n' "$(printf '%s\n' "${LIB[@]}" | sort -u)"
  say "Give that folder to the new install:  install-server.sh --root /mnt/data/turbomusic --data-dir <that folder>"
  say
fi
[ "$DRY" = 1 ] && { say "(dry run: nothing was changed)"; exit 0; }
if [ "$YES" != 1 ]; then
  [ -t 0 ] || { echo "Not a terminal: add --yes to confirm." >&2; exit 1; }
  read -r -p "Remove the items above? Make sure the NEW server works first. [y/N] " ans
  case "$ans" in y|Y|yes) ;; *) say "Cancelled."; exit 0 ;; esac
fi

for item in "${plan[@]}"; do
  kind="${item%%:*}"; rest="${item#*:}"
  case "$kind" in
    unit)
      name="${rest%%:*}"; dir="${rest#*:}"
      systemctl disable --now "$name" >/dev/null 2>&1 || true
      rm -f -- "$dir/$name"; say "removed $dir/$name" ;;
    sudoers) rm -f -- "$rest"; say "removed $rest" ;;
    pkg) apt-get remove -y "$rest" >/dev/null && say "removed package $rest" ;;
    etc) rm -rf -- "$rest"; say "removed $rest" ;;
  esac
done
systemctl daemon-reload >/dev/null 2>&1 || true
for item in "${plan[@]}"; do
  case "$item" in
    user:*)
      rest="${item#user:}"; name="${rest%%:*}"; home="${rest#*:}"
      pkill -u "$name" >/dev/null 2>&1 || true
      userdel "$name" >/dev/null 2>&1 && say "removed account $name" || say "could not remove account $name (is it still running something?)"
      # the app checkout is a git clone and nothing of yours; the rest of the home folder is only removed on request
      for sub in music-curator app; do
        if [ -d "$home/$sub/.git" ]; then rm -rf -- "${home:?}/${sub:?}"; say "removed the old checkout $home/$sub"; fi
      done
      if [ "$DELETE_HOME" = 1 ] && [ -n "$home" ] && [ "$home" != "/" ] && [ -d "$home" ] && [ "${home#/home/}" != "$home" ]; then rm -rf -- "$home"; say "removed $home"; fi ;;
  esac
done
say
say "Done. Your library folder was not touched."
