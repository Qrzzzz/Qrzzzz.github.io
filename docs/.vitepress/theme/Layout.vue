<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, watch } from "vue";
import { useData } from "vitepress";
import DefaultTheme from "vitepress/theme";
import BackToTop from "./BackToTop.vue";
import HomeContent from "./HomeContent.vue";
import InlineSearch from "./InlineSearch.vue";
import NotFound from "./NotFound.vue";
import OutlineToggle from "./OutlineToggle.vue";
import StaggeredMenu from "./StaggeredMenu.vue";
import TargetCursor from "./TargetCursor.vue";
import { useLineOutline } from "./useLineOutline";

const { Layout } = DefaultTheme;
const { frontmatter, isDark, page } = useData();

useLineOutline();

type PageKind = "home" | "article" | "project" | "document" | "general";

const pageKind = computed<PageKind>(() => {
  const relativePath = page.value.relativePath.replace(/\\/g, "/");

  if (frontmatter.value.layout === "home" || relativePath === "index.md") {
    return "home";
  }

  if (relativePath.startsWith("notes/")) {
    return "article";
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

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(",");

type InertState = {
  inert: boolean;
  ariaHidden: string | null;
};

let accessibilityObserver: MutationObserver | undefined;
let mobileSidebarQuery: MediaQueryList | undefined;
let activeNavScreen: HTMLElement | undefined;
let navScreenTrigger: HTMLButtonElement | undefined;
let focusFrame = 0;
const navBackgroundState = new Map<HTMLElement, InertState>();
const languageParts = new Set<HTMLElement>();
const shellLabelState = new Map<
  HTMLElement,
  { text?: string | null; ariaLabel?: string | null }
>();

function setElementInert(element: HTMLElement, inert: boolean) {
  element.inert = inert;
  if (inert) element.setAttribute("aria-hidden", "true");
  else element.removeAttribute("aria-hidden");
}

function syncSidebarAccessibility() {
  const sidebar = document.querySelector<HTMLElement>(".VPSidebar");
  if (!sidebar || activeNavScreen) return;

  const hidden = Boolean(mobileSidebarQuery?.matches && !sidebar.classList.contains("open"));
  setElementInert(sidebar, hidden);
}

function setShellLanguageParts() {
  for (const element of languageParts) {
    if (!element.isConnected) languageParts.delete(element);
  }
  for (const element of shellLabelState.keys()) {
    if (!element.isConnected) shellLabelState.delete(element);
  }

  document
    .querySelectorAll<HTMLElement>(
      ".VPSkipLink, .VPNav, .VPLocalNav, .VPSidebar, .VPFooter, .docs-breadcrumb"
    )
    .forEach((element) => {
      element.lang = "zh-CN";
      languageParts.add(element);
    });

  const textLabels = [
    ["#main-nav-aria-label", "主导航"],
    ["#sidebar-aria-label", "侧栏导航"],
    ["#doc-footer-aria-label", "翻页导航"]
  ] as const;
  for (const [selector, text] of textLabels) {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) continue;
    if (!shellLabelState.has(element)) {
      shellLabelState.set(element, {
        text: element.textContent
      });
    }
    if (element.textContent !== text) element.textContent = text;
  }

  const hamburger = document.querySelector<HTMLButtonElement>(".VPNavBarHamburger");
  if (hamburger) {
    if (!shellLabelState.has(hamburger)) {
      shellLabelState.set(hamburger, {
        ariaLabel: hamburger.getAttribute("aria-label")
      });
    }
    hamburger.setAttribute("aria-label", "移动导航");
  }
}

function navFocusables(screen: HTMLElement, trigger: HTMLButtonElement) {
  return [trigger, ...screen.querySelectorAll<HTMLElement>(focusableSelector)].filter(
    (element) =>
      !element.inert &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.getClientRects().length > 0
  );
}

function handleNavScreenKeydown(event: KeyboardEvent) {
  if (!activeNavScreen || !navScreenTrigger) return;

  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    navScreenTrigger.click();
    navScreenTrigger.focus();
    return;
  }

  if (event.key !== "Tab") return;
  const focusables = navFocusables(activeNavScreen, navScreenTrigger);
  if (!focusables.length) return;
  const currentIndex = focusables.indexOf(document.activeElement as HTMLElement);
  const nextIndex = event.shiftKey
    ? currentIndex <= 0
      ? focusables.length - 1
      : currentIndex - 1
    : currentIndex < 0 || currentIndex === focusables.length - 1
      ? 0
      : currentIndex + 1;

  event.preventDefault();
  focusables[nextIndex].focus();
}

function activateNavScreen(screen: HTMLElement, trigger: HTMLButtonElement) {
  activeNavScreen = screen;
  navScreenTrigger = trigger;
  screen.setAttribute("role", "dialog");
  screen.setAttribute("aria-modal", "true");
  screen.setAttribute("aria-label", "移动导航");
  screen.lang = "zh-CN";

  document
    .querySelectorAll<HTMLElement>(
      [
        ".site-layout .Layout > :not(.VPNav)",
        ".VPNavBarTitle",
        ".InlineSiteSearch",
        ".VPNavBarSearch",
        ".VPNavBarMenu",
        ".VPNavBarTranslations",
        ".VPNavBarAppearance",
        ".VPNavBarSocialLinks",
        ".VPNavBarExtra"
      ].join(",")
    )
    .forEach((element) => {
      navBackgroundState.set(element, {
        inert: element.inert,
        ariaHidden: element.getAttribute("aria-hidden")
      });
      setElementInert(element, true);
    });

  document.addEventListener("keydown", handleNavScreenKeydown, true);
  focusFrame = window.requestAnimationFrame(() => {
    focusFrame = 0;
    const target = navFocusables(screen, trigger).find((element) => element !== trigger) ?? screen;
    if (target === screen) screen.tabIndex = -1;
    target.focus();
  });
}

function deactivateNavScreen(returnFocus = true) {
  if (!activeNavScreen) return;
  if (focusFrame) window.cancelAnimationFrame(focusFrame);
  focusFrame = 0;
  document.removeEventListener("keydown", handleNavScreenKeydown, true);

  for (const [element, state] of navBackgroundState) {
    element.inert = state.inert;
    if (state.ariaHidden === null) element.removeAttribute("aria-hidden");
    else element.setAttribute("aria-hidden", state.ariaHidden);
  }
  navBackgroundState.clear();

  activeNavScreen.removeAttribute("role");
  activeNavScreen.removeAttribute("aria-modal");
  activeNavScreen.removeAttribute("aria-label");
  activeNavScreen.removeAttribute("tabindex");
  const trigger = navScreenTrigger;
  activeNavScreen = undefined;
  navScreenTrigger = undefined;
  syncSidebarAccessibility();
  if (returnFocus) trigger?.focus();
}

function syncNavigationAccessibility() {
  setShellLanguageParts();
  syncSidebarAccessibility();

  const screen = document.querySelector<HTMLElement>(".VPNavScreen");
  const trigger = document.querySelector<HTMLButtonElement>(".VPNavBarHamburger");
  if (screen && trigger && !activeNavScreen) activateNavScreen(screen, trigger);
  else if (!screen && activeNavScreen) deactivateNavScreen();
}

onMounted(() => {
  syncDocumentMetadata();
  nextTick(syncDocumentMetadata);
  mobileSidebarQuery = window.matchMedia("(max-width: 959px)");
  mobileSidebarQuery.addEventListener("change", syncNavigationAccessibility);
  accessibilityObserver = new MutationObserver(syncNavigationAccessibility);
  accessibilityObserver.observe(document.querySelector(".site-layout") ?? document.body, {
    attributes: true,
    attributeFilter: ["class"],
    childList: true,
    subtree: true
  });
  syncNavigationAccessibility();
});
watch([isDark, pageLanguage], syncDocumentMetadata, { flush: "sync" });
watch(
  () => page.value.relativePath,
  () =>
    nextTick(() => {
      syncDocumentMetadata();
      syncNavigationAccessibility();
    }),
  { flush: "post" }
);
onBeforeUnmount(() => {
  accessibilityObserver?.disconnect();
  mobileSidebarQuery?.removeEventListener("change", syncNavigationAccessibility);
  deactivateNavScreen(false);
  const sidebar = document.querySelector<HTMLElement>(".VPSidebar");
  if (sidebar) setElementInert(sidebar, false);
  for (const element of languageParts) {
    if (element.lang === "zh-CN") element.removeAttribute("lang");
  }
  languageParts.clear();
  for (const [element, state] of shellLabelState) {
    if ("text" in state) element.textContent = state.text ?? "";
    if ("ariaLabel" in state) {
      if (state.ariaLabel === null) element.removeAttribute("aria-label");
      else element.setAttribute("aria-label", state.ariaLabel ?? "");
    }
  }
  shellLabelState.clear();
});
</script>

<template>
  <TargetCursor />

  <div
    class="site-layout"
    :data-page-kind="pageKind"
    :data-page-language="pageLanguage"
  >
    <Layout>
      <template #nav-bar-content-before>
        <InlineSearch />
      </template>
      <template #nav-bar-content-after>
        <StaggeredMenu />
      </template>
      <template #aside-outline-before>
        <OutlineToggle />
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
