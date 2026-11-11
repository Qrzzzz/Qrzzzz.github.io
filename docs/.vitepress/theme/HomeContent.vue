<script setup lang="ts">
import SiteIcon from "./SiteIcon.vue";
import { withBase, useRouter } from "vitepress";
import { onBeforeUnmount, ref } from "vue";
import { data as libraryItems } from "../content/library.data";
import { PROJECTS } from "../content/projects.mjs";
import HomePoetry from "./HomePoetry.vue";
import VariableProximity from "./effects/VariableProximity.vue";

const router = useRouter();
const activating = ref<string | null>(null);
let navigationTimer: ReturnType<typeof setTimeout> | undefined;
const prefetched = new Set<string>();

function prefetchEntry(event: Event) {
  const href = (event.currentTarget as HTMLAnchorElement).href;
  if (prefetched.has(href)) return;
  prefetched.add(href);
  // Use the same asset map as VitePress, including its current page hashes.
  const path = new URL(href).pathname.replace(/\/$/, "/index").slice(1).replaceAll("/", "_") + ".md";
  const hash = (window as Window & { __VP_HASH_MAP__?: Record<string, string> }).__VP_HASH_MAP__?.[path];
  if (!hash) return;
  const link = document.createElement("link");
  link.rel = "modulepreload";
  link.href = `/assets/${path}.${hash}.js`;
  document.head.append(link);
}

// The explicit _self targets keep VitePress capture navigation from preceding this handler.
function activateEntry(event: MouseEvent, entry: string) {
  const link = event.currentTarget as HTMLAnchorElement;
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
      link.hasAttribute("download") || (link.target && link.target !== "_self") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  event.preventDefault();
  event.stopPropagation();
  prefetchEntry(event);
  if (activating.value) return;
  activating.value = entry;
  navigationTimer = setTimeout(() => { void router.go(link.href); }, 480);
}

onBeforeUnmount(() => clearTimeout(navigationTimer));
</script>

<template>
  <div class="home-page">
    <h1 class="visually-hidden">Cherry Chu</h1>
    <section class="home-composition" aria-label="Poetry, library and projects">
      <nav class="home-actions" aria-label="Primary destinations">
        <a class="home-entry home-entry--library" target="_self" :href="withBase('/library/')" :class="{ 'is-activating': activating === 'library' }" @pointerenter="prefetchEntry" @focus="prefetchEntry" @touchstart.passive="prefetchEntry" @click="activateEntry($event, 'library')">
          <span class="home-entry__name"><VariableProximity label="Library" :disabled="activating !== null" /></span>
          <span class="home-entry__count">{{ libraryItems.length }}</span>
          <SiteIcon name="arrow-right" class="home-entry__arrow" />
        </a>
        <a class="home-entry home-entry--projects" target="_self" :href="withBase('/projects/')" :class="{ 'is-activating': activating === 'projects' }" @pointerenter="prefetchEntry" @focus="prefetchEntry" @touchstart.passive="prefetchEntry" @click="activateEntry($event, 'projects')">
          <span class="home-entry__name"><VariableProximity label="Projects" :disabled="activating !== null" /></span>
          <span class="home-entry__count">{{ PROJECTS.length }}</span>
          <SiteIcon name="arrow-right" class="home-entry__arrow" />
        </a>
      </nav>
      <HomePoetry />
    </section>
    <footer class="home-colophon">
      <a href="https://github.com/Qrzzzz" target="_blank" rel="noopener noreferrer">GitHub <SiteIcon name="arrow-up-right" /></a>
      <a :href="withBase('/docs/')">Docs <SiteIcon name="arrow-up-right" /></a>
    </footer>
  </div>
</template>
