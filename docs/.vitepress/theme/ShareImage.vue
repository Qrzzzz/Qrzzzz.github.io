<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useData } from "vitepress";
import { SHARE_IMAGE_FORMAT, createShareImageFilename, extractLongformContent, measureLongformHeight, snapshotShareImagePalette, withExportTimeout } from "./shareImageRuntime.mjs";

const props = defineProps<{ pageKind: "article" | "excerpt" }>();
const { frontmatter, page } = useData();
const longform = ref<HTMLElement>();
const rendering = ref(false);
const exportPalette = ref<Record<string, string>>({});
const exportContent = ref<{ title: string; html: string; href: string }>();
const qrCodeDataUrl = ref("");
const statusMessage = ref("");
const statusTone = ref<"neutral" | "success" | "error">("neutral");
let generation = 0;

function resetExport() {
  generation++;
  rendering.value = false;
  exportContent.value = undefined;
  qrCodeDataUrl.value = "";
  statusMessage.value = "";
}
watch(() => page.value.relativePath, resetExport);
onBeforeUnmount(resetExport);

async function downloadImage() {
  if (rendering.value) return;
  const current = ++generation;
  rendering.value = true;
  statusMessage.value = "正在生成全文长图…";
  statusTone.value = "neutral";
  try {
    exportPalette.value = snapshotShareImagePalette(getComputedStyle(document.documentElement));
    const content = extractLongformContent(document.querySelector(".vp-doc"), frontmatter.value.title || page.value.title, props.pageKind);
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
    const href = new URL(canonical || window.location.href);
    href.hash = "";
    exportContent.value = { ...content, href: href.href };
    const [{ toDataURL }, { domToBlob }] = await withExportTimeout(Promise.all([import("qrcode"), import("modern-screenshot")]));
    const qr = await toDataURL(href.href, { errorCorrectionLevel: "M", margin: 4, width: 256, color: { dark: "#30332f", light: "#fbf8f1" } });
    if (current !== generation) return;
    qrCodeDataUrl.value = qr;
    await nextTick();
    // The export uses local system fonts; page web fonts are unrelated.
    statusMessage.value = "正在加载文章图片…";
    const element = longform.value;
    if (!element || current !== generation) return;
    await withExportTimeout(Promise.all(Array.from(element.querySelectorAll<HTMLImageElement>("img[src]")).map(image => image.decode())));
    if (current !== generation) return;
    statusMessage.value = "正在绘制全文长图…";
    const blob = await withExportTimeout(domToBlob(element, {
      backgroundColor: exportPalette.value["--share-canvas"],
      width: SHARE_IMAGE_FORMAT.width,
      height: measureLongformHeight(element),
      scale: SHARE_IMAGE_FORMAT.scale,
      font: false,
      timeout: 15000,
      fetch: { placeholderImage: () => { throw new Error("Article image could not be embedded"); } }
    }), 30000);
    if (current !== generation) return;
    if (!blob || !blob.size) throw new Error("The browser did not return image data");
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.download = createShareImageFilename(props.pageKind === "excerpt" ? frontmatter.value.title : content.title);
    anchor.href = url;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    statusMessage.value = "全文长图已下载。";
    statusTone.value = "success";
  } catch (error) {
    if (current !== generation) return;
    console.error(error);
    statusMessage.value = "全文长图生成失败，请重试。文章过长或图片加载失败时，浏览器可能无法导出。";
    statusTone.value = "error";
  } finally {
    if (current === generation) {
      rendering.value = false;
      exportContent.value = undefined;
      qrCodeDataUrl.value = "";
    }
  }
}
</script>

<template>
  <section class="share-image-entry" aria-label="导出全文长图">
    <div class="share-image-entry__actions">
      <p class="share-image-status" :class="`is-${statusTone}`" role="status" aria-live="polite">{{ statusMessage }}</p>
      <button type="button" class="share-image-entry__button" :disabled="rendering" :aria-busy="rendering" @click="downloadImage">
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 5h14v14H5zM8 15l3-3 2 2 2-2 3 3M15.5 9h.01" /></svg>
        {{ rendering ? "正在生成…" : "导出全文长图" }}
      </button>
    </div>
  </section>
  <Teleport to="body">
    <div v-if="exportContent" class="share-image-render-host" aria-hidden="true" inert>
      <article ref="longform" class="share-image-longform" :style="{ ...exportPalette, width: `${SHARE_IMAGE_FORMAT.width}px` }">
        <header class="share-image-longform__header">
          <span class="share-image-longform__brand">Qrzzzz · 全文阅读</span>
          <h1 v-if="exportContent.title">{{ exportContent.title }}</h1>
        </header>
        <!-- Only the allowlisted semantic DOM from extractLongformContent is rendered. -->
        <div class="share-image-longform__body" v-html="exportContent.html" />
        <footer class="share-image-longform__footer">
          <span v-if="pageKind !== 'excerpt'" class="share-image-longform__url">{{ exportContent.href }}</span>
          <figure><img v-if="qrCodeDataUrl" :src="qrCodeDataUrl" alt="" width="84" height="84" /><figcaption>扫码阅读原文</figcaption></figure>
        </footer>
      </article>
    </div>
  </Teleport>
