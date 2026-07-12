<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useData, useRoute } from "vitepress";

const { isDark, page } = useData();
const route = useRoute();

const items = [
  { label: "项目", link: "/projects/" },
  { label: "文档", link: "/guide/" },
  { label: "文章", link: "/notes/" },
  { label: "提示词合集", link: "/prompt-collection/" }
];

const open = ref(false);
const toggleElement = ref<HTMLButtonElement | null>(null);
const panelElement = ref<HTMLElement | null>(null);
const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  '[tabindex]:not([tabindex="-1"])'
].join(",");

type InertState = {
  inert: boolean;
  ariaHidden: string | null;
};

const backgroundState = new Map<HTMLElement, InertState>();
let previousBodyOverflow = "";
let themeTransitioning = false;

type ThemeViewTransition = {
  finished: Promise<void>;
};

type ThemeTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ThemeViewTransition;
};

function normalizedPath(path: string) {
  const normalized = path.split(/[?#]/, 1)[0].replace(/\.html$/, "").replace(/\/$/, "");
  return normalized || "/";
}

function isActive(link: string) {
  const current = normalizedPath(route.path);
  const target = normalizedPath(link);
  return current === target || (target !== "/" && current.startsWith(`${target}/`));
}

function setBackgroundInert(inert: boolean) {
  const elements = document.querySelectorAll<HTMLElement>(
    [
      ".site-layout .Layout > :not(.VPNav)",
      ".VPNavBarTitle",
      ".InlineSiteSearch"
    ].join(",")
  );

  if (inert) {
    elements.forEach((element) => {
      backgroundState.set(element, {
        inert: element.inert,
        ariaHidden: element.getAttribute("aria-hidden")
      });
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    });
    return;
  }

  for (const [element, state] of backgroundState) {
    element.inert = state.inert;
    if (state.ariaHidden === null) element.removeAttribute("aria-hidden");
    else element.setAttribute("aria-hidden", state.ariaHidden);
  }
  backgroundState.clear();
}

function menuFocusables() {
  const panel = panelElement.value;
  const toggle = toggleElement.value;
  if (!panel || !toggle) return [];

  return [toggle, ...panel.querySelectorAll<HTMLElement>(focusableSelector)].filter(
    (element) => !element.inert && element.getClientRects().length > 0
  );
}

function handleKeydown(event: KeyboardEvent) {
  if (!open.value) return;

  if (event.key === "Escape") {
    event.preventDefault();
    closeMenu();
    return;
  }

  if (event.key !== "Tab") return;
  const focusables = menuFocusables();
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

async function openMenu() {
  if (open.value) return;
  open.value = true;
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  document.body.classList.add("staggered-menu-open");
  setBackgroundInert(true);
  document.addEventListener("keydown", handleKeydown, true);
  await nextTick();
  panelElement.value?.querySelector<HTMLElement>(focusableSelector)?.focus();
}

function closeMenu(returnFocus = true) {
  if (!open.value && !backgroundState.size) return;
  open.value = false;
  document.removeEventListener("keydown", handleKeydown, true);
  document.body.style.overflow = previousBodyOverflow;
  document.body.classList.remove("staggered-menu-open");
  setBackgroundInert(false);
  if (returnFocus) nextTick(() => toggleElement.value?.focus());
}

function toggleMenu() {
  if (open.value) closeMenu();
  else openMenu();
}

async function toggleTheme() {
  if (themeTransitioning) return;

  const applyTheme = () => {
    isDark.value = !isDark.value;
  };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    applyTheme();
    return;
  }

  themeTransitioning = true;
  try {
    const transitionDocument = document as ThemeTransitionDocument;
    if (transitionDocument.startViewTransition) {
      await transitionDocument.startViewTransition(applyTheme).finished;
      return;
    }

    document.documentElement.classList.add("theme-fade-fallback");
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    applyTheme();
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        document.documentElement.classList.remove("theme-fade-fallback");
        window.setTimeout(resolve, 180);
      });
    });
  } finally {
    themeTransitioning = false;
  }
}

watch(
  () => page.value.relativePath,
  () => closeMenu(false)
);

onBeforeUnmount(() => closeMenu(false));
</script>

