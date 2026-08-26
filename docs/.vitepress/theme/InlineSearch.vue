<script setup lang="ts">
import localSearchIndex from "@localSearchIndex";
import type MiniSearch from "minisearch";
import type { SearchResult } from "minisearch";
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { useData, useRouter } from "vitepress";
import {
  isSearchShortcut,
  moveSearchSelection,
  resolveSearchTargetIndex
} from "./inlineSearchRuntime.mjs";

type SearchDocument = {
  title: string;
  titles: string[];
  text?: string;
};

type InlineSearchResult = SearchResult & SearchDocument;

const root = ref<HTMLElement>();
const trigger = ref<HTMLButtonElement>();
const input = ref<HTMLInputElement>();
const expanded = ref(false);
const query = ref("");
const selectedIndex = ref(-1);
const loading = ref(false);
const searchIndex = shallowRef<MiniSearch<SearchDocument>>();
const { localeIndex, theme } = useData();
const router = useRouter();

const results = computed<InlineSearchResult[]>(() => {
  const value = query.value.trim();
  if (!value || !searchIndex.value) return [];
  return searchIndex.value.search(value).slice(0, 8) as InlineSearchResult[];
});

const activeDescendant = computed(() =>
  selectedIndex.value >= 0 ? `inline-search-item-${selectedIndex.value}` : undefined
);

function isEditingContent(target: EventTarget | null) {
  const element = target instanceof HTMLElement ? target : null;
  return Boolean(
    element?.isContentEditable ||
    element?.matches("input, select, textarea")
  );
}

async function loadIndex() {
  const loader = localSearchIndex[localeIndex.value];
  if (!loader) {
    searchIndex.value = undefined;
    return;
  }

  loading.value = true;
  try {
    const [{ default: MiniSearchClass }, module] = await Promise.all([
      import("minisearch"),
      loader()
    ]);
    const options = theme.value.search?.provider === "local"
      ? theme.value.search.options?.miniSearch
      : undefined;
    searchIndex.value = markRaw(
      MiniSearchClass.loadJSON<SearchDocument>(module.default, {
        fields: ["title", "titles", "text"],
        storeFields: ["title", "titles"],
        searchOptions: {
          fuzzy: 0.2,
          prefix: true,
          boost: { title: 4, text: 2, titles: 1 },
          ...options?.searchOptions
        },
        ...options?.options
      })
    );
  } finally {
    loading.value = false;
  }
}

async function openSearch() {
  expanded.value = true;
  await nextTick();
  input.value?.focus();
}

function closeSearch(returnFocus = false) {
  expanded.value = false;
  query.value = "";
  selectedIndex.value = -1;
  if (returnFocus) nextTick(() => trigger.value?.focus());
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if (!isSearchShortcut(event, isEditingContent(event.target))) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void openSearch();
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (expanded.value && !root.value?.contains(event.target as Node)) {
    closeSearch();
  }
}

function handleInputKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    closeSearch(true);
    return;
  }

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    selectedIndex.value = moveSearchSelection(
      selectedIndex.value,
      results.value.length,
      event.key === "ArrowDown" ? 1 : -1
    );
    return;
  }

  if (event.key === "Enter") {
    const index = resolveSearchTargetIndex(selectedIndex.value, results.value.length);
    const target = results.value[index];
    if (!target) return;
    event.preventDefault();
    closeSearch();
    void router.go(target.id);
  }
}

function selectResult(index: number) {
  selectedIndex.value = index;
}

function resultContext(result: InlineSearchResult) {
  return result.titles?.filter(Boolean).join(" / ") ?? "";
}

function clearQuery() {
  query.value = "";
  selectedIndex.value = -1;
  nextTick(() => input.value?.focus());
}

watch(query, () => {
  selectedIndex.value = -1;
});
watch(localeIndex, loadIndex);
watch(
  () => router.route.path,
  () => closeSearch()
);

onMounted(() => {
  void loadIndex();
  window.addEventListener("keydown", handleGlobalKeydown, true);
  document.addEventListener("pointerdown", handleDocumentPointerDown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleGlobalKeydown, true);
  document.removeEventListener("pointerdown", handleDocumentPointerDown);
});
</script>

<template>
  <div ref="root" class="InlineSiteSearch" :class="{ 'is-expanded': expanded }">
    <button
      v-if="!expanded"
      ref="trigger"
      type="button"
      class="inline-search-trigger"
      aria-label="Search the site"
      aria-haspopup="listbox"
      @click="openSearch"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </svg>
      <span class="inline-search-placeholder">Search the site…</span>
      <kbd>Ctrl K</kbd>
    </button>

    <form v-else class="inline-search-form" role="search" @submit.prevent="">
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </svg>
      <label class="visually-hidden" for="inline-site-search-input">Search the site</label>
      <input
        id="inline-site-search-input"
        ref="input"
        v-model="query"
        type="search"
        role="combobox"
        aria-label="Search the site"
        aria-autocomplete="list"
        :aria-controls="query && results.length ? 'inline-search-results' : undefined"
        :aria-expanded="Boolean(query)"
        :aria-activedescendant="activeDescendant"
        autocomplete="off"
        autocapitalize="off"
        autocorrect="off"
        enterkeyhint="go"
        maxlength="64"
        placeholder="Search titles and page content…"
        spellcheck="false"
        @keydown="handleInputKeydown"
      />
      <button
        v-if="query"
        type="button"
        class="inline-search-action"
        aria-label="Clear search"
        @click="clearQuery"
      >
        ×
      </button>
      <button
        type="button"
        class="inline-search-action inline-search-close"
        aria-label="Close search"
        @click="closeSearch(true)"
      >
        Esc
      </button>
    </form>

    <div v-if="expanded && query" class="inline-search-panel">
      <p v-if="loading" class="inline-search-state">Loading search index…</p>
      <ul
        v-else-if="results.length"
        id="inline-search-results"
        role="listbox"
        aria-label="Search results"
      >
        <li
          v-for="(result, index) in results"
          :id="`inline-search-item-${index}`"
          :key="result.id"
          role="option"
          :aria-selected="selectedIndex === index"
        >
          <a
            :href="result.id"
            class="inline-search-result"
            :class="{ 'is-selected': selectedIndex === index }"
            @focus="selectResult(index)"
            @mouseenter="selectResult(index)"
            @click="closeSearch()"
          >
            <span v-if="resultContext(result)" class="inline-search-context">
              {{ resultContext(result) }}
            </span>
            <strong>{{ result.title }}</strong>
          </a>
        </li>
      </ul>
      <p v-else class="inline-search-state">No results for “{{ query }}”</p>
    </div>
  </div>
