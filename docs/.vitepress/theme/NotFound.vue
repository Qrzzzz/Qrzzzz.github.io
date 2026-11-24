<script setup lang="ts">
import SiteIcon from "./SiteIcon.vue";
import { withBase } from "vitepress";
import HomePoetry from "./HomePoetry.vue";
import FadeContent from "./effects/FadeContent.vue";
import { sitePoems } from "./sitePoems.mjs";
</script>

<template>
  <main class="site-not-found" aria-labelledby="not-found-title" lang="en">
    <FadeContent class="site-not-found__message">
      <div class="site-not-found__visual" aria-hidden="true">
        <span v-for="(digit, index) in '404'" :key="index" class="site-not-found__digit" :data-digit="digit">
          <span class="site-not-found__ink">{{ digit }}</span>
        </span>
      </div>
      <h1 id="not-found-title"><span class="heading-feedback">Page not found.</span></h1>
      <nav class="site-not-found__links" aria-label="Find your way">
        <a :href="withBase('/')">Return home <SiteIcon name="arrow-up-right" /></a>
        <a :href="withBase('/random')">Read something random <SiteIcon name="arrow-up-right" /></a>
      </nav>
    </FadeContent>

    <aside class="site-not-found__reading" aria-label="Poetry">
      <HomePoetry :poems="sitePoems" label="A poem for the detour" />
    </aside>
  </main>
</template>

<style scoped>
.site-not-found {
  display: grid;
  grid-template-columns: minmax(0, .9fr) minmax(0, 1fr);
  align-items: center;
  gap: clamp(64px, 9vw, 144px);
  width: min(100% - 96px, 1160px);
  min-height: calc(100svh - var(--site-nav-height));
  margin: 0 auto;
  padding: clamp(56px, 7vw, 104px) 0;
  color: var(--site-text);
}
.site-not-found__message,
.site-not-found__reading { min-width: 0; }
.site-not-found__visual {
  display: flex;
  width: max-content;
  margin: 0 0 42px;
  margin-inline-start: -.045em;
  font-family: "Newsreader", var(--site-font-reading);
  font-size: clamp(140px, 17vw, 224px);
  font-weight: 400;
  line-height: .9;
  letter-spacing: -.065em;
}
.site-not-found__digit {
  --mask-gutter: .12em;
  position: relative;
  display: block;
  isolation: isolate;
}
.site-not-found__digit:nth-child(1) { transform: translateY(.025em) rotate(-4deg); }
.site-not-found__digit:nth-child(2) { transform: translateY(-.045em) rotate(3deg); }
.site-not-found__digit:nth-child(3) { transform: translateY(.08em) rotate(-2deg); }
.site-not-found__ink { position: relative; z-index: 1; display: block; }
.site-not-found__digit:nth-child(2) {
  --ink-edge: linear-gradient(146deg, #000 59%, #0009 79%, #0005 94%);
  --soft-edge: linear-gradient(146deg, transparent 61%, #000 96%);
}
.site-not-found__digit:nth-child(3) {
  --ink-edge: linear-gradient(222deg, #000 57%, #0009 77%, #0005 94%);
  --soft-edge: linear-gradient(222deg, transparent 59%, #000 94%);
}
.site-not-found__digit:not(:first-child) .site-not-found__ink {
  /* Newsreader ink overhangs the tight advance width. Expand the mask without moving the digit. */
  padding: var(--mask-gutter);
  margin: calc(-1 * var(--mask-gutter));
  mask-image: var(--ink-edge);
}
.site-not-found__digit:not(:first-child)::before,
.site-not-found__digit:not(:first-child)::after {
  content: attr(data-digit);
  position: absolute;
  inset-inline: calc(-1 * var(--mask-gutter));
  padding-inline: var(--mask-gutter);
  color: var(--site-accent);
  pointer-events: none;
}
.site-not-found__digit::before {
  inset-block-start: 0;
  mask-image: var(--soft-edge);
  filter: blur(.023em);
  opacity: .46;
  animation: not-found-edge 6.5s ease-in-out infinite alternate;
}
.site-not-found__digit::after {
  inset-block-start: 100%;
  transform-origin: top;
  /* Only the last strokes of each reflected glyph remain visible. */
  transform: translateY(.2em) scaleY(-.52);
  mask-image: linear-gradient(to bottom, transparent 57%, #000 92%);
  filter: blur(.018em);
  opacity: .18;
  animation: not-found-reflection 6.5s ease-in-out infinite alternate;
}
.site-not-found__digit:nth-child(3)::before,
.site-not-found__digit:nth-child(3)::after { animation-delay: -2s; }
@keyframes not-found-edge {
  from { filter: blur(.01em); opacity: .6; }
  to { filter: blur(.037em); opacity: .34; }
}
@keyframes not-found-reflection {
  from { filter: blur(.008em); opacity: .22; }
  to { filter: blur(.032em); opacity: .1; }
}
h1 { margin: 0; font-family: "Newsreader", var(--site-font-reading); font-size: clamp(30px, 3.2vw, 42px); font-weight: 400; letter-spacing: -.025em; line-height: 1.2; }
.site-not-found__links { display: flex; flex-wrap: wrap; gap: 4px 24px; margin-block-start: 20px; }
.site-not-found__links a { display: inline-flex; align-items: center; gap: 10px; min-height: 44px; border-bottom: 1px solid var(--site-line-strong); color: var(--site-text); font-size: 12px; text-decoration: none; transition: color 160ms ease, border-color 160ms ease; }
.site-not-found__links a:hover, .site-not-found__links a:focus-visible { color: var(--site-link); border-color: var(--site-link); }
@media (min-width: 768px) {
  .site-not-found__links a + a { margin-block-start: 8px; }
}
.site-not-found__reading { display: flex; flex-direction: column; justify-content: center; align-self: stretch; }
.site-not-found__reading :deep(.home-poem) { font-size: clamp(26px, 2.5vw, 34px); line-height: 1.65; }
.site-not-found__reading :deep(.home-poem:lang(en)) { font-size: clamp(32px, 3vw, 42px); line-height: 1.35; }

@media (max-width: 767.98px) {
  .site-not-found { grid-template-columns: minmax(0, 1fr); gap: 64px; width: calc(100% - 48px); min-height: 0; padding: 40px 0 64px; }
  .site-not-found__visual { margin-block: 0 32px; font-size: clamp(128px, 28vw, 176px); }
  .site-not-found__reading { padding: 0; }
  .site-not-found__reading :deep(.home-poem) { font-size: 25px; }
  .site-not-found__reading :deep(.home-poem:lang(en)) { font-size: 32px; }
}
@media (max-width: 359px) {
  .site-not-found { width: calc(100% - 40px); }
  .site-not-found__links { column-gap: 18px; }
  .site-not-found__reading :deep(.home-poem) { font-size: 23px; }
  .site-not-found__reading :deep(.home-poem:lang(en)) { font-size: 29px; }
}
@media (prefers-reduced-motion: reduce) {
  .site-not-found__digit::before, .site-not-found__digit::after { animation: none; }
}
</style>
