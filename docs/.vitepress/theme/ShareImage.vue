<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useData } from "vitepress";
import {
  SHARE_IMAGE_FORMATS,
  createShareImageFilename,
  getShareImageFormat,
  normalizeShareText
} from "./shareImageRuntime.mjs";

type PageKind = "article" | "excerpt";
type ShareFormatId = keyof typeof SHARE_IMAGE_FORMATS;
type ShareTheme = "paper" | "night";

const props = defineProps<{
  pageKind: PageKind;
}>();

const { frontmatter, isDark, page } = useData();
const trigger = ref<HTMLButtonElement>();
const dialog = ref<HTMLElement>();
const titleInput = ref<HTMLInputElement>();
const previewPanel = ref<HTMLElement>();
const previewFrame = ref<HTMLElement>();
const card = ref<HTMLElement>();
const open = ref(false);
const rendering = ref(false);
const copySupported = ref(false);
const shareTitle = ref("");
const shareExcerpt = ref("");
const rememberedSelection = ref("");
const formatId = ref<ShareFormatId>("portrait");
const cardTheme = ref<ShareTheme>("paper");
const previewScale = ref(1);
const statusMessage = ref("");
const statusTone = ref<"neutral" | "success" | "error">("neutral");

let previewObserver: ResizeObserver | undefined;
let backgroundElement: HTMLElement | undefined;
let backgroundWasInert = false;
let backgroundAriaHidden: string | null = null;
let bodyOverflow = "";

const formats = Object.values(SHARE_IMAGE_FORMATS);
const currentFormat = computed(() => getShareImageFormat(formatId.value));
const cardTitle = computed(() =>
  normalizeShareText(shareTitle.value, currentFormat.value.maxTitleLength)
);
const cardExcerpt = computed(() =>
  normalizeShareText(shareExcerpt.value, currentFormat.value.maxExcerptLength)
);
const pageLabel = computed(() => (props.pageKind === "excerpt" ? "EXCERPT / 偶拾" : "ARTICLE / 文章"));
const pageUrl = computed(() => {
  if (typeof window === "undefined") return "qrzzzz.github.io";
  void page.value.relativePath;
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
  const url = new URL(canonical || window.location.href);
  return `${url.host}${url.pathname.replace(/\/$/, "") || "/"}`;
});
const previewStyle = computed(() => ({
  width: `${currentFormat.value.width}px`,
  height: `${currentFormat.value.height}px`,
  transform: `translateX(-50%) scale(${previewScale.value})`
}));
const previewFrameStyle = computed(() => ({
  height: `${currentFormat.value.height * previewScale.value}px`
}));
const excerptUsage = computed(
  () => `${cardExcerpt.value.length} / ${currentFormat.value.maxExcerptLength} 字进入当前版式`
);

