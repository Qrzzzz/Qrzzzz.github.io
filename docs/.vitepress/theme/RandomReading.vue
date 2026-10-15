<script lang="ts">
let previousReadingUrl = "";
</script>

<script setup lang="ts">
import SiteIcon from "./SiteIcon.vue";
import { nextTick, onMounted, ref } from "vue";
import { useRouter, withBase } from "vitepress";
import { data as libraryItems } from "../content/library.data";
import { pickRandomReadingUrl, randomReadingUrls } from "../content/randomReading.mjs";

const router = useRouter();
const destination = ref(randomReadingUrls(libraryItems)[0]);
onMounted(async () => {
  // Let VitePress finish canonicalizing /random before replacing this history entry.
  await nextTick();
  const url = pickRandomReadingUrl(libraryItems, previousReadingUrl);
  if (!url) return;
  previousReadingUrl = url;
  destination.value = url;
  const target = withBase(url);
  window.history.replaceState(window.history.state, "", target);
  void router.go(target);
});
</script>

<template>
  <main class="random-reading" lang="en">
    <slot />
    <a v-if="destination" :href="withBase(destination)">Read a page <SiteIcon name="arrow-up-right" /></a>
    <a :href="withBase('/library/')">Browse the Library</a>
  </main>
</template>

<style scoped>
.random-reading { width: min(100% - 48px, var(--site-reading)); margin: 0 auto; padding: 96px 0; }
:deep(h1) { font-family: var(--site-font-reading); font-size: 36px; font-weight: 400; }
:deep(.lead) { margin-top: 24px; color: var(--site-text-muted); }
a { display: inline-flex; align-items: center; min-height: 44px; margin: 24px 28px 0 0; color: var(--site-link); }
</style>
