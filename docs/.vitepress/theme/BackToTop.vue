<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useData } from "vitepress";

const { page } = useData();
const visible = ref(false);
const progress = ref(0);
let frame = 0;

function updateScrollState() {
  frame = 0;
  const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const threshold = Math.min(760, Math.max(520, window.innerHeight * 0.72));
  visible.value = window.scrollY >= threshold;
  progress.value = Math.min(1, Math.max(0, window.scrollY / scrollRange));
}

function scheduleUpdate() {
  if (frame) return;
  frame = window.requestAnimationFrame(updateScrollState);
}

function focusPageHeading() {
  const heading = document.querySelector<HTMLElement>(".vp-doc h1");
  if (!heading) return;

  const previousTabIndex = heading.getAttribute("tabindex");
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
  heading.addEventListener(
    "blur",
    () => {
      if (previousTabIndex === null) heading.removeAttribute("tabindex");
      else heading.setAttribute("tabindex", previousTabIndex);
    },
    { once: true }
  );
}

function returnToTop() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  focusPageHeading();
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
}

onMounted(() => {
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate, { passive: true });
  updateScrollState();
});

watch(
  () => page.value.relativePath,
  () => nextTick(updateScrollState),
  { flush: "post" }
);

onBeforeUnmount(() => {
  window.removeEventListener("scroll", scheduleUpdate);
  window.removeEventListener("resize", scheduleUpdate);
  if (frame) window.cancelAnimationFrame(frame);
});
</script>

<template>
  <button
    class="back-to-top"
    type="button"
    :class="{ 'is-visible': visible }"
    :disabled="!visible"
    :tabindex="visible ? 0 : -1"
    :aria-hidden="!visible"
    aria-label="回到页面顶部"
    title="回到页面顶部"
    :style="{ '--back-top-progress': `${progress * 100}%` }"
    @click="returnToTop"
  >
    <span class="back-to-top__icon" aria-hidden="true">
      <span />
    </span>
    <span class="back-to-top__label">回到顶部</span>
    <span class="back-to-top__progress" aria-hidden="true">
      {{ Math.round(progress * 100) }}%
    </span>
  </button>
</template>