const focusableSelector = [
  'button:not([disabled])',
  'input:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(",");

function selectedArticleText() {
  const selection = window.getSelection();
  const article = document.querySelector<HTMLElement>(".vp-doc");
  if (!selection || selection.isCollapsed || !selection.rangeCount || !article) return "";

  const commonNode = selection.getRangeAt(0).commonAncestorContainer;
  const commonElement =
    commonNode.nodeType === Node.ELEMENT_NODE
      ? (commonNode as Element)
      : commonNode.parentElement;
  if (!commonElement || !article.contains(commonElement)) return "";

  return normalizeShareText(selection.toString(), 360);
}

function rememberSelection() {
  rememberedSelection.value = selectedArticleText();
}

function defaultExcerpt() {
  const description = frontmatter.value.description;
  if (rememberedSelection.value) return rememberedSelection.value;
  if (typeof description === "string" && description.trim()) {
    return normalizeShareText(description, 360);
  }

  const firstParagraph = document.querySelector<HTMLElement>(
    ".vp-doc > p:not(.lead), .vp-doc .excerpt-quotation p"
  );
  return normalizeShareText(firstParagraph?.textContent, 360);
}

function updatePreviewScale() {
  if (!previewFrame.value || !previewPanel.value) return;
  const availableWidth = previewFrame.value.clientWidth;
  const widthScale = availableWidth / currentFormat.value.width;
  const fitsHeight = window.matchMedia("(min-width: 861px)").matches;
  const previewMeta = previewPanel.value.querySelector<HTMLElement>(
    ".share-image-preview-meta"
  );
  const availableHeight = Math.max(
    240,
    previewPanel.value.clientHeight - (previewMeta?.offsetHeight ?? 0) - 62
  );
  const heightScale = fitsHeight
    ? availableHeight / currentFormat.value.height
    : 1;
  previewScale.value = Math.min(1, widthScale, heightScale);
}

function setBackgroundInert(value: boolean) {
  if (value) {
    backgroundElement = document.querySelector<HTMLElement>(".site-layout") ?? undefined;
    if (!backgroundElement) return;
    backgroundWasInert = backgroundElement.inert;
    backgroundAriaHidden = backgroundElement.getAttribute("aria-hidden");
    backgroundElement.inert = true;
    backgroundElement.setAttribute("aria-hidden", "true");
    return;
  }

  if (!backgroundElement) return;
  backgroundElement.inert = backgroundWasInert;
  if (backgroundAriaHidden === null) backgroundElement.removeAttribute("aria-hidden");
  else backgroundElement.setAttribute("aria-hidden", backgroundAriaHidden);
  backgroundElement = undefined;
}

async function openDialog() {
  const liveSelection = selectedArticleText();
  if (liveSelection) rememberedSelection.value = liveSelection;
  shareTitle.value = normalizeShareText(
    frontmatter.value.title || page.value.title || "未命名文章",
    90
  );
  shareExcerpt.value = defaultExcerpt();
  cardTheme.value = isDark.value ? "night" : "paper";
  formatId.value = "portrait";
  statusMessage.value = "";
  statusTone.value = "neutral";
  bodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  document.documentElement.classList.add("share-image-dialog-open");
  window.addEventListener("keydown", handleDialogKeydown);
  setBackgroundInert(true);
  open.value = true;

  await nextTick();
  updatePreviewScale();
  previewObserver?.disconnect();
  if (previewPanel.value) {
    previewObserver = new ResizeObserver(updatePreviewScale);
    previewObserver.observe(previewPanel.value);
  }
  titleInput.value?.focus();
}

function closeDialog() {
  if (!open.value) return;
  open.value = false;
  previewObserver?.disconnect();
  previewObserver = undefined;
  document.body.style.overflow = bodyOverflow;
  document.documentElement.classList.remove("share-image-dialog-open");
  window.removeEventListener("keydown", handleDialogKeydown);
  setBackgroundInert(false);
  nextTick(() => trigger.value?.focus());
}

function handleDialogKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    closeDialog();
    return;
  }
  if (event.key !== "Tab" || !dialog.value) return;

  const focusable = [...dialog.value.querySelectorAll<HTMLElement>(focusableSelector)].filter(
    (element) => !element.inert && element.getClientRects().length > 0
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable.at(-1)!;
  if (!dialog.value.contains(document.activeElement)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function setStatus(message: string, tone: "neutral" | "success" | "error" = "neutral") {
  statusMessage.value = message;
  statusTone.value = tone;
}

async function renderCard() {
  if (!card.value) throw new Error("分享图预览尚未就绪");
  rendering.value = true;
  setStatus("正在生成高清图片…");

  try {
    await nextTick();
    await document.fonts?.ready;
    const { domToBlob } = await import("modern-screenshot");
    const format = currentFormat.value;
    const blob = await domToBlob(card.value, {
      backgroundColor: cardTheme.value === "night" ? "#111214" : "#f5f1e8",
      width: format.width,
      height: format.height,
      scale: format.scale,
      font: false,
      timeout: 15000
    });
    if (!blob) throw new Error("浏览器没有返回图片数据");
    return blob;
  } finally {
    rendering.value = false;
  }
}

function downloadBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.download = createShareImageFilename(shareTitle.value, formatId.value);
  anchor.href = url;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadImage() {
  try {
    const blob = await renderCard();
    downloadBlob(blob);
    setStatus("PNG 已下载。", "success");
  } catch (error) {
    console.error(error);
    setStatus("生成失败，请刷新页面后重试。", "error");
  }
}

async function copyImage() {
  try {
    const blob = await renderCard();
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    setStatus("图片已复制，可以直接粘贴到聊天或发布工具。", "success");
  } catch (error) {
    console.error(error);
    setStatus("浏览器未允许复制图片，请改用下载。", "error");
  }
}

watch(formatId, () => {
  statusMessage.value = "";
  nextTick(updatePreviewScale);
});
watch([shareTitle, shareExcerpt, cardTheme], () => {
  if (!rendering.value) statusMessage.value = "";
});
watch(
  () => page.value.relativePath,
  () => closeDialog()
);

onMounted(() => {
  copySupported.value =
    typeof ClipboardItem !== "undefined" && typeof navigator.clipboard?.write === "function";
});

onBeforeUnmount(() => {
  previewObserver?.disconnect();
  document.documentElement.classList.remove("share-image-dialog-open");
  window.removeEventListener("keydown", handleDialogKeydown);
  if (open.value) {
    document.body.style.overflow = bodyOverflow;
    setBackgroundInert(false);
  }
});
</script>

<template>
  <section class="share-image-entry" aria-label="文章分享">
    <div>
      <p class="share-image-entry__eyebrow">SHARE / 分享</p>
      <p class="share-image-entry__copy">把标题与摘录排成一张可直接发布的图片。</p>
    </div>
    <button
      ref="trigger"
      type="button"
      class="share-image-entry__button"
      @pointerdown="rememberSelection"
      @click="openDialog"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 3v12m0-12L7.5 7.5M12 3l4.5 4.5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
      </svg>
      制作分享图
    </button>
  </section>

  <Teleport to="body">
    <div
      v-if="open"
      class="share-image-backdrop"
      @pointerdown.self="closeDialog"
    >
      <section
        ref="dialog"
        class="share-image-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-image-title"
      >
        <header class="share-image-dialog__header">
          <div>
            <p class="share-image-dialog__eyebrow">SHARE IMAGE STUDIO</p>
            <h2 id="share-image-title">制作文章分享图</h2>
          </div>
          <button
            type="button"
            class="share-image-dialog__close"
            aria-label="关闭分享图制作器"
            title="关闭"
            @click="closeDialog"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div class="share-image-dialog__body">
          <form class="share-image-controls" @submit.prevent>
            <fieldset>
              <legend>版式</legend>
              <div class="share-image-segments">
                <label v-for="format in formats" :key="format.id">
                  <input v-model="formatId" type="radio" name="share-format" :value="format.id" />
                  <span>{{ format.label }}</span>
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend>主题</legend>
              <div class="share-image-themes">
                <label>
                  <input v-model="cardTheme" type="radio" name="share-theme" value="paper" />
                  <span><i class="theme-swatch theme-swatch--paper" />暖纸</span>
                </label>
                <label>
                  <input v-model="cardTheme" type="radio" name="share-theme" value="night" />
                  <span><i class="theme-swatch theme-swatch--night" />夜色</span>
                </label>
              </div>
            </fieldset>

            <label class="share-image-field">
              <span>标题</span>
              <input
                ref="titleInput"
                v-model="shareTitle"
                type="text"
                maxlength="90"
                autocomplete="off"
              />
            </label>

            <label class="share-image-field">
              <span>摘录</span>
              <textarea
                v-model="shareExcerpt"
                rows="7"
                maxlength="360"
                placeholder="选择文章文字后打开制作器，也可以在这里直接编辑。"
              />
              <small>{{ excerptUsage }}</small>
            </label>

            <p class="share-image-controls__hint">
              生成过程完全在浏览器本地完成；选择正文后再点“制作分享图”，会自动带入所选文字。
            </p>
          </form>

          <div ref="previewPanel" class="share-image-preview-panel">
            <div class="share-image-preview-meta">
              <span>实时预览</span>
              <span>
                {{ currentFormat.width * currentFormat.scale }} ×
                {{ currentFormat.height * currentFormat.scale }} PNG
              </span>
            </div>

            <div
              ref="previewFrame"
              class="share-image-preview-frame"
              :style="previewFrameStyle"
            >
              <div class="share-image-preview-stage" :style="previewStyle">
                <article
                  ref="card"
                  class="share-image-card"
                  :data-format="formatId"
                  :data-theme="cardTheme"
                >
                  <header class="share-image-card__header">
                    <span class="share-image-card__brand">Qrzzzz</span>
                    <span>{{ pageLabel }}</span>
                  </header>
                  <div class="share-image-card__content">
                    <h3>{{ cardTitle }}</h3>
                    <div class="share-image-card__rule">
                      <span />
                    </div>
                    <p>{{ cardExcerpt }}</p>
                  </div>
                  <footer class="share-image-card__footer">
                    <span>{{ pageUrl }}</span>
                    <span aria-hidden="true">↗</span>
                  </footer>
                </article>
              </div>
            </div>
          </div>
        </div>

        <footer class="share-image-dialog__footer">
          <p
            class="share-image-status"
            :class="`is-${statusTone}`"
            role="status"
            aria-live="polite"
          >
            {{ statusMessage || "可复制到剪贴板，或下载为 PNG。" }}
          </p>
          <div class="share-image-actions">
            <button
              v-if="copySupported"
              type="button"
              class="share-image-action share-image-action--secondary"
              :disabled="rendering"
              @click="copyImage"
            >
              {{ rendering ? "生成中…" : "复制图片" }}
            </button>
            <button
              type="button"
              class="share-image-action share-image-action--primary"
              :disabled="rendering"
              @click="downloadImage"
            >
              {{ rendering ? "生成中…" : "下载 PNG" }}
            </button>
          </div>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
:global(html.share-image-dialog-open .target-cursor) {
  opacity: 0 !important;
}

:global(html.share-image-dialog-open .share-image-backdrop),
:global(html.share-image-dialog-open .share-image-backdrop *) {
  cursor: default !important;
}

:global(html.share-image-dialog-open .share-image-backdrop button),
:global(html.share-image-dialog-open .share-image-backdrop label) {
  cursor: pointer !important;
}

:global(html.share-image-dialog-open .share-image-backdrop input[type="text"]),
:global(html.share-image-dialog-open .share-image-backdrop textarea) {
  cursor: text !important;
}

.share-image-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 28px;
  margin-top: 72px;
  padding: 24px 0;
  border-top: 1px solid var(--site-line);
  border-bottom: 1px solid var(--site-line);
}

.share-image-entry p {
  margin: 0;
}

.share-image-entry__eyebrow,
.share-image-dialog__eyebrow {
  color: var(--site-accent);
  font-family: var(--site-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.share-image-entry__copy {
  margin-top: 6px !important;
  color: var(--site-text-muted);
  font-size: 14px;
}

.share-image-entry__button,
.share-image-action,
.share-image-dialog__close {
  appearance: none;
  border: 0;
  font: inherit;
  cursor: pointer;
}

.share-image-entry__button {
  display: inline-flex;
  min-height: 42px;
  flex: 0 0 auto;
  align-items: center;
  gap: 9px;
  padding: 0 17px;
  border: 1px solid var(--site-line-strong);
  background: transparent;
  color: var(--site-text);
  font-size: 14px;
  font-weight: 650;
  transition: border-color 160ms ease, color 160ms ease, transform 160ms ease;
}

.share-image-entry__button:hover {
  border-color: var(--site-accent);
  color: var(--site-accent);
  transform: translateY(-1px);
}

.share-image-entry__button svg,
.share-image-dialog__close svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.share-image-backdrop {
  position: fixed;
  z-index: 10000;
  inset: 0;
  display: grid;
  padding: 24px;
  background: rgb(8 9 10 / 72%);
  place-items: center;
  backdrop-filter: blur(12px);
}

.share-image-dialog {
  display: grid;
  width: min(1120px, 100%);
  max-height: min(860px, calc(100vh - 48px));
  overflow: hidden;
  border: 1px solid var(--site-line-strong);
  background: var(--site-surface);
  box-shadow: 0 30px 100px rgb(0 0 0 / 34%);
  color: var(--site-text);
  grid-template-rows: auto minmax(0, 1fr) auto;
}

.share-image-dialog__header,
.share-image-dialog__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 24px;
}

.share-image-dialog__header {
  border-bottom: 1px solid var(--site-line);
}

.share-image-dialog__header h2 {
  margin: 4px 0 0;
  font-size: 24px;
  letter-spacing: -0.025em;
}

.share-image-dialog__close {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  background: transparent;
  color: var(--site-text-muted);
  place-items: center;
}

.share-image-dialog__close:hover {
  color: var(--site-accent);
}

.share-image-dialog__body {
  display: grid;
  min-height: 0;
  grid-template-columns: minmax(300px, 360px) minmax(0, 1fr);
}

.share-image-controls {
  overflow-y: auto;
  padding: 24px;
  border-right: 1px solid var(--site-line);
}

.share-image-controls fieldset {
  min-width: 0;
  margin: 0 0 22px;
  padding: 0;
  border: 0;
}

.share-image-controls legend,
.share-image-field > span {
  display: block;
  margin-bottom: 9px;
  color: var(--site-text-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.share-image-segments,
.share-image-themes {
  display: grid;
  gap: 8px;
}

.share-image-segments {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.share-image-themes {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.share-image-segments label,
.share-image-themes label {
  position: relative;
}

.share-image-segments input,
.share-image-themes input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.share-image-segments span,
.share-image-themes span {
  display: flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 7px 9px;
  border: 1px solid var(--site-line);
  color: var(--site-text-muted);
  cursor: pointer;
  font-size: 12px;
  text-align: center;
  transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease;
}

.share-image-segments input:checked + span,
.share-image-themes input:checked + span {
  border-color: var(--site-accent);
  background: var(--site-accent-soft);
  color: var(--site-text);
}

.share-image-segments input:focus-visible + span,
.share-image-themes input:focus-visible + span {
  outline: 3px solid color-mix(in srgb, var(--site-accent) 74%, transparent);
  outline-offset: 3px;
}

.theme-swatch {
  display: inline-block;
  width: 13px;
  height: 13px;
  border: 1px solid rgb(127 127 127 / 45%);
  border-radius: 50%;
}

.theme-swatch--paper {
  background: #f5f1e8;
}

.theme-swatch--night {
  background: #111214;
}

.share-image-field {
  display: block;
  margin-top: 18px;
}

.share-image-field input,
.share-image-field textarea {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid var(--site-line);
  border-radius: 0;
  outline: 0;
  background: var(--site-canvas);
  color: var(--site-text);
  font: inherit;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.share-image-field input {
  height: 44px;
  padding: 0 12px;
}

.share-image-field textarea {
  min-height: 148px;
  padding: 11px 12px;
  line-height: 1.65;
  resize: vertical;
}

.share-image-field input:focus,
.share-image-field textarea:focus {
  border-color: var(--site-accent);
  box-shadow: 0 0 0 3px var(--site-accent-soft);
}

.share-image-field small {
  display: block;
  margin-top: 7px;
  color: var(--site-text-faint);
  font-size: 11px;
  text-align: right;
}

.share-image-controls__hint {
  margin: 20px 0 0;
  color: var(--site-text-faint);
  font-size: 12px;
  line-height: 1.65;
}

.share-image-preview-panel {
  min-width: 0;
  overflow: auto;
  padding: 24px;
  background: var(--site-surface-subtle);
}

.share-image-preview-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
  color: var(--site-text-muted);
  font-family: var(--site-font-mono);
  font-size: 11px;
}

.share-image-preview-frame {
  position: relative;
  width: 100%;
  min-height: 1px;
}

.share-image-preview-stage {
  position: absolute;
  top: 0;
  left: 50%;
  transform-origin: top center;
}

.share-image-card {
  --card-bg: #f5f1e8;
  --card-surface: #fffdf8;
  --card-text: #191816;
  --card-muted: #666157;
  --card-line: #c9c1b4;
  --card-accent: #d92d16;
  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  display: grid;
  width: 100%;
  height: 100%;
  overflow: hidden;
  padding: 46px 48px 40px;
  background: var(--card-bg);
  color: var(--card-text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI Variable", "Segoe UI",
    "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  grid-template-rows: auto minmax(0, 1fr) auto;
}

.share-image-card[data-theme="night"] {
  --card-bg: #111214;
  --card-surface: #181a1d;
  --card-text: #f2f0ea;
  --card-muted: #aaa8a1;
  --card-line: #36393f;
  --card-accent: #00e6b0;
}

.share-image-card__header,
.share-image-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  color: var(--card-muted);
  font-family: ui-monospace, "SFMono-Regular", "Cascadia Code", Consolas, monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.share-image-card__brand {
  color: var(--card-accent);
  font-size: 16px;
  letter-spacing: -0.035em;
}

.share-image-card__content {
  display: flex;
  min-height: 0;
  flex-direction: column;
  justify-content: center;
  padding: 28px 0 22px;
}

.share-image-card h3 {
  margin: 0;
  color: var(--card-text);
  font-size: 42px;
  font-weight: 780;
  letter-spacing: -0.055em;
  line-height: 1.16;
}

.share-image-card__rule {
  display: flex;
  align-items: center;
  margin: 24px 0 22px;
}

.share-image-card__rule::before {
  width: 42px;
  height: 4px;
  background: var(--card-accent);
  content: "";
}

.share-image-card__rule span {
  height: 1px;
  flex: 1;
  background: var(--card-line);
}

.share-image-card__content p {
  display: -webkit-box;
  overflow: hidden;
  margin: 0;
  color: var(--card-text);
  font-size: 24px;
  font-weight: 520;
  letter-spacing: -0.02em;
  line-height: 1.65;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 7;
}

.share-image-card__footer {
  padding-top: 16px;
  border-top: 1px solid var(--card-line);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0;
}

.share-image-card[data-format="square"] {
  padding: 38px 42px 34px;
}

.share-image-card[data-format="square"] .share-image-card__content {
  padding: 22px 0 18px;
}

.share-image-card[data-format="square"] h3 {
  font-size: 36px;
}

.share-image-card[data-format="square"] .share-image-card__rule {
  margin: 18px 0 17px;
}

.share-image-card[data-format="square"] .share-image-card__content p {
  font-size: 21px;
  line-height: 1.58;
  -webkit-line-clamp: 5;
}

.share-image-card[data-format="wide"] {
  padding: 28px 36px 24px;
}

.share-image-card[data-format="wide"] .share-image-card__header {
  font-size: 9px;
}

.share-image-card[data-format="wide"] .share-image-card__brand {
  font-size: 14px;
}

.share-image-card[data-format="wide"] .share-image-card__content {
  padding: 12px 0 10px;
}

.share-image-card[data-format="wide"] h3 {
  font-size: 30px;
  line-height: 1.12;
}

.share-image-card[data-format="wide"] .share-image-card__rule {
  margin: 11px 0 10px;
}

.share-image-card[data-format="wide"] .share-image-card__rule::before {
  width: 34px;
  height: 3px;
}

.share-image-card[data-format="wide"] .share-image-card__content p {
  font-size: 17px;
  line-height: 1.45;
  -webkit-line-clamp: 2;
}

.share-image-card[data-format="wide"] .share-image-card__footer {
  padding-top: 9px;
  font-size: 9px;
}

.share-image-dialog__footer {
  border-top: 1px solid var(--site-line);
}

.share-image-status {
  margin: 0;
  color: var(--site-text-muted);
  font-size: 13px;
}

.share-image-status.is-success {
  color: var(--site-accent);
}

.share-image-status.is-error {
  color: #d14343;
}

.share-image-actions {
  display: flex;
  gap: 10px;
}

.share-image-action {
  min-width: 112px;
  min-height: 42px;
  padding: 0 17px;
  font-size: 13px;
  font-weight: 700;
}

.share-image-action:disabled {
  cursor: wait;
  opacity: 0.58;
}

.share-image-action--secondary {
  border: 1px solid var(--site-line-strong);
  background: transparent;
  color: var(--site-text);
}

.share-image-action--primary {
  background: var(--site-accent);
  color: var(--site-accent-ink);
}

@media (max-width: 860px) {
  .share-image-backdrop {
    align-items: stretch;
    padding: 0;
  }

  .share-image-dialog {
    width: 100%;
    max-height: 100dvh;
  }

  .share-image-dialog__body {
    overflow-y: auto;
    grid-template-columns: 1fr;
  }

  .share-image-controls {
    overflow: visible;
    border-right: 0;
    border-bottom: 1px solid var(--site-line);
  }

  .share-image-preview-panel {
    overflow: visible;
  }
}

@media (max-width: 560px) {
  .share-image-entry {
    align-items: flex-start;
    flex-direction: column;
  }

  .share-image-entry__button {
    width: 100%;
    justify-content: center;
  }

  .share-image-dialog__header,
  .share-image-dialog__footer,
  .share-image-controls,
  .share-image-preview-panel {
    padding-right: 18px;
    padding-left: 18px;
  }

  .share-image-dialog__header h2 {
    font-size: 20px;
  }

  .share-image-dialog__footer {
    align-items: stretch;
    flex-direction: column;
  }

  .share-image-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .share-image-action:only-child {
    grid-column: 1 / -1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .share-image-entry__button,
  .share-image-segments span,
  .share-image-themes span,
  .share-image-field input,
  .share-image-field textarea {
    transition: none;
  }
}
</style>
