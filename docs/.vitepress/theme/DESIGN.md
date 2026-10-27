# Poetry and reading

The home is a name, two quiet destinations on the left, and a rotating reading
column on the right. Content,
metadata, public routes and VitePress navigation remain the source of truth.

- Light: cool paper `#eef2f3`, cobalt `#243ecd`, ink `#172439`.
- Dark: navy `#151d37`, periwinkle ink `#a7bcff`, text `#f0f4ff`.
- The wordmark and desktop/mobile navigation use the existing reading serif.
  Controls and metadata use sans serif. No new font service.
- Home uses a centered, content-sized composition: staggered destinations on the left,
  a generous poetry column on the right. Library keeps its -3 degree tilt and Projects
  its +2 degree tilt. On phones, the destinations step diagonally above the poetry. No decorative SVG paths or reserved drawing margins.
- Documents use symmetric outer padding, a 690px prose measure and a separate outline.
  Collections retain their wider 1000px measure. On smaller sidebar layouts the outline
  moves into native local navigation; phones use 24px edges (20px at 320px).
- Loading uses a centered reading block with a small loading label above the poem.
  The 404 uses its large typographic number, recovery links and a separate poem column;
  phones stack the content without decorative dividers.
- The preserved ASCII pointer trail is a quiet secondary texture, home only.
- Home poetry uses 200 original works by ChatGPT 6 Astra, shuffled without repeats until
  the bag is exhausted. A cycle counts 60 seconds from the start of typing, then
  retracts the text before the next work. The loading overlay keeps its own 50
  works and 30-second cycle. Both share the player but have independent selection state.
- The 404 reading column combines those 250 works in its own shuffled bag and
  reuses HomePoetry's 60-second player, pause, selection and Next controls.
  The error and recovery links sit left of the poetry; phones stack both in normal flow.
- Search expands left from the fixed right edge of its icon, preserving the tabs
  and site tools to its right. Phones open a full-width row below the navbar. Random opens one note or excerpt from the generated
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
  text without per-character live announcements. Mobile places destinations above the
  poetry, with native vertical scrolling.
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
  source. GitHub links use the official Invertocat asset. The circular floating
  control is the sole return-to-top entry; empty local navigation is hidden.
- The variable serif wordmark gains weight with a left-to-right marker on hover/focus,
  with opacity on press and reduced-motion support. Home destination labels share the
  variable-weight and left-to-right marker feedback on hover and keyboard focus.
  Normal activation replays the 440ms stroke before client navigation; modified clicks
  retain native link behavior, and reduced motion navigates immediately.

Run `npm run check`, `npm run docs:e2e` and `npm run docs:audit` before publication.
The browser suite covers native scrolling, outline navigation,
reduced motion, responsive widths, search, history, theme and full article export.

- Excerpts use the Markdown-first standard in `/guide/writing-style#excerpts-新增与维护`.
  Only complete works with original titles use H1 and complete: true. All fragments
  use complete: false and an internal identifier; original titles appear in attribution. Prose remains Markdown inside one article shell; optional
  attribution follows each original/translation, with editorial notes last.

- Attribution is right-aligned at 14px; reading text is 20px on desktop and 18px on phones.
- Poem credits link quietly to ChatGPT without hover decoration. Mobile menu appearance
  uses the navbar control alone. Back-to-top uses interruptible quintic easing and avoids the footer.

- Docs and Projects use whole-row catalog links, reading-serif destination titles (24px / 21px),
  quieter descriptions (16px / 15px), Lucide arrows, marker hover and visible keyboard focus.
  Docs retains its two groups; Projects retains status metadata below descriptions on phones.

## Shared motion

- Motion uses feedback (180ms), settling (320ms), menu items (200ms with 30ms stagger)
  and once-only fades (220ms). The previously approved 440ms home click stroke stays intact.
- Vue Bits Variable Proximity adapts only the existing weight axis (400–600) for the
  wordmark and two home entries. Fine mouse pointers opt in; keyboard, touch, reduced
  motion and home activation retain the original feedback. Idle pointer effects do no work.
- Docs, Projects, Library and collections share the same moving row marker. Catalog
  title ink remains the label treatment; the obsolete static inset bar is removed.
- Search keeps its combobox/listbox IDs, result ranking, retry, native scrolling and
  keyboard model. Animated List contributes a sliding selected background and short
  opacity entrances, capped at 96ms of staggering.
- The existing mobile dialog uses Staggered Menu item staging, retaining its native
  focus trap, Escape behavior and background inert state.
- Fade Content applies once to index headers, About's introduction and 404's message.
  Text is visible in SSR/no-JS output; reading bodies, poems, ASCII and exported images
  receive no reveal effects. No global animation dependency is added.
- Reduced motion disables proximity, fades, list entrances, marker movement and menu
  staging. Sources and license: `effects/README.md` and `/licenses/vue-bits/LICENSE`.

- Primary page titles and major H2 sections share variable-weight and blue-marker hover.
  Markdown headings receive a semantic inline paint layer, with wrapped lines marked
  sequentially: each stroke finishes before the next begins, at a consistent drawing speed. Catalog and 404 titles use the same class. Anchors, heading text, dates,
  body text and image-export typography remain intact; reduced motion removes transitions.
