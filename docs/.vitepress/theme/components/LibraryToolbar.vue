<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { LibraryKind } from "../../content/library";

const props = defineProps<{
  query: string;
  activeKind: LibraryKind | "all";
  resultCount: number;
}>();

const emit = defineEmits<{
  "update:query": [value: string];
  "change-kind": [kind: LibraryKind | "all"];
}>();

const filters: Array<{ value: LibraryKind | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "article", label: "Articles" },
  { value: "prompt", label: "Prompts" },
  { value: "excerpt", label: "Excerpts" }
];

const filtersRef = ref<HTMLElement | null>(null);
const markerRef = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | undefined;
let markerFrame: number | undefined;

function handleInput(event: Event) {
  emit("update:query", (event.currentTarget as HTMLInputElement).value);
}

function moveMarker(target: HTMLElement) {
  const marker = markerRef.value;
  if (!marker) return;

  const styles = window.getComputedStyle(target);
  const insetLeft = Number.parseFloat(styles.paddingLeft) || 0;
  const insetRight = Number.parseFloat(styles.paddingRight) || 0;
  const x = target.offsetLeft + insetLeft;
  const y = target.offsetTop + target.offsetHeight - 6;
  const width = Math.max(0, target.offsetWidth - insetLeft - insetRight);
  const isReady = marker.classList.contains("is-ready");

  if (!isReady) marker.classList.add("is-preparing");
  marker.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  marker.style.width = `${width}px`;

  if (!isReady) {
    void marker.offsetWidth;
    marker.classList.remove("is-preparing");
    marker.classList.add("is-ready");
  }
}

function activeFilter() {
  return filtersRef.value?.querySelector<HTMLElement>(
    `[data-library-filter="${props.activeKind}"]`
  ) ?? null;
}

function syncMarker() {
  if (markerFrame) window.cancelAnimationFrame(markerFrame);
  markerFrame = window.requestAnimationFrame(() => {
    markerFrame = undefined;
    const target = activeFilter();
    if (target) moveMarker(target);
  });
}

function handleFilterPointerOver(event: PointerEvent) {
  const target = (event.target as HTMLElement).closest<HTMLElement>(".library-filter");
  if (target && filtersRef.value?.contains(target)) moveMarker(target);
}

function handleFilterPointerLeave() {
  syncMarker();
}

function handleFilterFocusIn(event: FocusEvent) {
  const target = (event.target as HTMLElement).closest<HTMLElement>(".library-filter");
  if (target && filtersRef.value?.contains(target)) moveMarker(target);
}

function handleFilterFocusOut(event: FocusEvent) {
  const nextTarget = event.relatedTarget;
  if (!(nextTarget instanceof Node) || !filtersRef.value?.contains(nextTarget)) {
    syncMarker();
  }
}

watch(
  () => props.activeKind,
  () => nextTick(syncMarker)
);

onMounted(() => {
  void nextTick(syncMarker);
  resizeObserver = new ResizeObserver(syncMarker);
  if (filtersRef.value) resizeObserver.observe(filtersRef.value);
});

onBeforeUnmount(() => {
  if (markerFrame) window.cancelAnimationFrame(markerFrame);
  resizeObserver?.disconnect();
});
</script>

<template>
  <div class="library-toolbar">
    <label class="library-search">
      <span>Search the Library</span>
      <input
        type="search"
        :value="query"
        placeholder="Search titles, summaries, or tags…"
        autocomplete="off"
        @input="handleInput"
      />
    </label>

    <div
      ref="filtersRef"
      class="library-toolbar__filters"
      aria-label="Filter by content type"
      @pointerover="handleFilterPointerOver"
      @pointerleave="handleFilterPointerLeave"
      @focusin="handleFilterFocusIn"
      @focusout="handleFilterFocusOut"
    >
      <span ref="markerRef" class="library-filter-marker" aria-hidden="true"></span>
      <button
        v-for="filter in filters"
        :key="filter.value"
        type="button"
        class="library-filter"
        :class="{ 'library-filter--active': activeKind === filter.value }"
        :data-library-filter="filter.value"
        :aria-pressed="activeKind === filter.value"
        @click="emit('change-kind', filter.value)"
      >
        {{ filter.label }}
      </button>
    </div>

    <p class="library-toolbar__count" aria-live="polite">
      {{ resultCount }} {{ resultCount === 1 ? "result" : "results" }}
    </p>
  </div>
</template>
