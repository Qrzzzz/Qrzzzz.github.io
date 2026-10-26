<script setup lang="ts">
// Adapted from David Haz / Vue Bits VariableProximity. See README.md and shipped license.
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
const props = withDefaults(defineProps<{ label: string; disabled?: boolean; radius?: number }>(), { disabled: false, radius: 100 });
const root = ref<HTMLElement>();
const letters = computed(() => Array.from(props.label));
let frame = 0;
let pointer = { x: 0, y: 0 };
let capability: MediaQueryList | undefined;
let anchor: HTMLElement | null = null;
function reset() {
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  root.value?.removeAttribute("data-proximity-active");
}
function update() {
  frame = 0;
  if (!root.value || props.disabled || !capability?.matches || anchor?.matches(":focus-visible, .is-activating")) { reset(); return; }
  const nodes = [...root.value.querySelectorAll<HTMLElement>(".proximity-letter")];
  const strengths = nodes.map(letter => {
    const bounds = letter.getBoundingClientRect();
    const distance = Math.hypot(pointer.x - bounds.left - bounds.width / 2, pointer.y - bounds.top - bounds.height / 2);
    return Math.max(0, 1 - distance / props.radius) ** 2;
  });
  if (!strengths.some(strength => strength > 0)) { reset(); return; }
  root.value.setAttribute("data-proximity-active", "");
  nodes.forEach((letter, index) => letter.style.setProperty("--proximity-weight", (400 + 200 * strengths[index]).toFixed(1)));
}
function move(event: PointerEvent) {
  if (event.pointerType !== "mouse" || props.disabled || !capability?.matches) return;
  pointer = { x: event.clientX, y: event.clientY };
  if (!frame) frame = requestAnimationFrame(update);
}
function focus() { if (anchor?.matches(":focus-visible")) reset(); }
watch(() => [props.disabled, props.label], reset);
onMounted(() => {
  capability = matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
  anchor = root.value?.closest("a") ?? null;
  window.addEventListener("pointermove", move, { passive: true });
  window.addEventListener("scroll", reset, { passive: true });
  window.addEventListener("blur", reset);
  document.documentElement.addEventListener("pointerleave", reset);
  document.addEventListener("visibilitychange", reset);
  anchor?.addEventListener("focus", focus);
  capability.addEventListener("change", reset);
});
onBeforeUnmount(() => {
  reset();
  window.removeEventListener("pointermove", move);
  window.removeEventListener("scroll", reset);
  window.removeEventListener("blur", reset);
  document.documentElement.removeEventListener("pointerleave", reset);
  document.removeEventListener("visibilitychange", reset);
  anchor?.removeEventListener("focus", focus);
  capability?.removeEventListener("change", reset);
});
</script>

<template>
  <span ref="root" class="variable-proximity">
    <span aria-hidden="true" class="proximity-visual"><span v-for="(letter, index) in letters" :key="index" class="proximity-letter">{{ letter === ' ' ? ' ' : letter }}</span></span>
    <span class="proximity-accessible">{{ label }}</span>
  </span>
</template>

<style scoped>
.variable-proximity { display: inline; }
.proximity-accessible { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
.proximity-visual { white-space: nowrap; }
.proximity-letter { font-variation-settings: inherit; }
[data-proximity-active] .proximity-letter {
  font-variation-settings: "wght" var(--proximity-weight, 400);
  transition: font-variation-settings 90ms linear;
}
@media (prefers-reduced-motion: reduce) { .proximity-letter { transition: none !important; font-variation-settings: inherit !important; } }
</style>
