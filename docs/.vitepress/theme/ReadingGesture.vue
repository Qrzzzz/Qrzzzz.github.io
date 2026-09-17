<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useData } from "vitepress";
import { readingGesture } from "./gestureGeometry.mjs";

const svg = ref<SVGSVGElement>();
const ink = ref<SVGPathElement>();
const { page } = useData();
let frame = 0, observer: ResizeObserver | undefined, media: MediaQueryList | undefined;
let height = 0, length = 0, current = 0, target = 0, last = 0, disposed = false;

function draw(time: number) {
  frame = 0;
  const dt = Math.min(40, last ? time - last : 16);
  last = time;
  current += (target - current) * (1 - Math.exp(-dt / 85));
  if (Math.abs(target - current) < .0001) { current = target; last = 0; }
  else schedule();
  if (ink.value) ink.value.style.strokeDashoffset = `${length * (1 - current)}`;
  svg.value?.setAttribute("data-progress", current.toFixed(4));
}
function schedule() {
  if (!frame && !disposed && !document.hidden) frame = requestAnimationFrame(draw);
}
function scroll() {
  if (!svg.value || !height) return;
  const top = svg.value.getBoundingClientRect().top + window.scrollY;
  const range = document.documentElement.scrollHeight - window.innerHeight;
  // The tip stays just ahead of the reader, following normal document scroll.
  target = media?.matches || window.scrollY >= range - 2 ? 1 : Math.min(1, Math.max(0, (window.scrollY + window.innerHeight * .88 - top) / height));
  if (media?.matches) current = target;
  schedule();
}
function measure() {
  if (!svg.value || !ink.value) return;
  const r = svg.value.getBoundingClientRect();
  height = r.height;
  svg.value.setAttribute("viewBox", `0 0 ${r.width} ${height}`);
  ink.value.setAttribute("d", readingGesture(height, r.width));
  length = ink.value.getTotalLength();
  ink.value.style.strokeDasharray = `${length}`;
  scroll();
  current = target;
  ink.value.style.strokeDashoffset = `${length * (1 - current)}`;
}
function visibility() {
  if (document.hidden) { cancelAnimationFrame(frame); frame = last = 0; }
  else measure();
}
onMounted(() => {
  media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", measure);
  observer = new ResizeObserver(measure);
  if (svg.value) observer.observe(svg.value);
  window.addEventListener("scroll", scroll, { passive: true });
  document.addEventListener("visibilitychange", visibility);
  measure();
});
watch(() => page.value.relativePath, () => nextTick(measure));
onBeforeUnmount(() => {
  disposed = true;
  cancelAnimationFrame(frame);
  observer?.disconnect();
  media?.removeEventListener("change", measure);
  window.removeEventListener("scroll", scroll);
  document.removeEventListener("visibilitychange", visibility);
});
</script>

<template>
  <svg ref="svg" class="reading-gesture" aria-hidden="true"><path ref="ink" /></svg>
</template>
