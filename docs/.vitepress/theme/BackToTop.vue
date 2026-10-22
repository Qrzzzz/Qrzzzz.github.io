<script setup lang="ts">
import SiteIcon from "./SiteIcon.vue";
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useData } from "vitepress";

const { page } = useData();
const visible = ref(false);
let frame = 0;

function updateScrollState() {
  frame = 0;
  const threshold = Math.min(760, Math.max(520, window.innerHeight * 0.72));
  visible.value = window.scrollY >= threshold;
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
  const librarySearch = document.querySelector<HTMLInputElement>(".library-search input");
  if (librarySearch) {
    librarySearch.focus({ preventScroll: true });
    librarySearch.scrollIntoView({ block: "center", behavior: "auto" });
    return;
  }
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
    :aria-label="page.relativePath === 'library/index.md' ? 'Back to filters' : 'Back to top'"
    :title="page.relativePath === 'library/index.md' ? 'Back to filters' : 'Back to top'"
    @click="returnToTop"
  >
    <SiteIcon name="arrow-up" class="back-to-top__icon" />
  </button>
</template>
