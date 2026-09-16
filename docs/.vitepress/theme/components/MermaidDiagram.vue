<script setup lang="ts">
import { nextTick, onMounted, onBeforeUnmount, ref, watch } from "vue";
import { useData } from "vitepress";
import { diagramTasks, renderDiagram } from "../mermaidRuntime";

const props = defineProps<{ source: string }>();
const { isDark } = useData();
const root = ref<HTMLElement>();
const svg = ref("");
const state = ref("pending");
let generation = 0;
let stop: (() => void) | undefined;

function update() {
  const element = root.value;
  if (!element) return;
  const current = ++generation;
  state.value = "pending";
  svg.value = "";
  const task = nextTick().then(() => {
    if (current !== generation) return null;
    return renderDiagram(props.source, isDark.value, getComputedStyle(document.documentElement));
  })
    .then(result => {
      if (current !== generation || !result) return;
      svg.value = result.svg;
      state.value = "ready";
    }).catch(() => {
      if (current === generation) state.value = "error";
    }).finally(() => {
      if (diagramTasks.get(element) === task) diagramTasks.delete(element);
    });
  diagramTasks.set(element, task);
}
onMounted(() => { stop = watch([() => props.source, isDark], update, { immediate: true }); });
onBeforeUnmount(() => { generation++; stop?.(); if (root.value) diagramTasks.delete(root.value); });
</script>

<template>
  <figure ref="root" class="mermaid-diagram" :data-state="state" :aria-busy="state === 'pending'">
    <p v-if="state === 'pending'" role="status">正在绘制图表…</p>
    <p v-if="state === 'error'" role="alert">图表未能绘制，请查看源码并检查语法。</p>
    <div v-if="svg" class="mermaid-diagram__canvas" tabindex="0" role="region" aria-label="图表，可横向滚动" v-html="svg"></div>
    <details :open="state !== 'ready'" data-share-image-exclude>
      <summary>查看 Mermaid 源码</summary>
      <pre><code>{{ source }}</code></pre>
    </details>
  </figure>
</template>

<style>
.vp-doc .mermaid-diagram { margin: 1.5rem 0; padding: 1rem; border: 1px solid var(--site-line); border-radius: 8px; background: var(--site-surface); }
.mermaid-diagram__canvas { overflow-x: auto; padding: .5rem 0; }
.mermaid-diagram__canvas:focus-visible { outline: 2px solid var(--site-accent); outline-offset: 3px; }
.mermaid-diagram__canvas svg { display: block; margin: auto; }
.vp-doc .mermaid-diagram summary { cursor: pointer; color: var(--site-text-muted); }
.vp-doc .mermaid-diagram pre { overflow-x: auto; padding: 1rem; white-space: pre; }
</style>
