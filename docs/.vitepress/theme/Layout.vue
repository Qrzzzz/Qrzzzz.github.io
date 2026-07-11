<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute } from "vitepress";
import HomeContent from "./HomeContent.vue";
import HomeOrbit from "./HomeOrbit.vue";

const { Layout } = DefaultTheme;
const route = useRoute();
const spotlightElement = ref<HTMLElement | null>(null);

let pointerFrame = 0;
let scrollFrame = 0;
let finePointerQuery: MediaQueryList | undefined;
let reducedMotionQuery: MediaQueryList | undefined;

function updateScrollProgress() {
  const available = document.documentElement.scrollHeight - window.innerHeight;
  const progress = available > 0 ? Math.min(window.scrollY / available, 1) : 0;
  document.documentElement.style.setProperty("--page-progress", String(progress));
}

function handleScroll() {
  if (scrollFrame) return;

  scrollFrame = window.requestAnimationFrame(() => {
    updateScrollProgress();
    scrollFrame = 0;
  });
}

function handlePointerMove(event: PointerEvent) {
  if (pointerFrame) return;
  if (!finePointerQuery?.matches || reducedMotionQuery?.matches) return;

  const x = event.clientX;
  const y = event.clientY;
  const target = event.target as HTMLElement | null;

  pointerFrame = window.requestAnimationFrame(() => {
    spotlightElement.value?.style.setProperty("--spotlight-x", `${x}px`);
    spotlightElement.value?.style.setProperty("--spotlight-y", `${y}px`);

    const card = target?.closest<HTMLElement>(
      ".VPFeature, .home-entry, .home-principles, .project-showcase"
    );

    if (card) {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--card-x", `${x - rect.left}px`);
      card.style.setProperty("--card-y", `${y - rect.top}px`);
    }

    pointerFrame = 0;
  });
}

onMounted(() => {
  finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  updateScrollProgress();
  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", handleScroll, { passive: true });
  window.addEventListener("pointermove", handlePointerMove, { passive: true });
});

watch(
  () => route.path,
  async () => {
    await nextTick();
    updateScrollProgress();
  }
);

onBeforeUnmount(() => {
  window.removeEventListener("scroll", handleScroll);
  window.removeEventListener("resize", handleScroll);
  window.removeEventListener("pointermove", handlePointerMove);
  if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
  if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
});
</script>

<template>
  <div class="site-atmosphere" aria-hidden="true">
    <span class="site-atmosphere__wash site-atmosphere__wash--violet" />
    <span class="site-atmosphere__wash site-atmosphere__wash--aqua" />
    <span class="site-atmosphere__wash site-atmosphere__wash--peach" />
    <span class="site-atmosphere__grid" />
    <span ref="spotlightElement" class="site-atmosphere__spotlight" />
  </div>

  <div class="site-scroll-progress" aria-hidden="true" />

  <Layout>
    <template #home-hero-info-before>
      <p class="home-kicker">
        <span class="home-kicker__dot" />
        <span>Qrzzzz · 公开文档站</span>
      </p>
    </template>

    <template #home-hero-actions-after>
      <div class="home-utility" aria-label="站点提示">
        <span><kbd>Ctrl</kbd><em>/</em><kbd>⌘</kbd><kbd>K</kbd> 搜索全站</span>
        <i aria-hidden="true" />
        <span>文档 · 文章 · 项目</span>
      </div>
    </template>

    <template #home-hero-image>
      <HomeOrbit />
    </template>

    <template #home-features-after>
      <HomeContent />
    </template>
  </Layout>
</template>
