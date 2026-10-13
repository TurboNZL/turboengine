# themes-open: the stripped-down theme pack

A second, **not preferred** theme pack for apps that are (or might be) sold. It is built by the same engine as `../themes` (nothing is duplicated; see "Building"), but it contains only looks that do not rely on someone else's name, logo, font or trade dress. The full pack (`../themes`) stays the default for apps that are free and personal.

This is a risk reduction, not legal advice. Before charging money, read the "Check before shipping" list.

## What is in it (9 UI styles, 29 palettes)
| Style | id | Comes from | What changed |
|---|---|---|---|
| Standard v2 | `default` | the app's own look | nothing |
| Standard v1 | `toolbar` | the app's own first version | nothing |
| Classic bevel | `bevel` | `win98` | renamed; "Windows 98" gone from labels, text and notes |
| Soft rounded | `soft` | `gtk4` | renamed; palettes "Soft light/dark" instead of Adwaita |
| Material | `material` | `material` | palettes "Tonal" instead of "Material You" |
| Glass lens | `liquid` | `liquid` | label and text only; the id stays because the engine's lens effect is keyed to it. No Apple name, no SF Pro |
| Pocket LCD | `lcd` | `gameboy` | no Nintendo name or model; four generic LCD greens |
| Green terminal | `terminal` | `pipboy` | no Fallout/Pip-Boy; green phosphor is generic |
| Neon night | `neon` | `cyber` | no game name |

Palettes: Standard v2/v1, Light, Classic, Daylight, Slate, AMOLED, Sand, Midnight, Ocean, Forest, Plum, Crimson, Ember, Graphite (all the app's own), and Nord, Dracula, Mocha (Catppuccin), Tokyo Night, Gruvbox, Solarized Dark (community palettes, see below).

"Match this device" only maps Android and Chromebooks to Material; everywhere else it gives the standard look. It never picks an OS look.

## What was left out, and why
| Left out | Reason |
|---|---|
| Fortnite 1, 2-3, 4, 5-6 | Epic's [fan content policy](https://legal.epicgames.com/epicgames/fan-art-policy) allows only non-commercial use and forbids implying an official product |
| Minecraft Bedrock (`blocky`) | Mojang is [stricter about commercial use](https://www.minecraft.net/en-us/article/minecraft-eula-and-commercial-usage-guidelines-updates); the bundled font is CC BY-SA |
| Persona, Spotify, YouTube Music, Discord, Genius, Ado, Zune, Winamp | names, logos and recognisable trade dress of one company or person |
| Windows 7/10/11/XP, macOS, Aqua, iOS, Breeze, Yaru, One UI, LG Marshmallow, Android Holo | an OS or vendor's look under its own name; "Match this device" would also advertise them |

Copyright in a UI covers its specific expression, not the idea of a bevelled grey window (see [Apple v. Microsoft](https://law.justia.com/cases/federal/appellate-courts/F3/35/1435/605245/)), which is why generic looks stay and branded ones go. Trademarks and trade dress are a separate question and are where the risk is.

## Check before shipping
- The six community palettes are used under their authors' open licences (Dracula, Nord, Catppuccin, Tokyo Night, Gruvbox and Solarized all publish theirs as MIT or similar). Read each upstream LICENSE and add the notices to the app's credits before selling. If in doubt, delete the folder: nothing else depends on it.
- Fonts are `@fontsource` packages under the OFL or Apache licences (Roboto, VT323, Press Start 2P, Barlow Condensed); keep their notices.
- `bevel` still has navy title bars on a grey window, which is the classic desktop look. If that worries you, change `themes/bevel/palette` colours or drop it.
- Never name an OS or brand in the app's marketing next to these looks.

## Building
`themes-open/themes/` is **generated** from `../themes/themes` by `make.py` (keep/rename lists at its top), so a fix to a look in the main pack reaches this pack by running `python3 make.py`. The build itself is the main engine's with `TURBOTHEMES_SRC` pointing here:

```
cd themes-open
python3 make.py        # regenerate the folders
pnpm build             # writes dist/ (needs `pnpm install` in ../themes once)
pnpm check             # fails if dist/ is stale
```
Apps install the main package and point the updater at this pack's `dist/` (`urlSource` or `githubSource({ dir: 'themes-open/dist' })`), or build it in with the engine in `dist/engine.js` (it has this pack built in). `dist/` is committed by CI (`.github/workflows/themes-open-build.yml`).