</template>

<style scoped>
.InlineSiteSearch {
  position: relative;
  z-index: 12;
  display: flex;
  width: 232px;
  flex: 0 1 232px;
  min-width: 40px;
  margin-right: 8px;
  transition: width 220ms cubic-bezier(0.2, 0.8, 0.2, 1), flex-basis 220ms ease;
}

.InlineSiteSearch.is-expanded {
  width: min(400px, 38vw);
  flex-basis: min(480px, 46vw);
}

.inline-search-trigger,
.inline-search-form {
  position: relative;
  width: 100%;
  height: 40px;
  border: 1px solid var(--site-line);
  border-radius: 9px;
  background: var(--site-surface-subtle);
  color: var(--site-text-muted);
  transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease;
}

.inline-search-trigger {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 10px;
  text-align: left;
}

.inline-search-trigger::after,
.inline-search-form::after {
  display: none;
  content: none;
}

.inline-search-trigger:hover,
.inline-search-trigger:focus-visible {
  border-color: var(--site-line-strong);
  background: var(--site-surface);
  color: var(--site-text);
}

.inline-search-trigger svg,
.inline-search-form > svg {
  width: 19px;
  height: 19px;
  flex: 0 0 auto;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-width: 1.8;
}

.inline-search-placeholder {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inline-search-trigger kbd {
  flex: 0 0 auto;
  padding: 2px 5px;
  border: 1px solid var(--site-line);
  border-radius: 5px;
  background: var(--site-surface);
  color: var(--site-text-faint);
  font-family: var(--site-font-mono);
  font-size: 11px;
}

.inline-search-form {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 10px;
  border-color: var(--site-line-strong);
  background: var(--site-surface);
  box-shadow: none;
}

.inline-search-form input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--site-text);
  font: inherit;
  font-size: 14px;
}

.inline-search-form input::-webkit-search-cancel-button {
  display: none;
}

.inline-search-form input::placeholder {
  color: var(--site-text-faint);
}

.inline-search-action {
  min-width: 30px;
  height: 30px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--site-text-muted);
  font-size: 17px;
}

.inline-search-action:hover {
  background: var(--site-surface-subtle);
  color: var(--site-text);
}

.inline-search-close {
  padding-inline: 7px;
  font-family: var(--site-font-mono);
  font-size: 10px;
}

.inline-search-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  left: 0;
  max-height: min(430px, calc(100vh - var(--vp-nav-height) - 28px));
  overflow-y: auto;
  border: 1px solid var(--site-line);
  border-radius: 14px;
  background: var(--site-surface);
  box-shadow: var(--site-shadow-float);
}

.inline-search-panel ul {
  margin: 0;
  padding: 6px;
  list-style: none;
}

.inline-search-result {
  display: flex;
  min-height: 54px;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  padding: 8px 10px;
  border-radius: 8px;
  color: var(--site-text);
  text-decoration: none;
}

.inline-search-result:hover,
.inline-search-result.is-selected {
  background: var(--site-surface-subtle);
}

.inline-search-result strong {
  overflow: hidden;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inline-search-context {
  overflow: hidden;
  color: var(--site-text-faint);
  font-size: 10px;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inline-search-state {
  margin: 0;
  padding: 18px;
  color: var(--site-text-muted);
  font-size: 13px;
  text-align: center;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 959px) and (min-width: 768px) {
  .InlineSiteSearch {
    width: min(230px, 30vw);
    flex-basis: 210px;
  }

  .InlineSiteSearch.is-expanded {
    width: min(360px, 44vw);
    flex-basis: min(420px, 48vw);
  }
}

@media (min-width: 768px) {
  .InlineSiteSearch {
    position: absolute;
    top: 50%;
    left: 50%;
    margin-right: 0;
    transform: translate(-50%, -50%);
  }
}

@media (min-width: 1200px) {
  .InlineSiteSearch {
    width: 280px;
    flex-basis: 280px;
  }

  .InlineSiteSearch.is-expanded {
    width: min(400px, 34vw);
  }
}

@media (max-width: 767.98px) {
  .InlineSiteSearch {
    width: 40px;
    flex: 0 0 40px;
    margin-right: 0;
  }

  .inline-search-trigger {
    justify-content: center;
    padding: 0;
    border-color: transparent;
    background: transparent;
  }

  .inline-search-placeholder,
  .inline-search-trigger kbd {
    display: none;
  }

  .InlineSiteSearch.is-expanded {
    position: fixed;
    top: 10px;
    right: 12px;
    left: 12px;
    z-index: 80;
    display: block;
    width: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .InlineSiteSearch {
    transition: none;
  }
}
</style>
