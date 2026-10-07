<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vitepress";
import { loadingPoems } from "./loadingPoems.mjs";
import { createLoadingPoemPlayer } from "./loadingPoemRuntime.mjs";

const router = useRouter();
const visible = ref(true);
const boot = ref(true);
const poemRoot = ref<HTMLElement | null>(null);
let player: ReturnType<typeof createLoadingPoemPlayer> | undefined;
let pending = "";
let reveal: ReturnType<typeof setTimeout> | undefined;
let bailout: ReturnType<typeof setTimeout> | undefined;
const before = router.onBeforePageLoad;
const after = router.onAfterRouteChange;

function clearTimers() {
  clearTimeout(reveal);
  clearTimeout(bailout);
}

function finish() {
  clearTimers();
  player?.destroy();
  player = undefined;
  visible.value = false;
  pending = "";
  document.documentElement.classList.remove("site-boot-loading");
}

const start: NonNullable<typeof router.onBeforePageLoad> = async (to) => {
  const result = await before?.(to);
  if (result === false) return false;
  if (new URL(to, location.href).pathname === router.route.path) { finish(); return; }
  if (pending === to) return;
  clearTimers();
  pending = to;
  reveal = setTimeout(async () => {
    visible.value = true;
    await nextTick();
    if (!visible.value || pending !== to || !poemRoot.value) return;
    player?.destroy();
    player = createLoadingPoemPlayer({ root: poemRoot.value, poems: loadingPoems });
    player.start();
  }, 180);
  // A stalled request must never leave the reading surface covered indefinitely.
  bailout = setTimeout(finish, 180000);
};

const complete: NonNullable<typeof router.onAfterRouteChange> = async (to) => {
  try {
    await after?.(to);
  } finally {
    await nextTick();
    if (pending === to) finish();
  }
};

onMounted(() => {
  document.dispatchEvent(new Event("site-loading-ready"));
  finish();
  boot.value = false;
  router.onBeforePageLoad = start;
  router.onAfterRouteChange = complete;
});

onBeforeUnmount(() => {
  finish();
  if (router.onBeforePageLoad === start) router.onBeforePageLoad = before;
  if (router.onAfterRouteChange === complete) router.onAfterRouteChange = after;
});
</script>

