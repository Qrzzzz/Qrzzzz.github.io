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

// The explicit _self targets keep VitePress capture navigation from preceding this handler.
function activateEntry(event: MouseEvent, entry: string) {
  const link = event.currentTarget as HTMLAnchorElement;
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
      link.hasAttribute("download") || (link.target && link.target !== "_self") ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  event.preventDefault();
  event.stopPropagation();
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
        <a class="home-entry home-entry--library" target="_self" :href="withBase('/library/')" :class="{ 'is-activating': activating === 'library' }" @click="activateEntry($event, 'library')">
          <span class="home-entry__name"><VariableProximity label="Library" :disabled="activating !== null" /></span>
          <span class="home-entry__count">{{ libraryItems.length }}</span>
          <SiteIcon name="arrow-right" class="home-entry__arrow" />
        </a>
        <a class="home-entry home-entry--projects" target="_self" :href="withBase('/projects/')" :class="{ 'is-activating': activating === 'projects' }" @click="activateEntry($event, 'projects')">
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
