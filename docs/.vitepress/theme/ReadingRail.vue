<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useData } from "vitepress";
import { readingGesture } from "./gestureGeometry.mjs";
import { createReadingRailPlan, readingRailPath, READING_RAIL_TIP_RATIO } from "./readingRailGeometry.mjs";

const { page } = useData();
const svg = ref<SVGSVGElement>();
const ink = ref<SVGPathElement>();
let observer: ResizeObserver | undefined;
let content: HTMLElement | null = null;
let frame = 0, ready = false, disposed = false;
let measuredWidth = 0, measuredHeight = 0;
let geometryKey = "", lastPath = "";
let plan: ReturnType<typeof createReadingRailPlan> | undefined;
let reducedMotion: MediaQueryList | undefined;

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
    measuredWidth = width;
    measuredHeight = height;
  }
  const enabled = innerWidth >= 960 && !reducedMotion?.matches;
  const safeTop = Math.max(0, document.querySelector(".VPNav")?.getBoundingClientRect().bottom ?? 64) + 32;
  const key = `${width}:${height}:${innerHeight}:${safeTop}:${enabled}`;
  const geometryChanged = key !== geometryKey;
  if (geometryChanged) {
    plan = enabled ? createReadingRailPlan({ height, width, viewportHeight: innerHeight, safeTop, seed: page.value.relativePath }) : undefined;
    geometryKey = key;
    svg.value.setAttribute("data-knot-count", String(plan?.knots.length ?? 0));
  }
  const atEnd = window.scrollY + innerHeight >= document.documentElement.scrollHeight - 2;
  const position = atEnd ? height : Math.max(0, Math.min(height, innerHeight * READING_RAIL_TIP_RATIO - body.top));
  const path = plan ? readingRailPath(plan, position) : (!geometryChanged && lastPath && ink.value.dataset.mode === "wave" ? lastPath : readingGesture(height, width));
  if (path !== lastPath) { ink.value.setAttribute("d", path); lastPath = path; }
  ink.value.dataset.mode = plan ? "knots" : "wave";
  // Track the live reading coordinate in both scroll directions. No easing or catch-up frames.
  svg.value.style.clipPath = `inset(0 0 ${Math.max(0, height - position)}px 0)`;
  svg.value.setAttribute("data-progress", Math.min(1, position / height).toFixed(4));
  svg.value.style.visibility = "visible";
}
function scheduleSync() {
  if (!ready || disposed || document.hidden || frame) return;
  frame = requestAnimationFrame(() => { frame = 0; sync(); });
}
function visibility() {
  if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
  else scheduleSync();
}
onMounted(async () => {
  await nextTick();
  if (disposed) return;
  content = svg.value?.parentElement?.querySelector<HTMLElement>(".main") ?? null;
  reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotion.addEventListener("change", scheduleSync);
  // VitePress restores scroll in nextTick, and hash targets in the next frame.
  // Initialize after both so the rail starts at the restored live reading coordinate.
  frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => {
      frame = 0;
      ready = true;
      sync();
      observer = new ResizeObserver(scheduleSync);
      if (content) observer.observe(content);
      if (svg.value?.parentElement) observer.observe(svg.value.parentElement);
    });
  });
  window.addEventListener("scroll", scheduleSync, { passive: true });
  window.addEventListener("resize", scheduleSync);
  window.addEventListener("hashchange", scheduleSync);
  window.addEventListener("pageshow", scheduleSync);
  document.addEventListener("visibilitychange", visibility);
});
onBeforeUnmount(() => {
  disposed = true;
  cancelAnimationFrame(frame);
  observer?.disconnect();
  reducedMotion?.removeEventListener("change", scheduleSync);
  window.removeEventListener("scroll", scheduleSync);
  window.removeEventListener("resize", scheduleSync);
  window.removeEventListener("hashchange", scheduleSync);
  window.removeEventListener("pageshow", scheduleSync);
  document.removeEventListener("visibilitychange", visibility);
});
</script>

<template>
  <svg ref="svg" class="reading-rail" aria-hidden="true"><path ref="ink" /></svg>
</template>
