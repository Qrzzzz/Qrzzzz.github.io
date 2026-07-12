<script setup lang="ts">
import { withBase } from "vitepress";
import FuzzyText from "./FuzzyText.vue";
</script>

<template>
  <main class="site-not-found" aria-labelledby="not-found-title">
    <p class="site-not-found__eyebrow">ERROR / PAGE NOT FOUND</p>
    <h1 id="not-found-title" class="visually-hidden">404 · 页面未找到</h1>
    <div class="site-not-found__visual">
      <FuzzyText
        text="404"
        :font-weight="800"
        :base-intensity="0.2"
        :hover-intensity="0.65"
        :fuzz-range="34"
        :fps="45"
        :transition-duration="160"
      />
    </div>
    <div class="site-not-found__footer">
      <p>这个页面不存在，或已被移动到新的位置。</p>
      <a :href="withBase('/')">返回首页 <span aria-hidden="true">↗</span></a>
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
  font-family: var(--site-font-mono);
  font-size: 12px;
  font-weight: 650;
  letter-spacing: 0.08em;
}

.site-not-found__visual {
  display: flex;
  align-items: center;
  align-self: center;
  min-width: 0;
  color: var(--site-text);
}

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
