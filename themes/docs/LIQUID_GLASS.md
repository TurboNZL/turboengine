# macOS Liquid Glass (UI style)

UI style **macOS Liquid Glass** (id `liquid`, `themes/liquid/`). Pairs with the macOS / macOS Dark colour themes ("Use matching colours"). Glass variants: **Regular** (default) and **Clear**.

## What Apple describes, and where it is here

From Apple's WWDC25 session [Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/):

| Apple | Here |
|---|---|
| **Lensing**: light is bent and concentrated, not scattered like a blur | `engine/src/effects/liquidGlass.ts` builds an SVG displacement map per shape (below) and applies it from `backdrop-filter`. Rays are slightly dispersed (red/green/blue shift by 100 / 95.5 / 91 %) so edges fringe like real glass. |
| **Materialization**: elements modulate their light bending instead of fading | Menus and dialogs ease the lens in from zero (`materialize()`), together with a spring scale-in. |
| **Fluidity / morphing**: gel-like response, menus pop open from their button | Press scales to 93 % and springs back (`cubic-bezier(.34,1.56,.64,1)`); menus and dialogs grow from the point you pressed (the app (TurboMusic keeps the press position in `lib/pointer.ts` and sets each pop-up's `transform-origin`) supplies it as `transform-origin`). |
| **Touch response**: the material lights up from within, starting under the finger | A glow centred on the pointer (`--mx/--my`) whose radius and strength animate (`@property --lg-glow`) on hover and press. |
| **Adaptivity**: tint, shadow and dynamic range follow the content; large pieces are thicker | Separate dark and light recipes; the lens rim grows with the shape up to a limit; shadows are softer in light mode. Glass **recedes when the window loses focus** (`html.lg-inactive`). |
| **Specular highlights** from a light source at the top left | A 1 px rim whose brightness follows how far each edge faces a light at the top left (and, weaker, the opposite side), drawn into a per-shape image. |
| **Tinting**: use it only to emphasise primary actions | Only `.btn-accent` is tinted; everything else is neutral glass. |
| **Regular vs Clear**: Clear is permanently more transparent and needs a dimming layer | `Clear` lowers blur and fill and adds a dimming layer under the content. Never mixed with Regular. |
| **Navigation layer only**: keep glass out of the content layer, avoid glass on glass | Glass: floating sidebar, top controls, player bar, tab bar, menus, dialogs, and the buttons in those bars. Cards, tables and fields stay quiet fills. |
| Scroll edge effect, floating bars with concentric corners | Content fades under a soft blur at the top; the sidebar (30 px), player and tab bars float 12 px in from the edges; nested corners are radius minus inset. |
| Reduced Transparency / Motion | `prefers-reduced-transparency` makes the surfaces opaque; the app-wide reduced-motion rule removes the animation. |

## How the lens is made

For a rounded rectangle of width w, height h and corner radius r:

1. The outer `bezel` px (about 22 % of the short side, 8–28 px) is treated as a convex **squircle** surface, height `h(t) = (1 − (1 − t)^4)^(1/4)` with `t` = distance from the rim ÷ bezel.
2. A vertical ray meets the surface at angle θ₁ (from the slope). Snell's law with glass index **n = 1.5** gives θ₂ = asin(sin θ₁ / n). Through the glass thickness T (a base slab plus the local height), it lands `T · tan(θ₁ − θ₂)` px to the side, towards the inside of the shape.
3. That displacement per pixel is stored in a PNG (red = x, green = y, 128 = none) used as `feDisplacementMap`'s `in2`; `scale` is twice the largest displacement because 0.5 is neutral. Rays always land inside the element, which matters because `backdrop-filter` can only see what is under the element's own box.
4. The same signed-distance function gives the specular rim image.

Filters are shared by every element whose size is within 4 px of each other, and a lens is switched on only after its image has decoded (a filter whose `feImage` is not ready renders as nothing).

## Browser support

An SVG filter inside `backdrop-filter` works only in Chromium (Chrome, Edge, **Electron**). Safari and Firefox get the same design without the refraction: frosted glass with the rim highlight, the glow and all the motion. This is detected (`supportsLens()`), nothing needs configuring.

## Sources

- Apple, [Meet Liquid Glass (WWDC25 session 219)](https://developer.apple.com/videos/play/wwdc2025/219/): the properties above and the Regular/Clear guidance.
- kube.io, "Liquid Glass in the Browser: Refraction with CSS and SVG" (Snell's-law bezel, displacement map, specular ring): the web technique this follows. I could not open the article from the build environment, so the parameters here (n = 1.5, convex squircle, ring at roughly 60°) come from secondary write-ups that follow it, such as [this PR](https://github.com/DayuanJiang/PecoFence/pull/9), and from checking the result in Chromium.
