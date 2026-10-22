# Theme style ownership

- `tokens.css`: palette, fonts and shared reading measures. Ordinary article and document prose uses `--site-reading` (690px); indexes use `--site-index` (1000px).
- `icons.css`: official Lucide SVG imports and shared icon rendering, including adapters for native VitePress controls. Use `SiteIcon.vue` for authored controls; preserve text labels and hide decorative icons from screen readers. The pinned `lucide-static` dependency supplies only explicitly referenced assets; licenses ship under `/licenses/lucide/`. GitHub profile links use GitHub's official Invertocat in `assets/`, with its own source attribution.
- `site.css`: site shell and navigation. Navigation breakpoints retain the P1 layout fixes.
- `content.css`: body typography, semantic Markdown elements and base collection rows. The 767px breakpoint changes reading type sizes; wide document tables, code and diagrams keep their own containers.
- `catalog.css`: index headers and collection/project layout, including the single-column 639px layout.
- `gesture-content.css`: shared controls, hover motion and surface treatment; do not add body typography overrides here.
- `document-layout.css`: document/outline composition, sidebar spacing and symmetric mobile margins.
- `home-poetry.css`: content-sized home composition, staggered destinations and shared poem typography.
- `InlineSearch.vue`: search layout, result typography and visible-viewport sizing. Its right edge stays at the trigger while it expands left; `site.css` hides only the mobile title underneath it.
- `ArticleHeader.vue`: optional article metadata layout. Its native details remain available to keyboard users and are expanded by the existing longform exporter.

Change the owning rule instead of appending a later override. Preserve necessary article/document/index differences. Verify 320, 390, 844, 1024 and 1440px in both themes, and verify real keyboard/zoom behavior separately from viewport emulation.
