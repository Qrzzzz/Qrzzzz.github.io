<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { createClickSparkRuntime } from "./clickSparkRuntime.mjs";

const canvasElement = ref<HTMLCanvasElement | null>(null);
let runtime: ReturnType<typeof createClickSparkRuntime> | undefined;

onMounted(() => {
  const canvas = canvasElement.value;
  if (!canvas) return;

  runtime = createClickSparkRuntime({ canvas, window });
  runtime.mount();
});

onBeforeUnmount(() => {
  runtime?.destroy();
  runtime = undefined;
});
</script>

<template>
  <canvas
    ref="canvasElement"
    class="click-spark-canvas"
    width="1"
    height="1"
    aria-hidden="true"
  />
</template>

<style scoped>
.click-spark-canvas {
  --click-spark-primary: #3156a3;
  --click-spark-secondary: #3f4442;

  position: fixed;
  z-index: 10000;
  inset: 0;
  display: block;
  pointer-events: none;
  user-select: none;
}

:global(.dark) .click-spark-canvas {
  --click-spark-primary: #a8b8ff;
  --click-spark-secondary: #f2f0ea;
}

@media (pointer: coarse), (prefers-reduced-motion: reduce) {
  .click-spark-canvas {
    display: none;
  }
}
</style>
