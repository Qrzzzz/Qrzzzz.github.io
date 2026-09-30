<script setup lang="ts">
import { ref } from "vue";
import ShareImageCanvas from "./ShareImageCanvas.vue";
import { useShareImageExport } from "./useShareImageExport";

const props = defineProps<{ pageKind: "article" | "excerpt" }>();
const canvas = ref<{ element?: HTMLElement }>();
const { truncate, rendering, preparedImage, copying, copyButton, exportPalette, exportContent, qrCode, statusMessage, statusTone, prepareImage, copyImage, downloadImage } = useShareImageExport(() => props.pageKind, () => canvas.value?.element);
</script>

<template>
  <section class="share-image-entry" aria-label="Export article image">
    <label class="share-image-option">
      <input v-model="truncate" type="checkbox" :disabled="rendering || copying" />
      <span>Limit to 3,000 characters</span>
    </label>
    <div class="share-image-entry__actions">
      <p class="share-image-status" :class="`is-${statusTone}`" role="status" aria-live="polite">{{ statusMessage }}</p>
      <template v-if="preparedImage">
        <button ref="copyButton" type="button" class="share-image-entry__button share-image-entry__button--primary" :disabled="copying" :aria-busy="copying" aria-label="Copy image to clipboard" @click="copyImage">{{ copying ? "Copying…" : "Copy image" }}</button>
        <button type="button" class="share-image-entry__button" @click="downloadImage">Download image</button>
        <button type="button" class="share-image-entry__button" :disabled="copying" @click="prepareImage">Regenerate image</button>
      </template>
      <button v-else type="button" class="share-image-entry__button" :disabled="rendering" :aria-busy="rendering" @click="prepareImage">
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 5h14v14H5zM8 15l3-3 2 2 2-2 3 3M15.5 9h.01" /></svg>
        {{ rendering ? "Preparing…" : "Export article image" }}
      </button>
    </div>
  </section>
  <Teleport to="body">
    <div v-if="exportContent" class="share-image-render-host" aria-hidden="true" inert>
      <ShareImageCanvas ref="canvas" :content="exportContent" :palette="exportPalette" :qr-code="qrCode" />
    </div>
  </Teleport>
</template>

<style scoped>
.share-image-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 24px;
  margin-top: 48px;
  padding-top: 10px;
  border-top: 1px solid var(--site-line);
}

.share-image-entry p {
  margin: 0;
}

.share-image-entry__actions {
  display: flex;
  flex-wrap: wrap;
  min-height: 44px;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.share-image-entry__button {
  appearance: none;
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 7px;
  padding: 0 7px;
  border: 0;
  background: transparent;
  color: var(--site-text-muted);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  transition: color 160ms ease, transform 160ms ease;
}

.share-image-entry__button:hover:not(:disabled) {
  color: var(--site-accent);
  transform: translateY(-1px);
}

.share-image-entry__button:disabled {
  cursor: wait;
  opacity: 0.58;
}

.share-image-entry__button--primary {
  padding: 0 18px;
  border-radius: 6px;
  background: var(--site-text);
  color: var(--site-canvas);
}

.share-image-entry__button--primary:hover:not(:disabled) {
  color: var(--site-canvas);
  opacity: .88;
}

.share-image-entry__button:focus-visible {
  outline: 2px solid var(--site-link);
  outline-offset: 3px;
}

.share-image-entry__button svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.share-image-status {
  flex-basis: 100%;
  color: var(--site-text-muted);
  font-size: 12px;
  text-align: right;
}

.share-image-status:empty { display: none; }

.share-image-status.is-success {
  color: var(--site-accent);
}

.share-image-status.is-error {
  color: var(--vp-c-danger-1);
}



.share-image-option { display: inline-flex; min-height: 44px; align-items: center; gap: 9px; color: var(--site-text-muted); font-family: var(--site-font-sans); font-size: 12px; cursor: pointer; }
.share-image-option input { width: 15px; height: 15px; margin: 0; accent-color: var(--site-accent); }
.share-image-option input:focus-visible { outline: 2px solid var(--site-link); outline-offset: 3px; }
.share-image-option:has(input:disabled) { cursor: wait; opacity: .6; }
.share-image-render-host { position: absolute; top: 0; left: -10000px; pointer-events: none; }
@media (max-width: 680px) {
  .share-image-entry__actions { width: 100%; justify-content: flex-start; flex-wrap: wrap; gap: 8px; }
  .share-image-status { text-align: left; }
}
@media (prefers-reduced-motion: reduce) { .share-image-entry__button { transition: none; } }
</style>