<template>
  <div
    v-if="visible"
    class="site-loading"
    :class="{ 'site-loading--boot': boot }"
    role="status"
    aria-live="polite"
    aria-label="Loading"
    lang="en"
  >
    <div class="site-loading__composition" aria-hidden="true">
      <div class="site-loading__heading">
        <svg class="site-loading__line" viewBox="0 0 400 130" fill="none">
          <path class="site-loading__trace" d="M12 88C77 88 89 18 156 18S219 112 279 88S334 31 388 31" />
          <path class="site-loading__ink" pathLength="100" d="M12 88C77 88 89 18 156 18S219 112 279 88S334 31 388 31" />
        </svg>
        <div class="site-loading__title">
          <span v-for="(letter, index) in 'loading'" :key="index" :style="{ '--letter': index }">{{ letter }}</span>
        </div>
      </div>
      <div class="site-loading__poem-stage">
        <div ref="poemRoot" class="site-loading__poem" data-poem-player data-allow-mismatch>
          <div class="site-loading__poem-ghost" data-poem-ghost></div>
          <div class="site-loading__poem-live"><span data-poem-text></span><span class="site-loading__cursor">_</span></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.site-loading {
  position: fixed;
  inset: 0;
  z-index: 100;
  padding: clamp(40px, 5.6vw, 88px);
  color: var(--site-accent);
  background: var(--site-canvas);
  pointer-events: none;
  overflow: hidden;
}
.site-loading--boot { visibility: hidden; }
:global(html.site-boot-loading .site-loading--boot) {
  animation: loading-reveal 0s 180ms forwards;
}
.site-loading__composition {
  position: relative;
  width: 100%;
  height: 100%;
}
.site-loading__heading {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 152px;
}
.site-loading__line { display: block; width: 100%; margin-bottom: 14px; }
.site-loading__trace, .site-loading__ink { stroke: currentColor; stroke-linecap: round; }
.site-loading__trace { stroke-width: 1; opacity: .16; }
.site-loading__ink {
  stroke-width: 3;
  stroke-dasharray: 28 72;
  animation: loading-ink 2.6s ease-in-out infinite;
}
.site-loading__title {
  display: flex;
  justify-content: flex-start;
  font-family: var(--site-font-mono);
  font-size: 12px;
  font-weight: 400;
  line-height: 1.3;
  letter-spacing: .08em;
}
.site-loading__title span {
  display: inline-block;
  animation: loading-letter 2.6s ease-in-out infinite;
  animation-delay: calc(var(--letter) * 90ms);
}
.site-loading__poem-stage {
  position: absolute;
  inset: 0 0 0 48%;
  display: flex;
  align-items: center;
  font-size: clamp(32px, 2.8vw, 44px);
}
.site-loading__poem {
  display: grid;
  width: min(100%, 30ch);
  min-width: 0;
  font-family: var(--site-font-reading);
  color: var(--site-text);
  text-align: left;
  line-height: 1.55;
  font-weight: 400;
  overflow-wrap: anywhere;
}
.site-loading__poem[data-form="verse"] { width: max-content; max-width: 100%; }
.site-loading__poem:lang(zh-CN) { letter-spacing: .035em; }
.site-loading__poem:lang(en) {
  font-family: "Newsreader", var(--site-font-reading);
  font-size: clamp(40px, 3.7vw, 60px);
  line-height: 1.28;
  letter-spacing: -.025em;
}
.site-loading__poem-ghost, .site-loading__poem-live {
  grid-area: 1 / 1;
  white-space: pre-wrap;
  min-width: 0;
}
.site-loading__poem-ghost { visibility: hidden; }
.site-loading__cursor {
  display: inline-block;
  width: .65em;
  margin-left: .06em;
  font-family: var(--site-font-mono);
  font-size: .7em;
  font-weight: 500;
  line-height: 1;
  color: var(--site-accent);
  letter-spacing: 0;
  text-shadow:
    0 0 3px color-mix(in srgb, var(--site-accent) 40%, transparent),
    0 0 8px color-mix(in srgb, var(--site-accent) 16%, transparent);
}
[data-cursor="hidden"] .site-loading__cursor,
.site-loading__poem:not([data-cursor]) .site-loading__cursor { opacity: 0; }
[data-cursor="blinking"] .site-loading__cursor { animation: loading-cursor .6s steps(1, end) 3; }
@keyframes loading-cursor { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
@keyframes loading-ink {
  from { stroke-dashoffset: 28; }
  to { stroke-dashoffset: -100; }
}
@keyframes loading-letter {
  0%, 60%, 100% { opacity: .7; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-1px); }
}
@keyframes loading-reveal { to { visibility: visible; } }
@media (max-width: 680px) {
  .site-loading { padding: 28px; }
  .site-loading__heading { width: 112px; }
  .site-loading__title { font-size: 11px; }
  .site-loading__poem-stage {
    inset: 0 0 116px 24px;
    font-size: clamp(22px, 6.9vw, 28px);
  }
  .site-loading__poem:lang(en) { font-size: clamp(27px, 8vw, 34px); line-height: 1.32; }
}
@media (max-height: 560px) and (min-width: 681px) {
  .site-loading { padding: 28px 40px; }
  .site-loading__heading { width: 128px; }
  .site-loading__poem-stage { left: 34%; font-size: clamp(22px, 3vw, 28px); }
  .site-loading__poem { line-height: 1.4; }
  .site-loading__poem:lang(en) { font-size: clamp(28px, 3.7vw, 36px); line-height: 1.28; }
}
@media (max-height: 600px) and (max-width: 680px) {
  .site-loading { padding: 24px; }
  .site-loading__poem-stage { bottom: 96px; font-size: 22px; }
  .site-loading__poem:lang(en) { font-size: 27px; }
}
@media (prefers-reduced-motion: reduce) {
  .site-loading__ink { animation: none; stroke-dasharray: none; }
  .site-loading__title span { animation: none; }
  .site-loading__cursor { animation: none; }
}
</style>
