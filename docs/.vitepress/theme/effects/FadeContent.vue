<script setup lang="ts">
// Basic once-only opacity reveal adapted from Vue Bits FadeContent; SSR remains visible.
import { onBeforeUnmount, onMounted, ref } from "vue";
withDefaults(defineProps<{ as?: string }>(), { as: "div" });
const root = ref<HTMLElement>();
let observer: IntersectionObserver | undefined;
let animation: Animation | undefined;
let preference: MediaQueryList | undefined;
let frame = 0;
function cancel() { animation?.cancel(); }
function reveal() {
  observer?.disconnect();
  if (!root.value || preference?.matches || !root.value.animate) return;
  const timing = getComputedStyle(root.value).getPropertyValue("--site-motion-fade").trim();
  const value = parseFloat(timing);
  const duration = Number.isFinite(value) ? value * (timing.endsWith("ms") ? 1 : timing.endsWith("s") ? 1000 : 1) : 220;
  animation = root.value.animate([{ opacity: 0 }, { opacity: 1 }], { duration, easing: "cubic-bezier(.2, .7, .25, 1)" });
}
function ready() {
  if (!root.value || preference?.matches) return;
  if (!("IntersectionObserver" in window)) return;
  observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) reveal(); }, { threshold: .1 });
  observer.observe(root.value);
}
function afterBoot() { frame = requestAnimationFrame(ready); }
onMounted(() => {
  preference = matchMedia("(prefers-reduced-motion: reduce)");
  preference.addEventListener("change", cancel);
  if (document.documentElement.classList.contains("site-boot-loading")) document.addEventListener("site-loading-finished", afterBoot, { once: true });
  else afterBoot();
});
onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame);
  observer?.disconnect();
  cancel();
  document.removeEventListener("site-loading-finished", afterBoot);
  preference?.removeEventListener("change", cancel);
});
</script>

<template><component :is="as" ref="root" data-fade-content><slot /></component></template>
