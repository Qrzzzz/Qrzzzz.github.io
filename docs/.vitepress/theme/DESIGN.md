# Gesture / blue ink

The home is a name and two destinations inside one continuous gesture. Content,
metadata, public routes and VitePress navigation remain the source of truth.

- Light: cool paper `#eef2f3`, cobalt `#243ecd`, ink `#172439`.
- Dark: navy `#151d37`, periwinkle ink `#a7bcff`, text `#f0f4ff`.
- Interface: sans serif. Reading: the existing local serif subsets. No new font service.
- The mobile curve is a separate composition. Never crop or scale down the desktop layout.
- The home gesture is rendered as a restrained three-layer signal: a low-opacity field,
  a 4.4 px gradient ink stroke (3.7 px on phones), and a fine dotted signal core. The
  layers share exactly the same geometry and deform as one object.
- Hover and drag resolve to a continuous arc-length coordinate on the stroke, never
  to a sampled anchor. Small pulls stay effectively 1:1 before a soft resistance knee;
  tangential motion can slide the deformation center a limited distance instead of
  pinning one material point. Pointer tracking uses a short direct-response filter and
  release uses a critically damped return with no bounce. Off-canvas endpoint constraints
  and protected link space remain fixed, and the animation loop stops at rest.
- Only the 44 px stroke hit area captures touch. Everything else keeps native scrolling.
- The document margin follows native page scrolling; there is no nested reading viewport.
  Its length responds to content and layout changes. The heading outline stays available.
- Reading Rail clips a shallow wave at the current visible body coordinate, without easing.
  It extends while scrolling down and retracts while scrolling up; body resize recomputes geometry.
  Shared width, offset, gap, edge and stroke tokens live in `styles/reading-rail.css`.
  Phones (including landscape) reserve 34 px, with a 12 px rail.
- Reduced motion makes the home line static and fully drawn; Reading Rail keeps its
  immediate position updates without animation. Hidden pages and unmount cancel
  animation work, release pointer capture and remove listeners.
- The preserved ASCII pointer trail is a quiet secondary texture, home only.
- Shared controls use short color/underline changes. Theme switching fades one snapshot
  over a fully visible new theme. Avoid autoplay, floating cards, fake windows and
  independent decorative effects.

Run `npm run check`, `npm run docs:e2e` and `npm run docs:audit` before publication.
The browser suite covers touch capture, native scrolling, outline navigation,
reduced motion, responsive widths, search, history, theme and full article export.
