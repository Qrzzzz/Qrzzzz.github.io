<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from "vue";
import { useData } from "vitepress";
import {
  canAnimateThemeTransition,
  runThemeTransition
} from "./themeTransitionRuntime.mjs";

const { isDark } = useData();
const toggleButton = ref<HTMLButtonElement>();
const switching = ref(false);
let resetTimer = 0;

const toggleLabel = computed(() =>
  isDark.value ? "切换到浅色模式" : "切换到深色模式"
);

async function toggleTheme(event: MouseEvent) {
  if (switching.value) return;
  switching.value = true;
  const targetIsDark = !isDark.value;
  const supportsFade = canAnimateThemeTransition(
    document,
    window,
    toggleButton.value
  );
  if (!supportsFade) document.documentElement.classList.add("theme-is-switching");

  try {
    await runThemeTransition({
      documentObject: document,
      windowObject: window,
      origin: toggleButton.value,
      update: async () => {
        isDark.value = targetIsDark;
        await nextTick();
      }
    });
  } finally {
    window.clearTimeout(resetTimer);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const resetDelay = reducedMotion ? 40 : supportsFade ? 380 : 460;
    resetTimer = window.setTimeout(() => {
      switching.value = false;
      document.documentElement.classList.remove("theme-is-switching");
    }, resetDelay);
  }
}

onBeforeUnmount(() => {
  window.clearTimeout(resetTimer);
  document.documentElement.classList.remove(
    "theme-is-switching",
    "theme-fade-out",
    "theme-fade-in"
  );
});
</script>

<template>
  <div class="NavActions" role="group" aria-label="站点工具">
    <button
      ref="toggleButton"
      type="button"
      class="theme-toggle"
      :class="{ 'is-dark': isDark, 'is-switching': switching }"
      role="switch"
      :aria-label="toggleLabel"
      :aria-checked="isDark"
      :title="toggleLabel"
      @click="toggleTheme"
    >
      <span class="theme-toggle__track" aria-hidden="true">
        <span class="theme-toggle__thumb">
          <span class="theme-toggle__icon">
            <svg class="theme-toggle__sun" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
            <svg class="theme-toggle__moon" viewBox="0 0 24 24">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
            </svg>
          </span>
        </span>
      </span>
    </button>

    <a
      class="nav-github"
      href="https://github.com/Qrzzzz"
      target="_blank"
      rel="noreferrer noopener"
      aria-label="在 GitHub 上查看 Qrzzzz（新窗口打开）"
      title="GitHub"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 2.8a9.2 9.2 0 0 0-2.9 17.9c.5.1.6-.2.6-.4v-1.8c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 0 1.6 1.1 1.6 1.1.9 1.6 2.4 1.1 3 .8.1-.7.4-1.1.7-1.4-2.3-.3-4.6-1.1-4.6-4.6 0-1 .4-1.9 1-2.5-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.2 9.2 0 0 1 4.9 0c1.9-1.3 2.7-1 2.7-1 .5 1.3.2 2.3.1 2.6.6.6 1 1.5 1 2.5 0 3.5-2.4 4.3-4.6 4.6.4.3.7.9.7 1.8v2.6c0 .3.2.5.7.4A9.2 9.2 0 0 0 12 2.8Z" />
      </svg>
    </a>
  </div>
</template>

<style scoped>
.NavActions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: 18px;
}

.theme-toggle,
.nav-github {
  position: relative;
  height: 44px;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  color: var(--site-text-muted);
  transition: color 160ms ease;
}

.nav-github:hover {
  background: transparent;
  color: var(--site-accent);
}

.nav-github::after {
  position: absolute;
  right: 0;
  bottom: 4px;
  left: 0;
  height: 2px;
  background: var(--site-accent);
  content: "";
  opacity: 0;
  transform: scaleX(0);
  transform-origin: left center;
  transition: opacity 160ms ease, transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.nav-github:hover::after,
.nav-github:focus-visible::after {
  opacity: 1;
  transform: scaleX(1);
}

.theme-toggle {
  display: grid;
  width: 44px;
  flex: 0 0 44px;
  place-items: center;
  padding: 0;
  border-radius: 999px;
  cursor: pointer;
}

.theme-toggle__track {
  position: relative;
  display: block;
  width: 40px;
  height: 22px;
  border: 1px solid var(--site-line-strong);
  border-radius: 999px;
  background: color-mix(in srgb, var(--site-text) 8%, transparent);
  transition:
    border-color 250ms ease,
    background-color 250ms ease;
}

.theme-toggle.is-switching .theme-toggle__track {
  animation: theme-toggle-spring 460ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.theme-toggle:hover .theme-toggle__track,
.theme-toggle:focus-visible .theme-toggle__track {
  border-color: var(--site-accent);
}

.theme-toggle__thumb {
  position: absolute;
  top: 1px;
  left: 1px;
  display: block;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--site-surface);
  box-shadow: 0 1px 3px color-mix(in srgb, #111214 20%, transparent);
  color: var(--site-text-muted);
  transform: translateX(0);
  transition:
    color 250ms ease,
    background-color 250ms ease,
    box-shadow 250ms ease,
    transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.theme-toggle.is-dark .theme-toggle__thumb {
  color: var(--site-accent);
  transform: translateX(18px);
}

.theme-toggle__icon {
  position: absolute;
  inset: 3px;
}

.theme-toggle__icon svg {
  position: absolute;
  inset: 0;
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
  transition:
    opacity 180ms ease,
    transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.theme-toggle__sun {
  opacity: 1;
  transform: rotate(0deg) scale(1);
}

.theme-toggle__moon {
  opacity: 0;
  transform: rotate(-45deg) scale(0.5);
}

.theme-toggle.is-dark .theme-toggle__sun {
  opacity: 0;
  transform: rotate(45deg) scale(0.5);
}

.theme-toggle.is-dark .theme-toggle__moon {
  opacity: 1;
  transform: rotate(0deg) scale(1);
}

.nav-github {
  display: inline-flex;
  width: 44px;
  flex: 0 0 44px;
  align-items: center;
  justify-content: center;
  padding: 0;
  text-decoration: none;
}

.nav-github > svg {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  fill: currentColor;
}

@keyframes theme-toggle-spring {
  0%,
  100% {
    transform: scale(1);
  }

  38% {
    transform: scale(0.94);
  }

  68% {
    transform: scale(1.035);
  }
}

@media (max-width: 767px) {
  .NavActions {
    gap: 6px;
    margin-left: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .theme-toggle__track,
  .theme-toggle__thumb,
  .theme-toggle__icon svg,
  .theme-toggle,
  .nav-github {
    transition: none;
  }
}
</style>
