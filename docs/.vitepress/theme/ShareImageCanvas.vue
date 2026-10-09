<script setup lang="ts">
import { ref } from "vue";
import { SHARE_IMAGE_FORMAT } from "./shareImageRuntime.mjs";
import type { ShareImageDocument } from "./useShareImageExport";

defineProps<{
  content: ShareImageDocument;
  palette: Record<string, string>;
  qrCode?: { src: string; size: number };
}>();
const element = ref<HTMLElement>();
defineExpose({ element });
</script>

<template>
  <article ref="element" class="share-image-longform" :class="{ 'is-untitled': !content.title }" :style="{ ...palette, '--share-image-width': `${SHARE_IMAGE_FORMAT.width}px` }">
    <header class="share-image-longform__header">
      <div class="share-image-longform__masthead">
        <span class="share-image-longform__brand">Cherry Chu</span>
        <span class="share-image-longform__collection">Library</span>
        <span class="share-image-longform__rule" aria-hidden="true" />
      </div>
      <h1 v-if="content.title">{{ content.title }}</h1>
      <div v-if="content.metadataHtml" class="share-image-longform__metadata" v-html="content.metadataHtml" />
    </header>
    <div class="share-image-longform__content">
      <!-- Rebuilt semantic HTML, plus snapshots of known local math and diagrams. -->
      <div class="share-image-longform__body" v-html="content.html" />
      <div v-if="content.attributionHtml" class="share-image-longform__attribution" v-html="content.attributionHtml" />
    </div>
    <footer class="share-image-longform__footer">
      <div class="share-image-longform__original">
        <span class="share-image-longform__footer-label">{{ content.truncated ? '扫码阅读全文' : '扫码阅读原文' }}</span>
        <span class="share-image-longform__domain">{{ content.domain }}</span>
      </div>
      <img v-if="qrCode" class="share-image-longform__qr" :src="qrCode.src" :width="qrCode.size" :height="qrCode.size" :style="{ width: `${qrCode.size}px`, height: `${qrCode.size}px` }" alt="" />
    </footer>
  </article>
</template>

<style scoped>
.share-image-longform {
  color-scheme: normal;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 32px;
  width: var(--share-image-width);
  min-height: calc(var(--share-image-width) * 4 / 3);
  padding: 36px 40px 30px;
  background: var(--share-canvas);
  color: var(--share-text);
  font-family: var(--share-font-reading);
  font-size: 26px;
  line-height: 1.75;
  overflow-wrap: anywhere;
}
.share-image-longform__header { flex: none; }
.share-image-longform__content { flex: none; margin-block: auto; }
.share-image-longform__masthead { display: flex; align-items: baseline; gap: 12px; font-family: var(--share-font-sans); }
.share-image-longform__brand { flex: none; white-space: nowrap; color: var(--share-text); font-size: 16px; font-weight: 700; letter-spacing: .025em; }
.share-image-longform__collection { flex: none; white-space: nowrap; color: var(--share-text-muted); font-size: 13px; letter-spacing: .14em; text-transform: uppercase; }
.share-image-longform__rule { flex: 1; min-width: 0; align-self: center; height: 1px; margin-left: 6px; background: var(--share-line); }
.share-image-longform__header h1 { margin: 26px 0 0; font-size: 34px; line-height: 1.5; font-weight: 750; letter-spacing: -.025em; }
.share-image-longform__metadata { margin-top: 18px; color: var(--share-text-muted); font-size: 16px; line-height: 1.75; }
.share-image-longform__metadata :deep(p) { margin: 6px 0; }
.share-image-longform__metadata :deep(summary) { margin-top: 12px; font-weight: 700; list-style: none; }
.share-image-longform__metadata :deep(summary::marker) { content: ""; }
.share-image-longform__metadata :deep(a) { color: inherit; text-decoration: none; }
.share-image-longform__body :deep(> :first-child) { margin-top: 0; }
.share-image-longform__body :deep(img.share-math) { margin: 24px auto; }
.share-image-longform__body :deep(img.share-math--inline) { display: inline; max-width: 100%; margin: 0 2px; }
.share-image-longform__body :deep(dl) { margin: 22px 0; }
.share-image-longform__body :deep(dt) { font-weight: 700; }
.share-image-longform__body :deep(dd) { margin: 6px 0 16px 20px; }
.share-image-longform__body :deep(details) { margin: 22px 0; }
.share-image-longform__body :deep(summary) { font-size: 18px; font-weight: 700; }
.share-image-longform__attribution { margin-top: 22px; padding-top: 14px; border-top: 1px solid var(--share-line); color: var(--share-text-muted); font-size: 16px; line-height: 1.75; }
.share-image-longform__attribution :deep(p) { margin: 6px 0; }
.share-image-longform__attribution :deep(a) { color: inherit; text-decoration: none; }
.share-image-longform__footer { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 24px; padding-top: 18px; border-top: 1px solid var(--share-line-strong); }
.share-image-longform__original { flex: 1; min-width: 0; }
.share-image-longform__footer-label { display: block; font-size: 18px; font-weight: 700; line-height: 1.5; }
.share-image-longform__domain { display: block; margin-top: 6px; color: var(--share-text-muted); font-family: var(--share-font-sans); font-size: 13px; letter-spacing: .025em; }
.share-image-longform__qr { display: block; flex: none; max-width: 110px; background: #fff; image-rendering: pixelated; }
</style>

<style scoped src="./shareImageTypography.css"></style>
