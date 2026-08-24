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
import LibraryCategory from "./LibraryCategory.vue";
import LibraryToolbar from "./LibraryToolbar.vue";

const categories: Array<{
  kind: LibraryKind;
  title: string;
  unit: string;
  action: string;
  href: string;
}> = [
  {
    kind: "article",
    title: "Articles",
    unit: "items",
    action: "View all articles",
    href: "/notes/"
  },
  {
    kind: "prompt",
    title: "Prompts",
    unit: "items",
    action: "View all prompts",
    href: "/prompt-collection/"
  },
  {
    kind: "excerpt",
    title: "Excerpts",
    unit: "items",
    action: "View all excerpts",
    href: "/excerpts/"
  }
];

const query = ref("");
const activeKind = ref<LibraryKind | "all">("all");
let queryUrlTimer: ReturnType<typeof setTimeout> | undefined;

const latestUpdated = computed(() => libraryItems[0]?.updated ?? "");
const filteredItems = computed(() =>
  libraryItems.filter(
    (item) =>
      (activeKind.value === "all" || item.kind === activeKind.value) &&
      matchesLibraryItem(item, query.value)
  )
);

function itemsFor(kind: LibraryKind) {
  return libraryItems.filter((item) => item.kind === kind);
}

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
        {{ libraryItems.length }} items
        <template v-if="latestUpdated">
          · Last updated <time :datetime="latestUpdated">{{ latestUpdated }}</time>
        </template>
      </p>
    </header>

    <div class="library-categories" aria-label="Library categories">
      <LibraryCategory
        v-for="category in categories"
        :key="category.kind"
        v-bind="category"
        :count="itemsFor(category.kind).length"
        :latest="itemsFor(category.kind).slice(0, 3)"
      />
    </div>

    <section class="library-results-section" aria-labelledby="library-results-title">
      <h2 id="library-results-title">All items</h2>
      <LibraryToolbar
        :query="query"
        :active-kind="activeKind"
        :result-count="filteredItems.length"
        @update:query="handleQuery"
        @change-kind="handleKind"
      />

      <div v-if="filteredItems.length" class="library-results">
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
              · {{ item.updated }} · {{ LIBRARY_STATUS_LABELS[item.status] }}
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
            <span>{{ LIBRARY_STATUS_LABELS[item.status] }}</span>
          </span>
        </a>
      </div>

      <div v-else class="library-empty" role="status">
        <h3>No results found</h3>
        <p>Try another search term or clear the current filters.</p>
        <button type="button" @click="clearFilters">Clear filters</button>
      </div>
    </section>
  </div>
</template>
