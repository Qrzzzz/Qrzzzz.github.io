<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useData } from "vitepress";
import {
  SHARE_IMAGE_FORMAT,
  createShareImageFilename,
  normalizeShareText
} from "./shareImageRuntime.mjs";

type PageKind = "article" | "excerpt";

const props = defineProps<{
  pageKind: PageKind;
}>();

const { frontmatter, page } = useData();
const card = ref<HTMLElement>();
const clientReady = ref(false);
const rendering = ref(false);
const shareExcerpt = ref("");
const statusMessage = ref("");
const statusTone = ref<"neutral" | "success" | "error">("neutral");

const cardTitle = computed(() =>
  normalizeShareText(
    frontmatter.value.title || page.value.title || "未命名文章",
    SHARE_IMAGE_FORMAT.maxTitleLength
  )
);
const cardExcerpt = computed(() =>
  normalizeShareText(shareExcerpt.value, SHARE_IMAGE_FORMAT.maxExcerptLength)
);
const pageLabel = computed(() => (props.pageKind === "excerpt" ? "EXCERPT / 偶拾" : "ARTICLE / 文章"));
const pageUrl = computed(() => {
  if (typeof window === "undefined") return "qrzzzz.github.io";
  void page.value.relativePath;
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
  const url = new URL(canonical || window.location.href);
  return `${url.host}${url.pathname.replace(/\/$/, "") || "/"}`;
});

function resolveExcerpt() {
  const description = frontmatter.value.description;
  if (typeof description === "string" && description.trim()) {
    return normalizeShareText(description);
  }

  const firstParagraph = document.querySelector<HTMLElement>(
    ".vp-doc > p:not(.lead), .vp-doc .excerpt-quotation p"
  );
  return normalizeShareText(firstParagraph?.textContent);
}

function setStatus(message: string, tone: "neutral" | "success" | "error" = "neutral") {
  statusMessage.value = message;
  statusTone.value = tone;
}

async function renderCard() {
  if (!card.value) throw new Error("分享图尚未就绪");

  await nextTick();
  await document.fonts?.ready;
  const { domToBlob } = await import("modern-screenshot");
  const blob = await domToBlob(card.value, {
    backgroundColor: "#f5f1e8",
    width: SHARE_IMAGE_FORMAT.width,
    height: SHARE_IMAGE_FORMAT.height,
    scale: SHARE_IMAGE_FORMAT.scale,
    font: false,
    timeout: 15000
  });
  if (!blob) throw new Error("浏览器没有返回图片数据");
  return blob;
}

function downloadBlob(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.download = createShareImageFilename(cardTitle.value);
  anchor.href = url;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function downloadImage() {
  if (rendering.value) return;

  rendering.value = true;
  shareExcerpt.value = resolveExcerpt();
  setStatus("正在生成 3:4 高清图片…");

  try {
    const blob = await renderCard();
    downloadBlob(blob);
    setStatus("分享图已下载。", "success");
  } catch (error) {
    console.error(error);
    setStatus("生成失败，请刷新页面后重试。", "error");
  } finally {
    rendering.value = false;
  }
}

onMounted(() => {
  clientReady.value = true;
});

watch(
  () => page.value.relativePath,
  () => {
    shareExcerpt.value = "";
    setStatus("");
  }
);
</script>

<template>
  <section class="share-image-entry" aria-label="文章分享">
    <div>
      <p class="share-image-entry__eyebrow">SHARE / 分享</p>
      <p class="share-image-entry__copy">固定生成 3:4 竖幅 PNG，标题与摘录自动取自当前文章。</p>
    </div>
    <div class="share-image-entry__actions">
      <button
        type="button"
        class="share-image-entry__button"
        :disabled="rendering"
        :aria-busy="rendering"
        @click="downloadImage"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
        </svg>
        {{ rendering ? "正在生成…" : "下载分享图" }}
      </button>
      <p
        class="share-image-status"
        :class="`is-${statusTone}`"
        role="status"
        aria-live="polite"
      >
        {{ statusMessage }}
      </p>
    </div>
  </section>

  <Teleport to="body">
    <div v-if="clientReady" class="share-image-render-host" aria-hidden="true" inert>
      <article ref="card" class="share-image-card">
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
  </Teleport>
</template>

<style scoped>
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

.share-image-entry__eyebrow {
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

.share-image-entry__actions {
  display: grid;
  flex: 0 0 auto;
  justify-items: end;
  gap: 7px;
}

.share-image-entry__button {
  appearance: none;
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  gap: 9px;
  padding: 0 17px;
  border: 1px solid var(--site-line-strong);
  background: transparent;
  color: var(--site-text);
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 650;
  transition: border-color 160ms ease, color 160ms ease, transform 160ms ease;
}

.share-image-entry__button:hover:not(:disabled) {
  border-color: var(--site-accent);
  color: var(--site-accent);
  transform: translateY(-1px);
}

.share-image-entry__button:disabled {
  cursor: wait;
  opacity: 0.58;
}

.share-image-entry__button svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.share-image-status {
  min-height: 18px;
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

.share-image-render-host {
  position: fixed;
  z-index: -1;
  top: 0;
  left: -10000px;
  width: 540px;
  height: 720px;
  pointer-events: none;
}

.share-image-card {
  --card-bg: #f5f1e8;
  --card-text: #191816;
  --card-muted: #666157;
  --card-line: #c9c1b4;
  --card-accent: #d92d16;
  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  display: grid;
  width: 540px;
  height: 720px;
  overflow: hidden;
  padding: 46px 48px 40px;
  background: var(--card-bg);
  color: var(--card-text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI Variable", "Segoe UI",
    "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  grid-template-rows: auto minmax(0, 1fr) auto;
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
  padding: 30px 0 24px;
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
  -webkit-line-clamp: 8;
}

.share-image-card__footer {
  min-width: 0;
  padding-top: 16px;
  border-top: 1px solid var(--card-line);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0;
}

.share-image-card__footer > span:first-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 560px) {
  .share-image-entry {
    align-items: flex-start;
    flex-direction: column;
  }

  .share-image-entry__actions,
  .share-image-entry__button {
    width: 100%;
  }

  .share-image-entry__button {
    justify-content: center;
  }

  .share-image-status {
    justify-self: stretch;
    text-align: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .share-image-entry__button {
    transition: none;
  }
}
</style>
