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
  isDark.value ? "Switch to light theme" : "Switch to dark theme"
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
  <div class="NavActions" role="group" aria-label="Site tools">
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
      aria-label="View Qrzzzz on GitHub (opens in a new window)"
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
  gap: 4px;
  margin-left: 12px;
  padding-left: 12px;
  border-left: 1px solid var(--site-line);
}

.theme-toggle,
.nav-github {
  position: relative;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  box-shadow: none;
  color: var(--site-text-muted);
  transition: background-color 160ms ease, color 160ms ease;
}

.theme-toggle:hover,
.theme-toggle:focus-visible,
.nav-github:hover,
.nav-github:focus-visible {
  background: var(--site-accent-soft);
  color: var(--site-accent-hover);
}

.nav-github::after {
  display: none;
  content: none;
}

.theme-toggle {
  display: grid;
  flex: 0 0 40px;
  place-items: center;
  padding: 0;
  cursor: pointer;
}

.theme-toggle__track {
  position: relative;
  display: block;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 7px;
  background: transparent;
}

.theme-toggle__thumb {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  border-radius: 7px;
  background: transparent;
  box-shadow: none;
  color: inherit;
  transition:
    color 250ms ease,
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.theme-toggle.is-dark .theme-toggle__thumb {
  color: var(--site-accent);
  transform: rotate(8deg);
}

.theme-toggle:hover .theme-toggle__thumb,
.theme-toggle:focus-visible .theme-toggle__thumb {
  color: var(--site-accent-hover);
}

.theme-toggle__icon {
  position: absolute;
  inset: 9px;
}

.theme-toggle__icon svg {
  position: absolute;
  inset: 0;
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
  transition:
    opacity 180ms ease,
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
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
  flex: 0 0 40px;
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

@media (max-width: 767.98px) {
  .NavActions {
    gap: 2px;
    margin-left: 6px;
    padding-left: 6px;
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
