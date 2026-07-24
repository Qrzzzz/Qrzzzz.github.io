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
  description: string;
  action: string;
  href: string;
}> = [
  {
    kind: "article",
    title: "文章",
    unit: "篇",
    description: "对技术、产品、组织与个人观察的长期写作。",
    action: "查看全部文章",
    href: "/notes/"
  },
  {
    kind: "prompt",
    title: "提示词",
    unit: "份",
    description: "经过整理、可以复制使用并持续修订的完整提示词。",
    action: "查看全部提示词",
    href: "/prompt-collection/"
  },
  {
    kind: "excerpt",
    title: "偶拾",
    unit: "则",
    description: "偶然遇见、值得保留的句子与段落。",
    action: "查看全部偶拾",
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
        共 {{ libraryItems.length }} 项内容
        <template v-if="latestUpdated">
          · 最近更新于 <time :datetime="latestUpdated">{{ latestUpdated }}</time>
        </template>
      </p>
    </header>

    <div class="library-categories" aria-label="资料库分类">
      <LibraryCategory
        v-for="category in categories"
        :key="category.kind"
        v-bind="category"
        :count="itemsFor(category.kind).length"
        :latest="itemsFor(category.kind).slice(0, 2)"
      />
    </div>

    <section class="library-results-section" aria-labelledby="library-results-title">
      <h2 id="library-results-title">全部内容</h2>
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
          :aria-label="`打开${item.displayTitle}`"
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
            <span class="library-result__summary">{{ item.description }}</span>
          </span>
          <span class="library-result__date">
            <time :datetime="item.updated">{{ item.updated }}</time>
            <span>{{ LIBRARY_STATUS_LABELS[item.status] }}</span>
          </span>
        </a>
      </div>

      <div v-else class="library-empty" role="status">
        <h3>没有找到相关内容</h3>
        <p>尝试更换关键词，或清除当前分类筛选。</p>
        <button type="button" @click="clearFilters">清除筛选</button>
      </div>
    </section>
  </div>
</template>
