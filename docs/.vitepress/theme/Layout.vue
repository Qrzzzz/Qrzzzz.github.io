<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useData } from "vitepress";
import { createNavigationAccessibility } from "./navigationAccessibility";
import DefaultTheme from "vitepress/theme";
import BackToTop from "./BackToTop.vue";
import HomeContent from "./HomeContent.vue";
import InlineSearch from "./InlineSearch.vue";
import NavActions from "./NavActions.vue";
import NotFound from "./NotFound.vue";
import ShareImage from "./ShareImage.vue";
import TargetCursor from "./TargetCursor.vue";

const { Layout } = DefaultTheme;
const { frontmatter, isDark, page } = useData();
const HomeGrainient = defineAsyncComponent(() => import("./HomeGrainient.vue"));
const HomeAsciiTrail = defineAsyncComponent(() => import("./HomeAsciiTrail.vue"));
const clientReady = ref(false);

type PageKind =
  | "home"
  | "article"
  | "excerpt"
  | "project"
  | "document"
  | "library"
  | "general";

const pageKind = computed<PageKind>(() => {
  const relativePath = page.value.relativePath.replace(/\\/g, "/");

  if (frontmatter.value.layout === "home" || relativePath === "index.md") {
    return "home";
  }

  if (relativePath.startsWith("notes/")) {
    return "article";
  }

  if (relativePath.startsWith("excerpts/")) {
    return "excerpt";
  }

  if (relativePath.startsWith("library/")) {
    return "library";
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

const hasGrainientBackground = computed(
  () => pageKind.value === "home" || pageKind.value === "library"
);

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

  themeColor?.setAttribute("content", isDark.value ? "#111214" : "#F5F4EF");
  document.documentElement.lang = pageLanguage.value;
}

const navigationAccessibility = createNavigationAccessibility();
onMounted(() => {
  clientReady.value = true;
  syncDocumentMetadata();
  nextTick(syncDocumentMetadata);
  navigationAccessibility.mount();
});
watch([isDark, pageLanguage], syncDocumentMetadata, { flush: "sync" });
watch(() => page.value.relativePath, () => nextTick(() => {
  syncDocumentMetadata();
  navigationAccessibility.sync();
}), { flush: "post" });
onBeforeUnmount(() => navigationAccessibility.destroy());
</script>

<template>
  <TargetCursor />

  <div
    class="site-layout"
    :data-page-kind="pageKind"
    :data-page-language="pageLanguage"
  >
    <HomeGrainient v-if="clientReady && hasGrainientBackground" />
    <HomeAsciiTrail v-if="clientReady && pageKind === 'home'" />

    <Layout>
      <template #nav-bar-title-before>
        <span class="site-brand-mark" aria-hidden="true">Q\</span>
      </template>
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
      <template #home-hero-before>
        <HomeContent />
      </template>
      <template #not-found>
        <NotFound />
      </template>
    </Layout>
  </div>
</template>
