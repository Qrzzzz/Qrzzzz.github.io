<script setup lang="ts">
import { withBase } from "vitepress";
</script>

<template>
  <main class="site-not-found" aria-labelledby="not-found-title">
    <p class="site-not-found__eyebrow">ERROR / PAGE NOT FOUND</p>
    <h1 id="not-found-title" class="visually-hidden">404 · Page not found</h1>
    <div class="site-not-found__visual">
      <svg class="site-not-found__gesture" viewBox="0 0 700 280" aria-hidden="true"><path d="M-40 95C210-40 440 50 350 184C280 292 95 214 160 131C237 29 420 288 735 247" /></svg>
      <span aria-hidden="true">404</span>
    </div>
    <div class="site-not-found__footer">
      <p>This page does not exist, or it has moved to a new location.</p>
      <a :href="withBase('/')">Return home <span aria-hidden="true">↗</span></a>
    </div>
  </main>
</template>

<style scoped>
.site-not-found {
  display: grid;
  width: min(100% - 48px, var(--site-max));
  min-height: calc(100svh - var(--site-nav-height));
  margin: 0 auto;
  padding: clamp(72px, 10vw, 128px) 0 72px;
  color: var(--site-text);
}

.site-not-found__eyebrow {
  align-self: start;
  margin: 0;
  color: var(--site-text-muted);
  font-family: var(--site-font-sans);
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.08em;
}

.site-not-found__visual {
  position: relative;
  display: flex;
  align-items: center;
  align-self: center;
  min-width: 0;
  color: var(--site-text);
  min-height: 280px;
  font-size: clamp(90px, 16vw, 170px);
  font-weight: 400;
  letter-spacing: -.07em;
}

.site-not-found__gesture { position: absolute; inset: 0; width: 100%; height: 100%; fill: none; stroke: var(--site-accent); stroke-width: 2; pointer-events: none; }
.site-not-found__visual > span { position: relative; margin-left: 18%; }

.site-not-found__footer {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 32px;
  align-self: end;
  padding-top: 28px;
  border-top: 1px solid var(--site-line);
}

.site-not-found__footer p {
  max-width: 34rem;
  margin: 0;
  color: var(--site-text-muted);
  font-size: 15px;
  line-height: 1.7;
}

.site-not-found__footer a {
  display: inline-flex;
  gap: 10px;
  min-height: 44px;
  align-items: center;
  border-bottom: 1px solid var(--site-line-strong);
  color: var(--site-text);
  font-size: 14px;
  font-weight: 670;
  text-decoration: none;
  white-space: nowrap;
}

.site-not-found__footer a:hover {
  border-color: var(--site-accent);
  color: var(--site-accent);
}

@media (max-width: 640px) {
  .site-not-found {
    width: min(100% - 32px, var(--site-max));
    padding-top: 56px;
  }

  .site-not-found__footer {
    display: grid;
    align-items: start;
  }
}
</style>
