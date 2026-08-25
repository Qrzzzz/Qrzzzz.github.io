<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useData } from "vitepress";
import { createHomeAsciiTrailRuntime } from "./homeAsciiTrailRuntime.mjs";

const canvas = ref<HTMLCanvasElement | null>(null);
const { isDark } = useData();
let runtime: ReturnType<typeof createHomeAsciiTrailRuntime> | undefined;

function colorFromTokens(element: HTMLElement) {
  const styles = window.getComputedStyle(element);
  return styles.getPropertyValue("--site-text").trim() || "#181818";
}

function syncColor() {
  const element = canvas.value;
  if (element) runtime?.setColor(colorFromTokens(element));
}

onMounted(() => {
  const element = canvas.value;
  if (!element) return;

  try {
    runtime = createHomeAsciiTrailRuntime({
      canvas: element,
      window,
      document,
      color: colorFromTokens(element)
    });
    runtime.mount();
  } catch {
    element.dataset.asciiTrailState = "unavailable";
  }
});

watch(isDark, () => nextTick(syncColor), { flush: "post" });

onBeforeUnmount(() => {
  runtime?.destroy();
  runtime = undefined;
});
</script>

<template>
  <canvas
    ref="canvas"
    class="home-ascii-trail"
    data-home-ascii-trail
    aria-hidden="true"
  />
</template>

<style scoped>
.home-ascii-trail {
  position: fixed;
  z-index: 1;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  opacity: 0.58;
  pointer-events: none;
  user-select: none;
}

.dark .home-ascii-trail {
  opacity: 0.64;
}

@media (hover: none), (pointer: coarse), (prefers-reduced-motion: reduce) {
  .home-ascii-trail {
    display: none;
  }
}
</style>
