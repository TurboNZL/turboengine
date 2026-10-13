#!/usr/bin/env python3
"""Regenerates themes-open/themes from ../themes/themes: the stripped-down pack (see README.md). Run from anywhere: python3 themes-open/make.py
Only folders listed in KEEP/RENAME are carried over; a renamed look gets a new id, label, description and none of the original's names."""
import json, os, re, shutil
here = os.path.dirname(os.path.abspath(__file__))
srcdir = os.path.join(here, '..', 'themes', 'themes'); out = os.path.join(here, 'themes')
KEEP = ['default', 'toolbar', 'classic', 'daylight', 'dark', 'amoled', 'crimson', 'ember', 'forest', 'graphite', 'midnight', 'ocean', 'plum', 'sand',
        'dracula', 'nord', 'gruvbox', 'solarized', 'tokyo', 'mocha']
# old folder -> new id, style label, style description, {old palette id: (new id, label, group)}
RENAME = {
  'win98':   ('bevel', 'Classic bevel', 'Grey bevelled 3D controls, navy title bars, no animation and small bitmap-style type.', {'win98': ('bevel', 'Classic grey', 'colour')}),
  'gtk4':    ('soft', 'Soft rounded', 'A flush grey sidebar and flat header bar, 6 px grey buttons and entries, 12 px outlined cards and popovers, white round slider knobs.', {'adwaita': ('soft', 'Soft light', 'colour'), 'adwaita-dark': ('soft-dark', 'Soft dark', 'colour')}),
  'material': ('material', 'Material', 'Pill buttons, tonal surfaces, filled fields with an underline and rounded dialogs in Roboto.', {'material': ('material', 'Tonal', 'colour'), 'material-dark': ('material-dark', 'Tonal dark', 'colour')}),
  'liquid':  ('liquid', 'Glass lens', 'Translucent floating bars that bend the light behind them, rim highlights, springy press and morphing menus.', {}),
  'gameboy': ('lcd', 'Pocket LCD', 'The four greens of a handheld LCD, 2 px square frames, hard shadows, inverted picks and pixel type. Covers are tinted green.', {'dmg': ('lcd', 'Four greens', 'inspired')}),
  'pipboy':  ('terminal', 'Green terminal', 'Green phosphor on black: one hue, square frames, glowing type, scan lines and menus that pick by inverting.', {'pipboy': ('terminal', 'Phosphor green', 'inspired')}),
  'cyber':   ('neon', 'Neon night', 'Near-black with caution-tape yellow and cyan glints, chamfered corners, condensed capitals and solid yellow selection bars.', {'cyber': ('neon', 'Neon yellow', 'inspired')}),
}
WORDS = [(r'Windows 98', 'classic bevel'), (r'win98', 'bevel'), (r'Pip-Boy 3000 \(Fallout\)', 'green terminal'), (r'Pip-Boy', 'terminal'), (r'pipboy', 'terminal'), (r'Fallout', 'sci-fi'),
         (r'Game Boy( \(DMG-01\))?', 'handheld'), (r'DMG', 'LCD'), (r'dmg', 'lcd'), (r'GTK ?4', 'soft'), (r'gtk4', 'soft'), (r'libadwaita|Adwaita|adwaita', 'soft'),
         (r'macOS Liquid Glass|Apple\'s Liquid Glass|Liquid Glass', 'Glass lens'), (r'macOS|macos', 'glass'), (r'Apple\'s', 'the'), (r'Apple', ''),
         (r'Cyberpunk 2077', 'Neon night'), (r'Night City', 'Neon'), (r'Material You', 'Tonal'), (r'Material 3', 'Material'),
         (r'"(?:Segoe UI|Tahoma|SF Pro[^",]*|-apple-system|BlinkMacSystemFont|Cantarell)",?\s*', ''), (r'\b(?:Segoe UI|Tahoma|Cantarell|SF Pro Text|SF Pro Display|SF Pro),\s*', ''),
         (r'-apple-system, BlinkMacSystemFont, ', ''),
         (r'Microsoft', 'a desktop OS')]
def clean(text, folder_ids):
    for old, new in folder_ids: text = text.replace(f'"{old}"', f'"{new}"')
    for pat, rep in WORDS: text = re.sub(pat, rep, text)
    return text
shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
for d in KEEP: shutil.copytree(os.path.join(srcdir, d), os.path.join(out, d))
for old, (new, label, desc, pals) in RENAME.items():
    shutil.copytree(os.path.join(srcdir, old), os.path.join(out, new))
    ids = [(old, new)] + [(po, pn[0]) for po, pn in pals.items()]
    # selectors: [data-ui="old"] / [data-theme="old"] -> new; json ids and plain words
    for fn in os.listdir(os.path.join(out, new)):
        p = os.path.join(out, new, fn)
        if fn.endswith(('.css', '.json')):
            s = open(p).read()
            s = re.sub(r'\[data-ui=(["\']?)' + re.escape(old) + r'\1\]', lambda m: f'[data-ui={m.group(1)}{new}{m.group(1)}]', s)
            for po, pn in pals.items(): s = re.sub(r'\[data-theme=(["\']?)' + re.escape(po) + r'\1\]', lambda m: f'[data-theme={m.group(1)}{pn[0]}{m.group(1)}]', s)
            if fn == 'theme.json':
                j = json.loads(s); j['id'] = new; j['label'] = label
                if 'style' in j:
                    j['style']['description'] = desc
                    if j['style'].get('font') in ('SF Pro', 'Tahoma', 'Cantarell'): j['style']['font'] = 'system-ui'
                    if 'matching' in j['style']:
                        m = j['style']['matching']
                        j['style']['matching'] = {k: pals[v][0] if v in pals else ('light' if k == 'light' else 'default') for k, v in m.items()}
                for pal in j.get('palettes', []):
                    n = pals[pal['id']]; pal['id'] = n[0]; pal['label'] = n[1]; pal['group'] = n[2]; pal.pop('source', None)
                s = json.dumps(j, indent=2, ensure_ascii=False) + '\n'
            else:
                s = clean(s, [])
            open(p, 'w').write(s)
# the same cleaning of words for kept folders is not needed (they carry no brand); config: only Material on Android/Chromebooks, otherwise the standard look
cfg = json.load(open(os.path.join(srcdir, 'config.json')))
cfg['choices']['ui'][0]['description'] = 'Picks Material on Android phones and Chromebooks and the standard look everywhere else. Follows the device\'s light or dark setting.'
cfg['devices'] = [dv for dv in cfg['devices'] if dv['name'] in ('Material You', 'ChromeOS (Material)')]
for dv in cfg['devices']:
    dv['name'] = dv['name'].replace('Material You', 'Material')
    dv['ui'] = 'material'; dv['light'] = 'material'; dv['dark'] = 'material-dark'
json.dump(cfg, open(os.path.join(out, 'config.json'), 'w'), indent=2, ensure_ascii=False); open(os.path.join(out, 'config.json'), 'a').write('\n')
print('themes-open/themes:', len(os.listdir(out)) - 1, 'folders')