</template>

<style scoped>
.share-image-entry {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 48px;
  padding-top: 10px;
  border-top: 1px solid var(--site-line);
}

.share-image-entry p {
  margin: 0;
}

.share-image-entry__actions {
  display: flex;
  min-height: 32px;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.share-image-entry__button {
  appearance: none;
  display: inline-flex;
  min-height: 32px;
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
  color: var(--site-text-muted);
  font-size: 12px;
  text-align: right;
}

.share-image-status.is-success {
  color: var(--site-accent);
}

.share-image-status.is-error {
  color: #d14343;
}


.share-image-render-host { position: absolute; top: 0; left: -10000px; pointer-events: none; }
.share-image-longform {
  color-scheme: normal;
  box-sizing: border-box;
  padding: 44px 40px 32px;
  background: var(--share-canvas);
  color: var(--share-text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 17px;
  line-height: 1.85;
  overflow-wrap: anywhere;
}
.share-image-longform__header { margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid var(--share-line); }
.share-image-longform__brand { color: var(--share-link); font-size: 13px; letter-spacing: .08em; }
.share-image-longform__header h1 { margin: 18px 0 0; font-size: 32px; line-height: 1.4; font-weight: 750; }
.share-image-longform__body :deep(h1) { font-size: 28px; }
.share-image-longform__body :deep(h2) { font-size: 24px; }
.share-image-longform__body :deep(h3) { font-size: 20px; }
.share-image-longform__body :deep(:is(h1,h2,h3,h4,h5,h6)) { margin: 32px 0 14px; line-height: 1.5; font-weight: 700; }
.share-image-longform__body :deep(p) { margin: 0 0 18px; }
.share-image-longform__body :deep(blockquote) { margin: 22px 0; border-left: 3px solid var(--share-content-accent); padding: 4px 0 4px 18px; color: var(--share-content-muted); }
.share-image-longform__body :deep(blockquote > :last-child) { margin-bottom: 0; }
.share-image-longform__body :deep(:is(ul,ol)) { margin: 16px 0 22px; padding-left: 26px; }
.share-image-longform__body :deep(ul) { list-style: disc; }
.share-image-longform__body :deep(ol) { list-style: decimal; }
.share-image-longform__body :deep(li) { margin: 8px 0; }
.share-image-longform__body :deep(li > :is(ul,ol)) { margin: 6px 0; }
.share-image-longform__body :deep(hr) { margin: 28px 0; border: 0; border-top: 1px solid var(--share-line); }
.share-image-longform__body :deep(code) { font-family: "Cascadia Code", Consolas, monospace; font-size: .85em; background: var(--share-surface-subtle); border-radius: 3px; padding: 2px 4px; }
.share-image-longform__body :deep(pre) { margin: 22px 0; padding: 16px; background: var(--share-surface-subtle); border-radius: 6px; white-space: pre-wrap; overflow-wrap: anywhere; tab-size: 2; line-height: 1.65; }
.share-image-longform__body :deep(pre code) { padding: 0; background: transparent; white-space: inherit; }
.share-image-longform__body :deep(a) { color: var(--share-link); text-decoration: underline; }
.share-image-longform__body :deep(img) { display: block; max-width: 100%; height: auto; margin: 18px auto; }
.share-image-longform__body :deep(figure) { margin: 22px 0; }
.share-image-longform__body :deep(:is(figcaption,cite)) { font-size: 14px; color: var(--share-text-muted); }
.share-image-longform__body :deep(table) { width: 100%; table-layout: fixed; border-collapse: collapse; margin: 22px 0; font-size: 14px; }
.share-image-longform__body :deep(:is(th,td)) { border: 1px solid var(--share-line); padding: 8px; }
.share-image-longform__footer { display: flex; align-items: end; gap: 24px; margin-top: 36px; padding-top: 20px; border-top: 1px solid var(--share-line); color: var(--share-text-muted); font-size: 11px; }
.share-image-longform__url { flex: 1; min-width: 0; }
.share-image-longform__footer figure { flex: 0 0 84px; margin: 0; text-align: center; }
.share-image-longform__footer img { display: block; }
.share-image-longform__footer figcaption { margin-top: 5px; font-size: 10px; }
@media (max-width: 560px) {
  .share-image-entry__actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .share-image-status {
    margin-right: auto !important;
    text-align: left;
  }
}

@media (prefers-reduced-motion: reduce) {
  .share-image-entry__button {
    transition: none;
  }
}
</style>
