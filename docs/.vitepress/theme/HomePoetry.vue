<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import collection from "./homePoems.json";
import { createLoadingPoemPlayer } from "./loadingPoemRuntime.mjs";

const initial = collection.items[120];
const root = ref<HTMLElement>();
const paused = ref(false);
const ready = ref(false);
const readable = ref(initial.text);
let player: ReturnType<typeof createLoadingPoemPlayer> | undefined;
let observer: MutationObserver | undefined;
let selectionPaused = false;

function selectionChange() {
  const selection = window.getSelection();
  selectionPaused = Boolean(selection && !selection.isCollapsed && root.value?.contains(selection.anchorNode));
  player?.pause(paused.value || selectionPaused);
}
function togglePause() {
  paused.value = !paused.value;
  player?.pause(paused.value || selectionPaused);
}
function next() {
  window.getSelection()?.removeAllRanges();
  selectionPaused = false;
  paused.value = false;
  player?.pause(false);
  player?.next();
}
onMounted(() => {
  player = createLoadingPoemPlayer({ root: root.value!, poems: collection.items, cycleMs: 60000, shuffle: true });
  observer = new MutationObserver(() => {
    const phase = root.value?.dataset.phase;
    if (phase === "settling" || phase === "holding") {
      readable.value = root.value?.querySelector("[data-poem-text]")?.textContent || initial.text;
    }
  });
  observer.observe(root.value!, { attributes: true, attributeFilter: ["data-phase"] });
  document.addEventListener("selectionchange", selectionChange);
  player.start();
  ready.value = true;
});
onBeforeUnmount(() => {
  player?.destroy();
  observer?.disconnect();
  document.removeEventListener("selectionchange", selectionChange);
});
</script>

<template>
  <section class="home-poetry" aria-label="A poem for this visit">
    <div ref="root" class="home-poem" :lang="initial.lang" :data-form="initial.form" data-home-poem>
      <div class="home-poem__copy" aria-hidden="true">
        <div class="home-poem__ghost" data-poem-ghost>{{ initial.text }}&nbsp;_</div>
        <div class="home-poem__live"><span data-poem-text>{{ initial.text }}</span><span class="home-poem__cursor">_</span></div>
      </div>
      <p class="visually-hidden">{{ readable }}</p>
    </div>
    <div class="home-poetry__footer" lang="en">
      <p class="home-poetry__credit">Words by <span>6 Astra</span></p>
      <div class="home-poetry__controls" aria-label="Poem controls">
        <template v-if="ready">
        <button type="button" :aria-pressed="paused" @click="togglePause">{{ paused ? "Resume" : "Pause" }}</button>
        <span aria-hidden="true">·</span>
        <button type="button" @click="next">Next <span aria-hidden="true">↗</span></button>
        </template>
      </div>
    </div>
  </section>
</template>
