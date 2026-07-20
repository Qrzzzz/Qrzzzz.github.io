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
    <span class="target-cursor__reading-line" data-target-cursor-reading-line />
    <span class="target-cursor__corner target-cursor__corner--tl" data-target-cursor-corner />
    <span class="target-cursor__corner target-cursor__corner--tr" data-target-cursor-corner />
    <span class="target-cursor__corner target-cursor__corner--br" data-target-cursor-corner />
    <span class="target-cursor__corner target-cursor__corner--bl" data-target-cursor-corner />
  </div>
</template>

<style>
.target-cursor {
  --target-cursor-color: var(--site-cursor);
  --target-cursor-target-color: color-mix(in srgb, var(--site-cursor) 82%, white);
  --target-cursor-reading-color: color-mix(
    in srgb,
    var(--site-cursor) 68%,
    transparent
  );

  position: fixed;
  z-index: 10000;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
  user-select: none;
  filter: drop-shadow(0 0 5px color-mix(in srgb, var(--site-cursor) 32%, transparent));
  transition: filter 280ms ease;
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
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
  transition:
    width 150ms ease,
    height 150ms ease,
    background-color 150ms ease,
    opacity 180ms ease,
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.target-cursor__reading-line {
  position: absolute;
  top: 0;
  left: 0;
  width: 6px;
  height: 28px;
  border: 1px solid color-mix(in srgb, var(--site-cursor) 46%, transparent);
  border-radius: 999px;
  background: var(--target-cursor-reading-color);
  box-shadow:
    inset 0 0 5px color-mix(in srgb, white 18%, transparent),
    0 0 12px color-mix(in srgb, var(--site-cursor) 28%, transparent);
  opacity: 0;
  transform: translate(-50%, -50%) scale3d(0.72, 0.28, 1);
  transform-origin: center;
  transition:
    opacity 200ms ease,
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: opacity, transform;
}

.target-cursor__corner {
  position: absolute;
  top: 0;
  left: 0;
  width: 12px;
  height: 12px;
  border: 3px solid var(--target-cursor-color);
  opacity: 1;
  transition:
    border-color 150ms ease,
    opacity 220ms ease;
  will-change: transform, opacity;
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

.target-cursor.is-reading {
  filter: drop-shadow(
    0 0 7px color-mix(in srgb, var(--site-cursor) 24%, transparent)
  );
}

.target-cursor.is-reading .target-cursor__dot {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.35);
}

.target-cursor.is-reading .target-cursor__reading-line {
  opacity: 0.78;
  transform: translate(-50%, -50%) scale3d(1, 1, 1);
}

.target-cursor.is-reading .target-cursor__corner {
  opacity: 0;
}

.target-cursor.is-reading.is-pressed .target-cursor__reading-line {
  opacity: 0.92;
  transform: translate(-50%, -50%) scale3d(0.92, 0.88, 1);
}

@media (prefers-reduced-motion: reduce) {
  .target-cursor,
  .target-cursor__dot,
  .target-cursor__reading-line,
  .target-cursor__corner {
    transition-duration: 1ms;
  }
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
