<script setup lang="ts">
import SiteIcon from "./SiteIcon.vue";
import { withBase } from "vitepress";
import HomePoetry from "./HomePoetry.vue";
import collection from "./homePoems.json";
import { loadingPoems } from "./loadingPoems.mjs";

const poems = [...loadingPoems, ...collection.items];
</script>

<template>
  <main class="site-not-found" aria-labelledby="not-found-title" lang="en">
    <div class="site-not-found__message">
      <p class="site-not-found__eyebrow">A WRONG TURN</p>
      <div class="site-not-found__visual" aria-hidden="true">
        <span>404</span>
        <svg viewBox="0 0 440 240" class="site-not-found__gesture">
          <path d="M-15 172C77 112 118 194 205 150C284 110 211 43 173 107C132 178 310 216 455 151" />
        </svg>
      </div>
      <h1 id="not-found-title">Page not found.</h1>
      <p class="site-not-found__description">The link may have changed, or the page may no longer be here.</p>
      <nav class="site-not-found__links" aria-label="Find your way">
        <a :href="withBase('/')">Return home <SiteIcon name="arrow-up-right" /></a>
        <a :href="withBase('/random')">Read something random <SiteIcon name="arrow-up-right" /></a>
      </nav>
    </div>

    <aside class="site-not-found__reading" aria-label="Poetry">
      <p class="site-not-found__eyebrow">A POEM FOR THE DETOUR</p>
      <HomePoetry :poems="poems" label="A poem for the detour" />
    </aside>
  </main>
</template>

<style scoped>
.site-not-found {
  display: grid;
  grid-template-columns: minmax(0, .85fr) minmax(0, 1fr);
  align-items: center;
  gap: clamp(56px, 8vw, 128px);
  width: min(100% - 96px, 1160px);
  min-height: calc(100svh - var(--site-nav-height));
  margin: 0 auto;
  padding: clamp(56px, 7vw, 104px) 0;
  color: var(--site-text);
}
.site-not-found__message,
.site-not-found__reading { min-width: 0; }
.site-not-found__eyebrow { margin: 0; color: var(--site-text-muted); font-family: var(--site-font-sans); font-size: 10px; font-weight: 400; letter-spacing: .13em; line-height: 1.7; }
.site-not-found__visual { position: relative; width: min(100%, 440px); margin: 24px 0 32px; padding: 10px 0 22px; }
.site-not-found__visual > span { display: block; font-family: "Newsreader", var(--site-font-reading); font-size: clamp(140px, 17vw, 224px); font-weight: 400; line-height: .9; letter-spacing: -.07em; }
.site-not-found__gesture { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; fill: none; stroke: var(--site-accent); stroke-width: 1.3; stroke-linecap: round; vector-effect: non-scaling-stroke; pointer-events: none; }
h1 { margin: 0; font-family: "Newsreader", var(--site-font-reading); font-size: clamp(30px, 3.2vw, 42px); font-weight: 400; letter-spacing: -.025em; line-height: 1.2; }
.site-not-found__description { max-width: 28ch; margin: 18px 0 24px; color: var(--site-text-muted); font-size: 14px; line-height: 1.8; }
.site-not-found__links { display: flex; flex-wrap: wrap; gap: 4px 24px; }
.site-not-found__links a { display: inline-flex; align-items: center; gap: 10px; min-height: 44px; border-bottom: 1px solid var(--site-line-strong); color: var(--site-text); font-size: 12px; text-decoration: none; transition: color 160ms ease, border-color 160ms ease; }
.site-not-found__links a:hover, .site-not-found__links a:focus-visible { color: var(--site-link); border-color: var(--site-link); }
.site-not-found__reading { display: flex; flex-direction: column; justify-content: center; align-self: stretch; padding-left: clamp(32px, 4vw, 64px); border-left: 1px solid var(--site-line); }
.site-not-found__reading :deep(.home-poetry) { position: relative; inset: auto; min-height: 360px; padding-top: 36px; }
.site-not-found__reading :deep(.home-poem) { font-size: clamp(26px, 2.5vw, 34px); line-height: 1.65; }
.site-not-found__reading :deep(.home-poem:lang(en)) { font-size: clamp(32px, 3vw, 42px); line-height: 1.35; }

@media (max-width: 767.98px) {
  .site-not-found { grid-template-columns: minmax(0, 1fr); gap: 48px; width: calc(100% - 48px); min-height: 0; padding: 40px 0 56px; }
  .site-not-found__visual { max-width: 320px; margin: 16px 0 24px; }
  .site-not-found__visual > span { font-size: clamp(128px, 28vw, 176px); }
  .site-not-found__description { max-width: 36ch; margin-bottom: 16px; }
  .site-not-found__reading { border-left: 0; border-top: 1px solid var(--site-line); padding: 28px 0 0; }
  .site-not-found__reading :deep(.home-poetry) { min-height: 0; padding-top: 28px; }
  .site-not-found__reading :deep(.home-poem) { font-size: 25px; }
  .site-not-found__reading :deep(.home-poem:lang(en)) { font-size: 32px; }
}
@media (max-width: 359px) {
  .site-not-found { width: calc(100% - 40px); }
  .site-not-found__links { column-gap: 18px; }
  .site-not-found__reading :deep(.home-poem) { font-size: 23px; }
  .site-not-found__reading :deep(.home-poem:lang(en)) { font-size: 29px; }
}
</style>
