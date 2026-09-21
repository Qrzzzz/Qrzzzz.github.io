<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { readingGesture } from "./gestureGeometry.mjs";

const svg = ref<SVGSVGElement>();
const ink = ref<SVGPathElement>();
let observer: ResizeObserver | undefined;
let content: HTMLElement | null = null;
let frame = 0, ready = false, disposed = false;
let measuredWidth = 0, measuredHeight = 0;

function sync() {
  if (!ready || !svg.value || !ink.value || !content) return;
  const host = svg.value.parentElement!;
  const body = content.getBoundingClientRect();
  const parent = host.getBoundingClientRect();
  const style = getComputedStyle(svg.value);
  const width = parseFloat(style.width);
  const gap = parseFloat(style.getPropertyValue("--reading-rail-gap"));
  const offset = parseFloat(style.getPropertyValue("--reading-rail-offset"));
  const height = body.height;
  if (!height || !width) return;
  svg.value.style.top = `${body.top - parent.top}px`;
  svg.value.style.left = `${body.left - parent.left - gap - width + offset}px`;
  svg.value.style.height = `${height}px`;
  if (width !== measuredWidth || height !== measuredHeight) {
    svg.value.setAttribute("viewBox", `0 0 ${width} ${height}`);
    ink.value.setAttribute("d", readingGesture(height, width));
    measuredWidth = width;
    measuredHeight = height;
  }
  const atEnd = window.scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
  const position = atEnd ? height : Math.max(0, Math.min(height, innerHeight * .88 - body.top));
  // Track the live reading coordinate in both scroll directions. No easing or catch-up frames.
  svg.value.style.clipPath = `inset(0 0 ${Math.max(0, height - position)}px 0)`;
  svg.value.setAttribute("data-progress", Math.min(1, position / height).toFixed(4));
  svg.value.style.visibility = "visible";
}
function visibility() { if (!document.hidden) sync(); }
onMounted(async () => {
  await nextTick();
  if (disposed) return;
  content = svg.value?.parentElement?.querySelector<HTMLElement>(".main") ?? null;
  // VitePress restores scroll in nextTick, and hash targets in the next frame.
  // Initialize after both so the rail starts at the restored live reading coordinate.
  frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => {
      ready = true;
      sync();
      observer = new ResizeObserver(sync);
      if (content) observer.observe(content);
      if (svg.value?.parentElement) observer.observe(svg.value.parentElement);
    });
  });
  window.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync);
  window.addEventListener("hashchange", sync);
  window.addEventListener("pageshow", sync);
  document.addEventListener("visibilitychange", visibility);
});
onBeforeUnmount(() => {
  disposed = true;
  cancelAnimationFrame(frame);
  observer?.disconnect();
  window.removeEventListener("scroll", sync);
  window.removeEventListener("resize", sync);
  window.removeEventListener("hashchange", sync);
  window.removeEventListener("pageshow", sync);
  document.removeEventListener("visibilitychange", visibility);
});
</script>

<template>
  <svg ref="svg" class="reading-rail" aria-hidden="true"><path ref="ink" /></svg>
</template>
