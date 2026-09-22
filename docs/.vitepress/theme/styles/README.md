# Theme style ownership

- `tokens.css`: palette, fonts and shared reading measures. Ordinary article and document prose uses `--site-reading` (690px); indexes use `--site-index` (1000px).
- `site.css`: site shell, navigation and homepage. Navigation breakpoints retain the P1 layout fixes.
- `content.css`: body typography, semantic Markdown elements and base collection rows. The 767px breakpoint changes reading type sizes; wide document tables, code and diagrams keep their own containers.
- `catalog.css`: index headers and collection/project layout, including the single-column 639px layout.
- `gesture-content.css`: gesture-era controls, hover motion and surface treatment; do not add body typography overrides here.
- `reading-rail.css`: the only owner of Reading Rail geometry and document edge spacing, including the 959px mobile boundary and low-height landscape spacing.
- `InlineSearch.vue`: search layout, result typography and visible-viewport sizing. `site.css` only hides neighboring navigation while search is open.
- `ArticleHeader.vue`: optional article metadata layout. Its native details remain available to keyboard users and are expanded by the existing longform exporter.

Change the owning rule instead of appending a later override. Preserve necessary article/document/index differences. Verify 320, 390, 844, 1024 and 1440px in both themes, and verify real keyboard/zoom behavior separately from viewport emulation.
