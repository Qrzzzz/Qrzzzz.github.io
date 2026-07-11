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
let searchFrame = 0;
let searchObserver: MutationObserver | undefined;
let searchResultObserver: MutationObserver | undefined;
let decoratedSearchShell: HTMLElement | null = null;
let finePointerQuery: MediaQueryList | undefined;
let reducedMotionQuery: MediaQueryList | undefined;

function createSearchContext(shell: HTMLElement) {
  if (shell.querySelector(".site-search-context")) return;

  searchResultObserver?.disconnect();
  decoratedSearchShell = shell;

  const context = document.createElement("aside");
  context.className = "site-search-context";
  context.setAttribute("aria-hidden", "true");

  const brand = document.createElement("span");
  brand.className = "site-search-context__brand";
  brand.textContent = "Q";

  const copy = document.createElement("div");
  copy.className = "site-search-context__copy";

  const kicker = document.createElement("p");
  kicker.textContent = "SEARCH / 全站检索";

  const title = document.createElement("strong");
  title.textContent = "从一处，抵达所有内容。";

  const description = document.createElement("span");
  description.textContent = "文档、文章与项目，被放在同一条搜索路径里。";

  copy.append(kicker, title, description);

  const scope = document.createElement("div");
  scope.className = "site-search-context__scope";
  [
    ["D", "文档"],
    ["N", "文章"],
    ["P", "项目"]
  ].forEach(([initial, label]) => {
    const item = document.createElement("span");
    const icon = document.createElement("i");
    icon.textContent = initial;
    item.append(icon, label);
    scope.append(item);
  });

  const status = document.createElement("p");
  status.className = "site-search-context__status";
  const statusDot = document.createElement("i");
  const statusText = document.createElement("span");
  statusText.textContent = "输入关键词开始检索";
  status.append(statusDot, statusText);

  context.append(brand, copy, scope, status);
  shell.prepend(context);

  const input = shell.querySelector<HTMLInputElement>(".search-input");
  const results = shell.querySelector<HTMLElement>(".results");

  const updateState = () => {
    const query = input?.value.trim() ?? "";
    const count = results?.querySelectorAll(":scope > li:not(.no-results)").length ?? 0;
    shell.dataset.searchState = query ? (count ? "results" : "empty") : "idle";

    statusText.textContent = !query
      ? "输入关键词开始检索"
      : count
        ? `已找到 ${count} 条相关内容`
        : "暂时没有匹配内容";
  };

  input?.addEventListener("input", updateState);
  if (results) {
    searchResultObserver = new MutationObserver(updateState);
    searchResultObserver.observe(results, { childList: true, subtree: true });
  }
  updateState();
}

function scheduleSearchDecoration() {
  if (searchFrame) return;

  searchFrame = window.requestAnimationFrame(() => {
    const shell = document.querySelector<HTMLElement>(".VPLocalSearchBox .shell");
    if (shell) {
      createSearchContext(shell);
    } else if (decoratedSearchShell) {
      searchResultObserver?.disconnect();
      decoratedSearchShell = null;
    }
    searchFrame = 0;
  });
}

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
  searchObserver = new MutationObserver(scheduleSearchDecoration);
  searchObserver.observe(document.body, { childList: true, subtree: true });
  scheduleSearchDecoration();
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
  searchObserver?.disconnect();
  searchResultObserver?.disconnect();
  if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
  if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
  if (searchFrame) window.cancelAnimationFrame(searchFrame);
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
