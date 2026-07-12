<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { onContentUpdated, useData } from "vitepress";
import { buildOutlineModel } from "./readingOutlineRuntime.mjs";

type OutlineEntry = {
  id: string;
  text: string;
  level: 2 | 3;
};

const { page } = useData();
const portalTarget = ref<HTMLElement | null>(null);
const controlElement = ref<HTMLElement | null>(null);
const triggerElement = ref<HTMLButtonElement | null>(null);
const headers = ref<OutlineEntry[]>([]);
const inlineHeaders = ref<OutlineEntry[]>([]);
const activeId = ref("");
const open = ref(false);
const visible = ref(false);
const hasInlineOutline = ref(false);
const hasMore = ref(false);

let anchorElement: HTMLElement | undefined;
let headingElements: HTMLElement[] = [];
let scrollFrame = 0;

function clearAnchor() {
  anchorElement?.remove();
  anchorElement = undefined;
  portalTarget.value = null;
}

function placeAnchor(content: HTMLElement) {
  clearAnchor();
  anchorElement = document.createElement("div");
  anchorElement.className = "reading-outline-anchor";

  const children = Array.from(content.children);
  const titleIndex = children.findIndex((element) => element.tagName === "H1");
  const title = titleIndex >= 0 ? children[titleIndex] : undefined;
  let insertionPoint = title;

  if (title) {
    for (const candidate of children.slice(titleIndex + 1, titleIndex + 6)) {
      if (candidate.tagName === "H2") break;
      if (candidate.tagName === "P") {
        insertionPoint = candidate;
        break;
      }
    }
  }

  if (insertionPoint) insertionPoint.after(anchorElement);
  else content.prepend(anchorElement);
  portalTarget.value = anchorElement;
}

function updateReadingState() {
  scrollFrame = 0;
  visible.value = window.scrollY >= 160;

  if (!headingElements.length) {
    activeId.value = "";
    return;
  }

  let current = headingElements[0].id;
  for (const heading of headingElements) {
    if (heading.getBoundingClientRect().top > 132) break;
    current = heading.id;
  }
  activeId.value = current;
}

function scheduleReadingState() {
  if (scrollFrame) return;
  scrollFrame = window.requestAnimationFrame(updateReadingState);
}

function headingText(heading: HTMLElement) {
  const copy = heading.cloneNode(true) as HTMLElement;
  copy.querySelectorAll(".header-anchor").forEach((anchor) => anchor.remove());
  return copy.textContent ?? "";
}

function syncOutline() {
  nextTick(() => {
    const content = document.querySelector<HTMLElement>(".VPDoc .vp-doc");
    if (!content) {
      headers.value = [];
      inlineHeaders.value = [];
      headingElements = [];
      hasInlineOutline.value = false;
      hasMore.value = false;
      open.value = false;
      clearAnchor();
      return;
    }

    headingElements = Array.from(
      content.querySelectorAll<HTMLElement>("h2[id], h3[id]")
    );
    const model = buildOutlineModel(
      headingElements.map((heading) => ({
        id: heading.id,
        text: headingText(heading),
        level: heading.tagName === "H2" ? 2 : 3
      }))
    );

    headers.value = model.headers;
    inlineHeaders.value = model.inlineHeaders;
    hasInlineOutline.value = model.hasInlineOutline;
    hasMore.value = model.hasMore;
    open.value = false;

    const title = content.querySelector<HTMLElement>("h1");
    const readingRoot = title?.parentElement ?? content;
    if (model.hasInlineOutline) placeAnchor(readingRoot);
    else clearAnchor();
    updateReadingState();
  });
}

function toggleOutline() {
  open.value = !open.value;
}

function closeOutline(returnFocus = false) {
  if (!open.value) return;
  open.value = false;
  if (returnFocus) nextTick(() => triggerElement.value?.focus());
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key !== "Escape" || !open.value) return;
  event.preventDefault();
  closeOutline(true);
}

function handleDocumentPointerdown(event: PointerEvent) {
  if (!open.value || controlElement.value?.contains(event.target as Node)) return;
  closeOutline();
}

onContentUpdated(syncOutline);

onMounted(() => {
  syncOutline();
  window.addEventListener("scroll", scheduleReadingState, { passive: true });
  window.addEventListener("resize", scheduleReadingState, { passive: true });
  document.addEventListener("keydown", handleDocumentKeydown);
  document.addEventListener("pointerdown", handleDocumentPointerdown);
});

watch(
  () => page.value.relativePath,
  () => syncOutline(),
  { flush: "post" }
);

onBeforeUnmount(() => {
  if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
  window.removeEventListener("scroll", scheduleReadingState);
  window.removeEventListener("resize", scheduleReadingState);
  document.removeEventListener("keydown", handleDocumentKeydown);
  document.removeEventListener("pointerdown", handleDocumentPointerdown);
  clearAnchor();
});
</script>

<template>
  <Teleport v-if="portalTarget && hasInlineOutline" :to="portalTarget">
    <section class="reading-outline-inline" aria-labelledby="reading-outline-inline-title">
      <header class="reading-outline-inline__header">
        <p id="reading-outline-inline-title">本页</p>
        <button v-if="hasMore" type="button" @click="open = true">查看全部</button>
      </header>
      <nav aria-label="本页主要章节">
        <a
          v-for="header in inlineHeaders"
          :key="header.id"
          :href="`#${header.id}`"
          :aria-current="activeId === header.id ? 'location' : undefined"
        >
          {{ header.text }}
        </a>
      </nav>
    </section>
  </Teleport>

  <div
    v-if="hasInlineOutline"
    ref="controlElement"
    class="reading-outline-control"
    :data-visible="visible || open || undefined"
  >
    <button
      v-show="visible || open"
      ref="triggerElement"
      class="reading-outline-trigger"
      type="button"
      aria-controls="reading-outline-popover"
      :aria-expanded="open"
      :aria-label="open ? '关闭页内目录' : '打开页内目录'"
      @click="toggleOutline"
    >
      <span aria-hidden="true">目录</span>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M3 4h10M3 8h10M3 12h7" />
      </svg>
    </button>

    <div
      v-show="open"
      id="reading-outline-popover"
      class="reading-outline-popover"
    >
      <header>
        <strong>页内目录</strong>
        <button type="button" aria-label="关闭页内目录" @click="closeOutline(true)">×</button>
      </header>
      <nav aria-label="页内目录">
        <a
          v-for="header in headers"
          :key="header.id"
          :class="{ 'is-nested': header.level === 3, 'is-active': activeId === header.id }"
          :href="`#${header.id}`"
          :aria-current="activeId === header.id ? 'location' : undefined"
          @click="closeOutline()"
        >
          {{ header.text }}
        </a>
      </nav>
    </div>
  </div>
</template>
