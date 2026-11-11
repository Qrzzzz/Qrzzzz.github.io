<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vitepress";
const router = useRouter();
const visible = ref(false);
let reveal: ReturnType<typeof setTimeout> | undefined;
let bailout: ReturnType<typeof setTimeout> | undefined;
const before = router.onBeforePageLoad;
const after = router.onAfterRouteChange;
function finish() { clearTimeout(reveal); clearTimeout(bailout); visible.value = false; }
const start: NonNullable<typeof router.onBeforePageLoad> = async to => {
  const result = await before?.(to);
  if (result === false) return false;
  finish();
  reveal = setTimeout(() => { visible.value = true; }, 180);
  bailout = setTimeout(finish, 12000);
};
const complete: NonNullable<typeof router.onAfterRouteChange> = async to => {
  try { await after?.(to); } finally { finish(); }
};
onMounted(() => { router.onBeforePageLoad = start; router.onAfterRouteChange = complete; });
onBeforeUnmount(() => {
  finish();
  if (router.onBeforePageLoad === start) router.onBeforePageLoad = before;
  if (router.onAfterRouteChange === complete) router.onAfterRouteChange = after;
});
</script>
<template><div v-if="visible" class="site-loading-status" role="status" lang="en">Loading…</div></template>
<style scoped>
.site-loading-status { position: fixed; top: 72px; right: 16px; z-index: 100; padding: 4px 10px; border: 1px solid var(--site-line); background: var(--site-canvas); color: var(--site-text); font: 12px/1.5 var(--site-font-sans); pointer-events: none; }
</style>
