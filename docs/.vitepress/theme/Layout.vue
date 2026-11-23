<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useData, useRouter } from "vitepress";
import { createNavigationAccessibility } from "./navigationAccessibility";
import { createTopNavigationMarker } from "./topNavigationMarker";
import { createHeadingMarker } from "./effects/headingMarker";
import { createRandomFeedback } from "./effects/randomFeedback";
import DefaultTheme from "vitepress/theme-without-fonts";
import BackToTop from "./BackToTop.vue";
import HomeContent from "./HomeContent.vue";
import InlineSearch from "./InlineSearch.vue";
import VariableProximity from "./effects/VariableProximity.vue";
import NavActions from "./NavActions.vue";
import NotFound from "./NotFound.vue";
import SiteLoading from "./SiteLoading.vue";
import { prefetchPage } from "./prefetchPage";

const { Layout } = DefaultTheme;
const { frontmatter, isDark, page } = useData();
const router = useRouter();
const HomeAsciiTrail = defineAsyncComponent(() => import("./HomeAsciiTrail.vue"));
const clientReady = ref(false);

type PageKind =
  | "not-found"
  | "home"
  | "article"
  | "excerpt"
  | "project"
  | "document"
  | "index"
  | "general";

const pageKind = computed<PageKind>(() => {
  if (page.value.isNotFound) return "not-found";
  const relativePath = page.value.relativePath.replace(/\\/g, "/");

  if (frontmatter.value.layout === "home" || relativePath === "index.md") {
    return "home";
  }

  if (frontmatter.value.pageType === "index") return "index";

  if (relativePath.startsWith("notes/")) {
    return "article";
  }

  if (relativePath.startsWith("excerpts/")) {
    return "excerpt";
  }

  if (
    relativePath.startsWith("guide/") ||
    /^projects\/[^/]+\/docs(?:\/|$)/.test(relativePath)
  ) {
    return "document";
  }

  if (relativePath.startsWith("projects/")) {
    return "project";
  }

  return "general";
});

const pageLanguage = computed(() => {
  if (page.value.isNotFound) return "en";
  const lang = frontmatter.value.lang;
  return typeof lang === "string" && /^[a-z]{2,3}(?:-[a-z0-9]+)*$/i.test(lang)
    ? lang
    : "zh-CN";
});

function syncDocumentMetadata() {
  const themeColor = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"]'
  );

  themeColor?.setAttribute("content", isDark.value ? "#151d37" : "#eef2f3");
  document.documentElement.lang = pageLanguage.value;
}

const navigationAccessibility = createNavigationAccessibility();
const topNavigationMarker = createTopNavigationMarker();
const headingMarker = createHeadingMarker();
const randomFeedback = createRandomFeedback();
let excerptTurn: { path: string; direction: number } | undefined;
let excerptAnimation: Animation | undefined;

function captureExcerptTurn(event: MouseEvent) {
  if (event.button || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
  excerptTurn = undefined;
  // VitePress intercepts internal links at window capture before this handler.
  if (pageKind.value !== "excerpt") return;
  const link = event.target instanceof Element
    ? event.target.closest<HTMLAnchorElement>(".VPDocFooter a.pager-link")
    : null;
  if (!link || (link.target && link.target !== "_self")) return;
  excerptTurn = { path: link.pathname.replace(/\.html$/, ""), direction: link.classList.contains("next") ? 1 : -1 };
}

function animateExcerptTurn(to: string, hadLoading: boolean) {
  // VitePress can report a superseded navigation before the active one settles.
  const normalize = (path: string) => path.replace(/\.html$/, "");
  if (normalize(new URL(to, location.href).pathname) !== normalize(router.route.path)) return;
  excerptAnimation?.cancel();
  const turn = excerptTurn;
  excerptTurn = undefined;
  if (!turn || pageKind.value !== "excerpt" || turn.path !== router.route.path.replace(/\.html$/, "")) return;
  if (hadLoading || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const distance = matchMedia("(max-width: 680px)").matches ? 6 : 12;
  excerptAnimation = document.querySelector(".excerpt-entry")?.animate([
    { opacity: .35, transform: `translateX(${turn.direction * distance}px)` },
    { opacity: 1, transform: "translateX(0)" }
  ], { duration: 200, easing: "ease-out" });
}

function clearExcerptTurn() { excerptTurn = undefined; }

onMounted(() => {
  window.addEventListener("popstate", clearExcerptTurn);
  document.addEventListener("pointerover", prefetchPage, { passive: true });
  document.addEventListener("focusin", prefetchPage);
  document.addEventListener("touchstart", prefetchPage, { passive: true });
  clientReady.value = true;
  syncDocumentMetadata();
  nextTick(syncDocumentMetadata);
  navigationAccessibility.mount();
  topNavigationMarker.mount();
  headingMarker.mount();
  randomFeedback.mount();
});
watch([isDark, pageLanguage], syncDocumentMetadata, { flush: "sync" });
watch(() => page.value.relativePath, () => nextTick(() => {
  syncDocumentMetadata();
  navigationAccessibility.sync();
  topNavigationMarker.sync();
  headingMarker.sync();
}), { flush: "post" });
onBeforeUnmount(() => {
  window.removeEventListener("popstate", clearExcerptTurn);
  excerptAnimation?.cancel();
  document.removeEventListener("pointerover", prefetchPage);
  document.removeEventListener("focusin", prefetchPage);
  document.removeEventListener("touchstart", prefetchPage);
  navigationAccessibility.destroy();
  topNavigationMarker.destroy();
  headingMarker.destroy();
  randomFeedback.destroy();
});
</script>

<template>
  <div
    class="site-layout"
    :data-page-kind="pageKind"
    :data-page-language="pageLanguage"
    @click.capture="captureExcerptTurn"
  >
    <SiteLoading @route-ready="animateExcerptTurn" />
    <HomeAsciiTrail v-if="clientReady && pageKind === 'home'" />

    <Layout>
      <template #nav-bar-title-after>
        <VariableProximity label="Cherry Chu" :radius="90" />
      </template>
      <template #nav-bar-content-before>
        <InlineSearch />
      </template>
      <template #nav-bar-content-after>
        <NavActions />
      </template>
      <template #doc-bottom>
        <BackToTop />
      </template>
      <template #home-hero-before>
        <HomeContent />
      </template>
      <template #not-found>
        <NotFound />
      </template>
    </Layout>
  </div>
</template>
