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

async function toggleTheme() {
  if (switching.value) return;
  switching.value = true;
  const supportsReveal = canAnimateThemeTransition(
    document,
    window,
    toggleButton.value
  );
  if (!supportsReveal) document.documentElement.classList.add("theme-is-switching");

  try {
    await runThemeTransition({
      documentObject: document,
      windowObject: window,
      origin: toggleButton.value,
      update: async () => {
        isDark.value = !isDark.value;
        await nextTick();
      }
    });
  } finally {
    window.clearTimeout(resetTimer);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resetTimer = window.setTimeout(() => {
      switching.value = false;
      document.documentElement.classList.remove("theme-is-switching");
    }, reducedMotion ? 40 : 540);
  }
}

onBeforeUnmount(() => {
  window.clearTimeout(resetTimer);
  document.documentElement.classList.remove("theme-is-switching");
});
</script>

<template>
  <div class="NavActions" role="group" aria-label="站点工具">
    <button
      ref="toggleButton"
      type="button"
      class="theme-toggle"
      :class="{ 'is-dark': isDark, 'is-switching': switching }"
      :aria-label="toggleLabel"
      :aria-pressed="isDark"
      :title="toggleLabel"
      @click="toggleTheme"
    >
      <span class="theme-toggle__icon" aria-hidden="true">
        <svg class="theme-toggle__sun" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3.7" />
          <path d="M12 2.7v2M12 19.3v2M2.7 12h2M19.3 12h2M5.4 5.4l1.4 1.4M17.2 17.2l1.4 1.4M18.6 5.4l-1.4 1.4M6.8 17.2l-1.4 1.4" />
        </svg>
        <svg class="theme-toggle__moon" viewBox="0 0 24 24">
          <path d="M19.1 15.5A7.5 7.5 0 0 1 8.5 4.9 7.8 7.8 0 1 0 19.1 15.5Z" />
          <path class="theme-toggle__spark" d="m17.7 5.1.4 1.1 1.1.4-1.1.4-.4 1.1-.4-1.1-1.1-.4 1.1-.4.4-1.1Z" />
        </svg>
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
      <span>GitHub</span>
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

.theme-toggle:hover,
.nav-github:hover {
  background: transparent;
  color: var(--site-accent);
}

.theme-toggle::after,
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

.theme-toggle::after {
  right: 11px;
  left: 11px;
}

.theme-toggle:hover::after,
.theme-toggle:focus-visible::after,
.nav-github:hover::after,
.nav-github:focus-visible::after {
  opacity: 1;
  transform: scaleX(1);
}

.theme-toggle {
  position: relative;
  display: grid;
  width: 44px;
  flex: 0 0 44px;
  place-items: center;
  overflow: hidden;
  padding: 0;
  isolation: isolate;
}

.theme-toggle::before {
  position: absolute;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: conic-gradient(
    from 180deg,
    transparent 0 22%,
    color-mix(in srgb, var(--site-accent) 56%, transparent) 32%,
    transparent 43% 72%,
    color-mix(in srgb, var(--site-accent) 38%, transparent) 82%,
    transparent 94%
  );
  content: "";
  opacity: 0;
  z-index: -1;
}

.theme-toggle.is-switching::before {
  animation: theme-toggle-orbit 520ms cubic-bezier(0.22, 1, 0.36, 1);
}

.theme-toggle__icon {
  position: relative;
  display: block;
  width: 20px;
  height: 20px;
}

.theme-toggle__icon svg {
  position: absolute;
  inset: 0;
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.75;
  transition:
    opacity 360ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 440ms cubic-bezier(0.22, 1, 0.36, 1);
}

.theme-toggle__sun {
  color: #c96a08;
  opacity: 1;
  transform: rotate(0) scale(1);
}

.theme-toggle__moon {
  color: var(--site-accent);
  opacity: 0;
  transform: rotate(-32deg) scale(0.48);
}

.theme-toggle.is-dark .theme-toggle__sun {
  opacity: 0;
  transform: rotate(92deg) scale(0.42);
}

.theme-toggle.is-dark .theme-toggle__moon {
  opacity: 1;
  transform: rotate(0) scale(1);
}

.theme-toggle__spark {
  fill: currentColor;
  stroke: none;
}

.nav-github {
  display: inline-flex;
  min-width: 44px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 3px;
  text-decoration: none;
}

.nav-github > svg {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  fill: currentColor;
}

.nav-github > span {
  font-size: 13px;
  font-weight: 680;
  letter-spacing: -0.01em;
}

@keyframes theme-toggle-orbit {
  0% {
    opacity: 0;
    transform: rotate(-80deg) scale(0.52);
  }

  38% {
    opacity: 0.72;
  }

  100% {
    opacity: 0;
    transform: rotate(70deg) scale(1.12);
  }
}

@media (max-width: 767px) {
  .NavActions {
    gap: 6px;
    margin-left: 0;
  }

  .nav-github {
    width: 44px;
    padding: 0;
  }

  .nav-github > span {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .theme-toggle::before {
    animation: none !important;
  }

  .theme-toggle__icon svg,
  .theme-toggle,
  .nav-github {
    transition: none;
  }
}
</style>
