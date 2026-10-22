# Gesture / blue ink

The home is a name, two quiet destinations on the left, and a rotating reading
column on the right. Content,
metadata, public routes and VitePress navigation remain the source of truth.

- Light: cool paper `#eef2f3`, cobalt `#243ecd`, ink `#172439`.
- Dark: navy `#151d37`, periwinkle ink `#a7bcff`, text `#f0f4ff`.
- The wordmark and desktop/mobile navigation use the existing reading serif.
  Controls and metadata use sans serif. No new font service.
- The mobile curve is a separate composition. Never crop or scale down the desktop layout.
- The home destinations sit diagonally on the left, Library above-left (-3 degrees)
  and Projects below-right (+2 degrees). A single blue stroke enters diagonally
  from the side, sweeps through the left negative space and leaves toward the right.
  Desktop uses 1.6 px ink and phones 1.5 px, with no glow or dotted core.
- A loose loop crosses itself with distinct tangents. Its uniformly scaled geometry
  stays round across viewport aspect ratios; phones use a separate lower-left
  composition with room beneath Library and beside Projects. Entry and exit handles
  preserve tangent and curvature at the loop boundaries.
- Static ink uses the authored cubic path. Dense samples serve hit projection;
  deformation renders every fourth sample to reduce serialization and paint work.
- Hover and drag resolve to a continuous arc-length coordinate on the stroke, never
  to a sampled anchor. Small pulls stay effectively 1:1 before a soft resistance knee;
  tangential motion can slide the deformation center a limited distance instead of
  pinning one material point. Pointer tracking uses a short direct-response filter and
  release carries a small bounded velocity into a critically damped return. Drag
  is limited to 56 px on desktop and 28 px on phones, with a broad deformation field.
  Off-canvas endpoint constraints
  and protected link space remain fixed, and the animation loop stops at rest.
- Only the 44 px stroke hit area captures touch. Everything else keeps native scrolling.
- The document margin follows native page scrolling; there is no nested reading viewport.
  Its length responds to content and layout changes. The heading outline stays available.
- Reading Rail clips a shallow wave at the current visible body coordinate, without easing.
  It extends while scrolling down and retracts while scrolling up; body resize recomputes geometry.
  Shared width, offset, gap, edge and stroke tokens live in `styles/reading-rail.css`.
  Phones (including landscape) reserve 34 px, with a 12 px rail.
- Desktop reading lines place twelve authored loop variants at sparse, seeded document positions.
  The endpoint stays at 88% of the viewport. A loop deforms only after its whole segment is behind
  that endpoint; its added arc length never changes reading progress. Compatible intermediate poses
  preserve shared tangents, and scrolling upward reverses the same deformation before clipping
  can cross it. Short viewports omit loops that cannot finish slowly below the navigation; short
  articles and the article tail leave enough space to complete each loop. Resize changes geometry,
  not the seeded selection. SVG is never observed by its own redraw callback.
- Reduced motion makes the home line static and fully drawn; Reading Rail keeps its
  immediate position updates on its original wave, with no loop deformation. Phones also keep
  that original wave. Hidden pages and unmount cancel
  animation work, release pointer capture and remove listeners.
- The preserved ASCII pointer trail is a quiet secondary texture, home only.
- Home poetry uses 200 original works by 6 Astra, shuffled without repeats until
  the bag is exhausted. A cycle counts 60 seconds from the start of typing, then
  retracts the text before the next work. The loading overlay keeps its own 50
  works and 30-second cycle. Both share the player but have independent selection state.
- The 404 reading column combines those 250 works in its own shuffled bag and
  reuses HomePoetry's 60-second player, pause, selection and Next controls.
  The error and recovery links sit left of the poetry; phones stack both in normal flow.
- Search expands left from the fixed right edge of its icon, preserving the tabs
  and site tools to its right. Random opens one note or excerpt from the generated
  Library catalog and replaces its intermediary URL so Back returns to the prior page.
- Full document visits show the loading screen before application resources, with
  its existing styles and theme tokens inlined from their source files. Main styles
  load without blocking that first paint; no-JS keeps ordinary blocking styles.
  Dismissal waits for app readiness, styles, and at least 700 ms after a painted
  loading frame. Internal navigation keeps the 180 ms anti-flicker delay. Broken
  startup releases the server-rendered page after the existing three-minute limit.
- Pause/Resume and Next remain keyboard accessible; selecting poem text pauses
  playback. Background and user pauses overlap without consuming reading time.
  Reduced motion shows full works, and no-JS retains a complete server-rendered poem.
  The ghost copy reserves authored text geometry; screen readers receive whole
  text without per-character live announcements. Mobile places poetry above the
  destinations and uses its own curve composition, with native vertical scrolling.
- Shared controls use short color/underline changes. Theme switching fades one snapshot
  over a fully visible new theme. Avoid autoplay, floating cards, fake windows and
  independent decorative effects.

- Information boxes share prose width and use a light tint, fine border, restrained
  left rule and compact title; tables, code and diagrams retain their wider measure.
- Production search fetches `/search-index/<locale>.json`, emitted from the same
  VitePress index used in development. Failed loads are uncached so Retry can make
  a fresh request. Results include plain-text excerpts with Vue-rendered highlighting.
  Titleless excerpts receive a heading only in the search render, linking to their
  existing article anchor; their visible page markup stays titleless.
  Esc stays a small keycap with hover/focus feedback and an unobtrusive tooltip.
- UI icons use the pinned official Lucide static SVGs through `SiteIcon.vue` and
  `styles/icons.css`. Menu, outline, external links and code-copy controls share that
  source. GitHub links use the official Invertocat asset. Artwork remains in its illustration components. The circular floating
  control is the sole return-to-top entry; empty local navigation is hidden.
- The serif wordmark uses color and a faint underline for hover/focus feedback,
  with opacity on press and reduced-motion support.

Run `npm run check`, `npm run docs:e2e` and `npm run docs:audit` before publication.
The browser suite covers touch capture, native scrolling, outline navigation,
reduced motion, responsive widths, search, history, theme and full article export.
