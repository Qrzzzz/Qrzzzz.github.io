<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { withBase } from "vitepress";
import { data as libraryItems } from "../content/library.data";
import { PROJECTS } from "../content/projects.mjs";
import { DESKTOP_GESTURE, MOBILE_GESTURE, gesturePath } from "./gestureGeometry.mjs";
import { createGestureRuntime } from "./gestureRuntime.mjs";

const stage = ref<HTMLElement>();
const svg = ref<SVGSVGElement>();
const field = ref<SVGPathElement>();
const ink = ref<SVGPathElement>();
const signal = ref<SVGPathElement>();
const hit = ref<SVGPathElement>();
let runtime: ReturnType<typeof createGestureRuntime> | undefined;
onMounted(() => {
  runtime = createGestureRuntime({
    host: stage.value!,
    svg: svg.value!,
    ink: ink.value!,
    hit: hit.value!,
    layers: [field.value!, signal.value!],
    window,
    document
  });
});
onBeforeUnmount(() => runtime?.destroy());
</script>

<template>
  <div class="home-page">
    <h1 class="visually-hidden">Cherry Chu</h1>
    <section ref="stage" class="gesture-stage" aria-label="Library and projects">
      <svg class="gesture-fallback gesture-fallback--desktop" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">
        <path :d="gesturePath(DESKTOP_GESTURE)" />
      </svg>
      <svg class="gesture-fallback gesture-fallback--mobile" viewBox="0 0 390 575" preserveAspectRatio="none" aria-hidden="true">
        <path :d="gesturePath(MOBILE_GESTURE)" />
      </svg>
      <svg ref="svg" class="home-gesture" aria-hidden="true">
        <defs>
          <linearGradient id="home-gesture-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" class="home-gesture__stop home-gesture__stop--edge" />
            <stop offset=".2" class="home-gesture__stop" />
            <stop offset=".58" class="home-gesture__stop home-gesture__stop--bright" />
            <stop offset=".86" class="home-gesture__stop" />
            <stop offset="1" class="home-gesture__stop home-gesture__stop--edge" />
          </linearGradient>
        </defs>
        <path ref="field" class="home-gesture__field" />
        <path ref="ink" class="home-gesture__ink" />
        <path ref="signal" class="home-gesture__signal" />
        <path ref="hit" class="home-gesture__hit" />
      </svg>
      <nav class="home-actions" aria-label="Primary destinations">
        <a class="home-entry home-entry--library" :href="withBase('/library/')">
          <span class="home-entry__name">Library</span>
          <span class="home-entry__count">{{ libraryItems.length }}</span>
          <svg class="home-entry__arrow" viewBox="0 0 42 24" aria-hidden="true"><path d="M1 12h36M29 4l8 8-8 8" /></svg>
        </a>
        <a class="home-entry home-entry--projects" :href="withBase('/projects/')">
          <span class="home-entry__name">Projects</span>
          <span class="home-entry__count">{{ PROJECTS.length }}</span>
          <svg class="home-entry__arrow" viewBox="0 0 42 24" aria-hidden="true"><path d="M1 12h36M29 4l8 8-8 8" /></svg>
        </a>
      </nav>
    </section>
    <footer class="home-colophon">
      <a href="https://github.com/Qrzzzz" target="_blank" rel="noopener noreferrer">GitHub <span aria-hidden="true">↗</span></a>
      <a :href="withBase('/docs/')">Docs <span aria-hidden="true">↗</span></a>
    </footer>
  </div>
</template>
