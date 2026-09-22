<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref
} from "vue";
import { data as libraryItems } from "../../content/library.data";
import {
  LIBRARY_KIND_LABELS,
  LIBRARY_STATUS_LABELS,
  isLibraryKind,
  matchesLibraryItem,
  type LibraryKind
} from "../../content/library";
import LibraryToolbar from "./LibraryToolbar.vue";
import { useLibraryResultMarker } from "./useLibraryResultMarker";

const query = ref("");
const activeKind = ref<LibraryKind | "all">("all");
const {
  resultsRef,
  markerRef,
  handlePointerOver,
  handlePointerLeave,
  handleFocusIn,
  handleFocusOut
} = useLibraryResultMarker();
let queryUrlTimer: number | undefined;

const latestUpdated = computed(() => libraryItems[0]?.updated ?? "");
const filteredItems = computed(() =>
  libraryItems.filter(
    (item) =>
      (activeKind.value === "all" || item.kind === activeKind.value) &&
      matchesLibraryItem(item, query.value)
  )
);

function restoreUrlState() {
  const parameters = new URLSearchParams(window.location.search);
  const kind = parameters.get("type");
  activeKind.value = isLibraryKind(kind) ? kind : "all";
  query.value = parameters.get("q") ?? "";
}

function writeUrl(mode: "push" | "replace") {
  const url = new URL(window.location.href);
  const normalizedQuery = query.value.trim();

  if (activeKind.value === "all") url.searchParams.delete("type");
  else url.searchParams.set("type", activeKind.value);

  if (normalizedQuery) url.searchParams.set("q", normalizedQuery);
  else url.searchParams.delete("q");

  const target = `${url.pathname}${url.search}${url.hash}`;
  const method = mode === "push" ? "pushState" : "replaceState";
  window.history[method](window.history.state, "", target);
}

function handleQuery(value: string) {
  query.value = value;
  if (queryUrlTimer) window.clearTimeout(queryUrlTimer);
  queryUrlTimer = window.setTimeout(() => {
    queryUrlTimer = undefined;
    writeUrl("replace");
  }, 180);
}

function flushQuery() {
  if (!queryUrlTimer) return;
  window.clearTimeout(queryUrlTimer);
  queryUrlTimer = undefined;
  writeUrl("replace");
}

function handleKind(kind: LibraryKind | "all") {
  if (kind === activeKind.value) return;
  if (queryUrlTimer) window.clearTimeout(queryUrlTimer);
  queryUrlTimer = undefined;
  activeKind.value = kind;
  writeUrl("push");
}

function clearFilters() {
  if (queryUrlTimer) window.clearTimeout(queryUrlTimer);
  queryUrlTimer = undefined;
  query.value = "";
  activeKind.value = "all";
  writeUrl("push");
}

function handleHistoryChange() {
  if (queryUrlTimer) window.clearTimeout(queryUrlTimer);
  queryUrlTimer = undefined;
  restoreUrlState();
}

onMounted(() => {
  restoreUrlState();
  window.addEventListener("popstate", handleHistoryChange);
});

onBeforeUnmount(() => {
  if (queryUrlTimer) window.clearTimeout(queryUrlTimer);
  window.removeEventListener("popstate", handleHistoryChange);
});
</script>

<template>
  <div class="library-index">
    <header class="library-header">
      <p class="library-stats">
        {{ libraryItems.length }} entries
        <template v-if="latestUpdated">
          · Last updated <time :datetime="latestUpdated">{{ latestUpdated }}</time>
        </template>
      </p>
    </header>

    <section class="library-results-section" aria-label="Search and browse">
      <LibraryToolbar
        :query="query"
        :active-kind="activeKind"
        :result-count="filteredItems.length"
        @update:query="handleQuery"
        @change-kind="handleKind"
      />

      <div
        v-if="filteredItems.length"
        ref="resultsRef"
        class="library-results"
        @click.capture="flushQuery"
        @pointerover="handlePointerOver"
        @pointerleave="handlePointerLeave"
        @focusin="handleFocusIn"
        @focusout="handleFocusOut"
      >
        <span
          ref="markerRef"
          class="library-result-marker"
          aria-hidden="true"
        >
          <span class="library-result-marker__ink"></span>
        </span>
        <a
          v-for="item in filteredItems"
          :key="item.url"
          class="library-result"
          :href="item.url"
          :aria-label="`Open ${item.displayTitle}`"
        >
          <span class="library-result__meta">
            {{ LIBRARY_KIND_LABELS[item.kind] }}
            <span class="library-result__mobile-state">
              · {{ item.updated }}<template v-if="item.status === 'archived'"> · {{ LIBRARY_STATUS_LABELS[item.status] }}</template>
            </span>
          </span>
          <span class="library-result__content">
            <span
              class="library-result__title"
              :class="{ 'library-result__title--excerpt': item.kind === 'excerpt' }"
            >
              {{ item.displayTitle }}
            </span>
            <span
              v-if="item.kind === 'prompt'"
              class="library-result__summary"
            >
              {{ item.description }}
            </span>
          </span>
          <span class="library-result__date">
            <time :datetime="item.updated">{{ item.updated }}</time>
            <span v-if="item.status === 'archived'">{{ LIBRARY_STATUS_LABELS[item.status] }}</span>
          </span>
        </a>
      </div>

      <div v-else class="library-empty" role="status">
        <h3>No results found</h3>
        <p>Try a different term or remove the current filters.</p>
        <button type="button" @click="clearFilters">Clear filters</button>
      </div>
    </section>

    <nav class="catalog-collections" aria-label="Browse collections">
      <span>Browse collections</span>
      <a href="/notes/">Articles</a>
      <a href="/prompt-collection/">Prompts</a>
      <a href="/excerpts/">Excerpts</a>
    </nav>
  </div>
</template>
