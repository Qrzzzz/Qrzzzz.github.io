<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useData } from "vitepress";

const { page } = useData();
const controlElement = ref<HTMLElement | null>(null);
const available = ref(false);
const collapsed = ref(false);
let observer: MutationObserver | undefined;

function getElements() {
  const aside = controlElement.value?.closest<HTMLElement>(".VPDocAside");
  const outline = aside?.querySelector<HTMLElement>(".VPDocAsideOutline");
  return { aside, outline };
}

function syncOutlineState() {
  const { aside, outline } = getElements();
  const hasOutline = Boolean(outline?.classList.contains("has-outline"));
  available.value = hasOutline;

  if (!aside || !outline) return;
  const shouldCollapse = hasOutline && collapsed.value;
  outline.id = "site-page-outline";
  outline.inert = shouldCollapse;
  if (shouldCollapse) outline.setAttribute("aria-hidden", "true");
  else outline.removeAttribute("aria-hidden");
  aside.classList.toggle("outline-is-collapsed", shouldCollapse);
}

function toggleOutline() {
  collapsed.value = !collapsed.value;
  syncOutlineState();
}

onMounted(async () => {
  await nextTick();
  syncOutlineState();
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
    nextTick(syncOutlineState);
  },
  { flush: "post" }
);

onBeforeUnmount(() => {
  observer?.disconnect();
  const { aside, outline } = getElements();
  aside?.classList.remove("outline-is-collapsed");
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
    <span class="outline-toolbar__label">页内目录</span>
    <button
      class="outline-toolbar__toggle"
      type="button"
      aria-controls="site-page-outline"
      :aria-expanded="!collapsed"
      :aria-label="collapsed ? '展开页内目录' : '折叠页内目录'"
      :title="collapsed ? '展开页内目录' : '折叠页内目录'"
      @click="toggleOutline"
    >
      <span aria-hidden="true" />
      <span aria-hidden="true" />
    </button>
  </div>
</template>
