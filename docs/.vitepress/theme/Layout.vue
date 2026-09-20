<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useData } from "vitepress";
import { createNavigationAccessibility } from "./navigationAccessibility";
import { createTopNavigationMarker } from "./topNavigationMarker";
import DefaultTheme from "vitepress/theme";
import BackToTop from "./BackToTop.vue";
import HomeContent from "./HomeContent.vue";
import InlineSearch from "./InlineSearch.vue";
import NavActions from "./NavActions.vue";
import NotFound from "./NotFound.vue";
import ShareImage from "./ShareImage.vue";
import ReadingRail from "./ReadingRail.vue";

const { Layout } = DefaultTheme;
const { frontmatter, isDark, page } = useData();
const HomeAsciiTrail = defineAsyncComponent(() => import("./HomeAsciiTrail.vue"));
const clientReady = ref(false);

type PageKind =
  | "home"
  | "article"
  | "excerpt"
  | "project"
  | "document"
  | "index"
  | "general";

const pageKind = computed<PageKind>(() => {
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

const isShareablePage = computed(() => {
  const relativePath = page.value.relativePath.replace(/\\/g, "/");
  return (
    (pageKind.value === "article" || pageKind.value === "excerpt") &&
    !relativePath.endsWith("index.md")
  );
});

const pageLanguage = computed(() => {
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
onMounted(() => {
  clientReady.value = true;
  syncDocumentMetadata();
  nextTick(syncDocumentMetadata);
  navigationAccessibility.mount();
  topNavigationMarker.mount();
});
watch([isDark, pageLanguage], syncDocumentMetadata, { flush: "sync" });
watch(() => page.value.relativePath, () => nextTick(() => {
  syncDocumentMetadata();
  navigationAccessibility.sync();
  topNavigationMarker.sync();
}), { flush: "post" });
onBeforeUnmount(() => {
  navigationAccessibility.destroy();
  topNavigationMarker.destroy();
});
</script>

<template>
  <div
    class="site-layout"
    :data-page-kind="pageKind"
    :data-page-language="pageLanguage"
  >
    <HomeAsciiTrail v-if="clientReady && pageKind === 'home'" />

    <Layout>
      <template #nav-bar-content-before>
        <InlineSearch />
      </template>
      <template #nav-bar-content-after>
        <NavActions />
      </template>
      <template #doc-footer-before>
        <ShareImage
          v-if="isShareablePage && (pageKind === 'article' || pageKind === 'excerpt')"
          :page-kind="pageKind"
        />
      </template>
      <template #doc-bottom>
        <BackToTop />
      </template>
      <template #doc-top>
        <ReadingRail :key="page.relativePath" />
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