<template>
  <div class="staggered-menu-control" :data-open="open || undefined">
    <button
      ref="toggleElement"
      class="sm-toggle"
      type="button"
      aria-controls="site-staggered-menu"
      :aria-expanded="open"
      :aria-label="open ? '关闭导航菜单' : '打开导航菜单'"
      @click="toggleMenu"
    >
      <span class="sm-toggle-text-wrap" aria-hidden="true">
        <span class="sm-toggle-text-inner">
          <span>菜单</span>
          <span>关闭</span>
        </span>
      </span>
      <span class="sm-icon" aria-hidden="true">
        <span class="sm-icon-line" />
        <span class="sm-icon-line" />
      </span>
    </button>
  </div>

  <Teleport to="body">
    <div
      class="staggered-menu-overlay"
      :data-open="open || undefined"
      :aria-hidden="!open"
    >
      <button
        class="sm-backdrop"
        type="button"
        tabindex="-1"
        aria-label="关闭导航菜单"
        @click="closeMenu()"
      />

      <div class="sm-prelayers" aria-hidden="true">
        <span class="sm-prelayer sm-prelayer--spark" />
        <span class="sm-prelayer sm-prelayer--accent" />
      </div>

      <aside
        id="site-staggered-menu"
        ref="panelElement"
        class="staggered-menu-panel"
        role="dialog"
        aria-modal="true"
        aria-label="站点导航"
        :inert="!open"
      >
        <div class="sm-panel-inner">
          <header class="sm-panel-header">
            <p>Navigation</p>
            <span aria-hidden="true">01—04</span>
          </header>

          <nav aria-label="站点导航">
            <ol class="sm-panel-list">
              <li
                v-for="(item, index) in items"
                :key="item.link"
                class="sm-panel-item-wrap"
                :style="{ '--sm-item-index': index }"
              >
                <a
                  class="sm-panel-item"
                  :class="{ active: isActive(item.link) }"
                  :href="item.link"
                  :aria-current="isActive(item.link) ? 'page' : undefined"
                  @click="closeMenu(false)"
                >
                  <span class="sm-panel-item-label">{{ item.label }}</span>
                </a>
              </li>
            </ol>
          </nav>

          <div class="sm-panel-meta">
            <p class="sm-panel-meta-title">站点设置</p>
            <div class="sm-panel-meta-links">
              <button type="button" @click="toggleTheme">
                切换主题
              </button>
              <a href="https://github.com/Qrzzzz">GitHub</a>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<style>
.staggered-menu-control {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
}

.sm-toggle {
  display: inline-flex;
  min-width: 86px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 0 15px;
  background: transparent;
  color: var(--site-text);
  font: inherit;
  font-size: 13px;
  font-weight: 680;
  line-height: 1;
  transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease;
}

.sm-toggle:hover,
.staggered-menu-control[data-open] .sm-toggle {
  border-color: color-mix(in srgb, var(--site-accent) 42%, var(--site-line));
  background: var(--site-accent-soft);
  color: var(--site-accent);
}

.sm-toggle-text-wrap {
  width: 2em;
  height: 1em;
  overflow: hidden;
  white-space: nowrap;
}

