<script setup lang="ts">
import SiteIcon from "./SiteIcon.vue";
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
            <SiteIcon name="sun" class="theme-toggle__sun" />
            <SiteIcon name="moon" class="theme-toggle__moon" />
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
      <SiteIcon name="external-link" />
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
  color: var(--site-link);
  transform: rotate(8deg);
}

.theme-toggle:hover .theme-toggle__thumb,
.theme-toggle:focus-visible .theme-toggle__thumb {
  color: var(--site-accent-hover);
}

.theme-toggle__icon {
  position: absolute;
  inset: 7px;
}

.theme-toggle__icon .site-icon {
  position: absolute;
  inset: 0;
  width: 18px;
  height: 18px;
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

.nav-github > .site-icon {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;

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
  .theme-toggle__icon .site-icon,
  .theme-toggle,
  .nav-github {
    transition: none;
  }
}
</style>
