<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { createTargetCursorRuntime } from "./targetCursorRuntime.mjs";

const cursorElement = ref<HTMLElement | null>(null);
let runtime: ReturnType<typeof createTargetCursorRuntime> | undefined;

onMounted(() => {
  const cursor = cursorElement.value;
  if (!cursor) return;

  runtime = createTargetCursorRuntime({ cursor, window, document });
  runtime.mount();
});

onBeforeUnmount(() => {
  runtime?.destroy();
  runtime = undefined;
});
</script>

<template>
  <div
    ref="cursorElement"
    class="target-cursor"
    data-target-cursor
    aria-hidden="true"
  >
    <span class="target-cursor__dot" data-target-cursor-dot />
    <span class="target-cursor__corner target-cursor__corner--tl" data-target-cursor-corner />
    <span class="target-cursor__corner target-cursor__corner--tr" data-target-cursor-corner />
    <span class="target-cursor__corner target-cursor__corner--br" data-target-cursor-corner />
    <span class="target-cursor__corner target-cursor__corner--bl" data-target-cursor-corner />
  </div>
</template>

<style>
.target-cursor {
  --target-cursor-color: #fff;
  --target-cursor-target-color: #9db4ff;

  position: fixed;
  z-index: 10000;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
  user-select: none;
  mix-blend-mode: difference;
  will-change: transform, opacity;
}

.target-cursor__dot {
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--target-cursor-color);
  transform: translate(-50%, -50%);
  transition: width 150ms ease, height 150ms ease, background-color 150ms ease;
}

.target-cursor__corner {
  position: absolute;
  top: 0;
  left: 0;
  width: 12px;
  height: 12px;
  border: 3px solid var(--target-cursor-color);
  transition: border-color 150ms ease;
  will-change: transform;
}

.target-cursor__corner--tl {
  border-right: 0;
  border-bottom: 0;
}

.target-cursor__corner--tr {
  border-bottom: 0;
  border-left: 0;
}

.target-cursor__corner--br {
  border-top: 0;
  border-left: 0;
}

.target-cursor__corner--bl {
  border-top: 0;
  border-right: 0;
}

.target-cursor.is-targeting .target-cursor__dot,
.target-cursor.is-pressed .target-cursor__dot {
  width: 3px;
  height: 3px;
  background: var(--target-cursor-target-color);
}

.target-cursor.is-targeting .target-cursor__corner {
  border-color: var(--target-cursor-target-color);
}

@media (hover: hover) and (pointer: fine) {
  html.has-target-cursor,
  html.has-target-cursor * {
    cursor: none !important;
  }
}

@media (pointer: coarse) {
  .target-cursor {
    display: none;
  }
}
</style>