.sm-toggle-text-inner {
  display: flex;
  flex-direction: column;
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.sm-toggle-text-inner > span {
  display: block;
  height: 1em;
  line-height: 1;
}

.staggered-menu-control[data-open] .sm-toggle-text-inner {
  transform: translateY(-1em);
}

.sm-icon {
  position: relative;
  width: 14px;
  height: 14px;
  flex: 0 0 14px;
}

.sm-icon-line {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 14px;
  height: 2px;
  border-radius: 2px;
  background: currentColor;
  transform: translate(-50%, -50%);
  transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.sm-icon-line:last-child {
  transform: translate(-50%, -50%) rotate(90deg);
}

.staggered-menu-control[data-open] .sm-icon-line:first-child {
  transform: translate(-50%, -50%) rotate(45deg);
}

.staggered-menu-control[data-open] .sm-icon-line:last-child {
  transform: translate(-50%, -50%) rotate(-45deg);
}

.staggered-menu-overlay {
  position: fixed;
  z-index: 90;
  inset: var(--site-nav-height) 0 0;
  overflow: hidden;
  pointer-events: none;
}

.staggered-menu-overlay[data-open] {
  pointer-events: auto;
}

.sm-backdrop {
  position: absolute;
  z-index: 0;
  inset: 0;
  border: 0;
  background: color-mix(in srgb, var(--site-canvas) 58%, transparent);
  opacity: 0;
  backdrop-filter: blur(0);
  transition: opacity 260ms ease, backdrop-filter 260ms ease;
}

.staggered-menu-overlay[data-open] .sm-backdrop {
  opacity: 1;
  backdrop-filter: blur(7px);
}

.sm-prelayers,
.staggered-menu-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: clamp(320px, 34vw, 460px);
  height: 100%;
}

.sm-prelayers {
  z-index: 1;
  pointer-events: none;
}

.sm-prelayer {
  position: absolute;
  inset: 0;
  opacity: 0;
  transform: translateX(104%);
  transition:
    opacity 180ms ease,
    transform 540ms cubic-bezier(0.22, 1, 0.36, 1);
}

.sm-prelayer--spark {
  background: var(--site-menu-prelayer);
  transition-delay: 100ms;
}

.sm-prelayer--accent {
  background: var(--site-accent);
  transition-delay: 50ms;
}

.staggered-menu-overlay[data-open] .sm-prelayer--spark {
  opacity: 1;
  transform: translateX(0);
  transition-delay: 0ms;
}

.staggered-menu-overlay[data-open] .sm-prelayer--accent {
  opacity: 1;
  transform: translateX(0);
  transition-delay: 50ms;
}

.staggered-menu-panel {
  z-index: 2;
  overflow-y: auto;
  border-left: 1px solid var(--site-line);
  padding: clamp(32px, 5vh, 52px) clamp(28px, 3.5vw, 44px) 30px;
  background: var(--site-surface);
  color: var(--site-text);
  transform: translateX(104%);
  transition: transform 540ms cubic-bezier(0.22, 1, 0.36, 1);
}

.staggered-menu-overlay[data-open] .staggered-menu-panel {
  transform: translateX(0);
  transition-delay: 100ms;
}

.sm-panel-inner {
  display: flex;
  min-height: 100%;
  flex-direction: column;
}

.sm-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: clamp(28px, 5vh, 48px);
  color: var(--site-text-faint);
  font-family: var(--site-font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sm-panel-header p {
  margin: 0;
}

.sm-panel-list {
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: sm-item;
}

.sm-panel-item-wrap {
  overflow: hidden;
  border-bottom: 1px solid var(--site-line);
}

.sm-panel-item {
  position: relative;
  display: flex;
  min-height: 58px;
  align-items: center;
  padding-right: 48px;
  color: var(--site-text);
  font-size: clamp(26px, 2.5vw, 34px);
  font-weight: 660;
  letter-spacing: -0.035em;
  line-height: 1.08;
  text-decoration: none;
  opacity: 0;
  transform: translateY(92%) rotate(1.25deg);
  transform-origin: 0 100%;
  transition:
    color 180ms ease,
    opacity 480ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 480ms cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: 0ms;
}

.staggered-menu-overlay[data-open] .sm-panel-item {
  opacity: 1;
  transform: translateY(0) rotate(0);
  transition-delay: calc(190ms + var(--sm-item-index) * 48ms);
}

.sm-panel-item::after {
  position: absolute;
  top: 13px;
  right: 2px;
  color: var(--site-accent);
  content: "0" counter(sm-item);
  counter-increment: sm-item;
  font-family: var(--site-font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
}

.sm-panel-item:hover,
.sm-panel-item.active {
  color: var(--site-accent);
}

.sm-panel-item-label {
  display: inline-block;
  transition: transform 180ms ease;
}

.sm-panel-item:hover .sm-panel-item-label {
  transform: translateX(5px);
}

.sm-panel-meta {
  margin-top: auto;
  padding-top: 40px;
}

.sm-panel-meta-title {
  margin: 0 0 14px;
  color: var(--site-accent);
  font-family: var(--site-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.sm-panel-meta-links {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 24px;
}

.sm-panel-meta-links a,
.sm-panel-meta-links button {
  min-height: 44px;
  border: 0;
  border-bottom: 1px solid var(--site-line-strong);
  padding: 0;
  background: transparent;
  color: var(--site-text);
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  text-decoration: none;
  transition: border-color 160ms ease, color 160ms ease;
}

.sm-panel-meta-links a:hover,
.sm-panel-meta-links button:hover {
  border-color: var(--site-accent);
  color: var(--site-accent);
}

@media (max-width: 767px) {
  .sm-toggle {
    min-width: 44px;
    width: 44px;
    padding: 0;
  }

  .sm-toggle-text-wrap {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .sm-prelayers,
  .staggered-menu-panel {
    width: 100%;
  }

  .staggered-menu-overlay[data-open] .sm-prelayer--spark,
  .staggered-menu-overlay[data-open] .sm-prelayer--accent {
    transform: translateX(0);
  }

  .staggered-menu-panel {
    border-left: 0;
    padding: 30px 24px 26px;
  }

  .sm-panel-header {
    margin-bottom: 32px;
  }

  .sm-panel-item {
    min-height: 58px;
    font-size: clamp(29px, 8.8vw, 37px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sm-toggle-text-inner,
  .sm-icon-line,
  .sm-backdrop,
  .sm-prelayer,
  .staggered-menu-panel,
  .sm-panel-item,
  .sm-panel-item-label {
    transition-duration: 0.01ms !important;
    transition-delay: 0ms !important;
  }
}
</style>
