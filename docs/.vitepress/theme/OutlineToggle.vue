<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useData } from "vitepress";

const { page } = useData();
const controlElement = ref<HTMLElement | null>(null);
const available = ref(false);
const collapsed = ref(false);
const itemCount = ref("00");
let observer: MutationObserver | undefined;
let entranceTimer = 0;

function getElements() {
  const aside = controlElement.value?.closest<HTMLElement>(".VPDocAside");
  const outline = aside?.querySelector<HTMLElement>(".VPDocAsideOutline");
  const doc = aside?.closest<HTMLElement>(".VPDoc");
  return { aside, outline, doc };
}

function playEntrance() {
  const { aside } = getElements();
  if (!aside || !available.value || collapsed.value) return;

  window.clearTimeout(entranceTimer);
  aside.classList.remove("outline-is-opening");
  void aside.offsetWidth;
  aside.classList.add("outline-is-opening");
  entranceTimer = window.setTimeout(() => {
    aside.classList.remove("outline-is-opening");
  }, 820);
}

function syncOutlineState() {
  const { aside, outline, doc } = getElements();
  const hasOutline = Boolean(outline?.classList.contains("has-outline"));
  available.value = hasOutline;

  if (!aside || !outline) return;
  const topLevelItems = outline.querySelectorAll(
    ".VPDocOutlineItem.root > li > .outline-link"
  ).length;
  itemCount.value = String(topLevelItems).padStart(2, "0");

  const shouldCollapse = hasOutline && collapsed.value;
  outline.id = "site-page-outline";
  outline.inert = shouldCollapse;
  if (shouldCollapse) outline.setAttribute("aria-hidden", "true");
  else outline.removeAttribute("aria-hidden");
  aside.classList.toggle("staggered-outline", hasOutline);
  if (!hasOutline) aside.classList.remove("outline-is-opening");
  aside.classList.toggle("outline-is-collapsed", shouldCollapse);
  doc?.classList.toggle("outline-is-collapsed", shouldCollapse);
}

function toggleOutline() {
  collapsed.value = !collapsed.value;
  syncOutlineState();
  if (collapsed.value) {
    window.clearTimeout(entranceTimer);
    getElements().aside?.classList.remove("outline-is-opening");
  } else {
    nextTick(playEntrance);
  }
}

onMounted(async () => {
  await nextTick();
  syncOutlineState();
  playEntrance();
  const { aside } = getElements();
  if (!aside) return;

  observer = new MutationObserver(syncOutlineState);
  observer.observe(aside, {
    attributes: true,
    attributeFilter: ["class"],
    childList: true,
    subtree: true
  });
});

watch(
  () => page.value.relativePath,
  () => {
    collapsed.value = false;
    nextTick(() => {
      syncOutlineState();
      playEntrance();
    });
  },
  { flush: "post" }
);

onBeforeUnmount(() => {
  observer?.disconnect();
  window.clearTimeout(entranceTimer);
  const { aside, outline, doc } = getElements();
  aside?.classList.remove(
    "staggered-outline",
    "outline-is-opening",
    "outline-is-collapsed"
  );
  doc?.classList.remove("outline-is-collapsed");
  if (outline?.id === "site-page-outline") outline.removeAttribute("id");
  if (outline) {
    outline.inert = false;
    outline.removeAttribute("aria-hidden");
  }
});
</script>

<template>
  <div
    v-show="available"
    ref="controlElement"
    class="outline-toolbar"
    :data-collapsed="collapsed || undefined"
  >
    <span class="outline-prelayers" aria-hidden="true">
      <span class="outline-prelayer outline-prelayer--spark" />
      <span class="outline-prelayer outline-prelayer--accent" />
    </span>

    <span class="outline-toolbar__heading">
      <span class="outline-toolbar__eyebrow">On this page</span>
      <span class="outline-toolbar__label">页内目录</span>
    </span>

    <span class="outline-toolbar__count" aria-hidden="true">01—{{ itemCount }}</span>

    <button
      class="outline-toolbar__toggle"
      type="button"
      aria-controls="site-page-outline"
      :aria-expanded="!collapsed"
      :aria-label="collapsed ? '展开页内目录' : '折叠页内目录'"
      :title="collapsed ? '展开页内目录' : '折叠页内目录'"
      @click="toggleOutline"
    >
      <span class="outline-toolbar__text-wrap" aria-hidden="true">
        <span class="outline-toolbar__text-inner">
          <span>收起</span>
          <span>展开</span>
        </span>
      </span>
      <span class="outline-toolbar__icon" aria-hidden="true">
        <span />
        <span />
      </span>
    </button>
  </div>
</template>
