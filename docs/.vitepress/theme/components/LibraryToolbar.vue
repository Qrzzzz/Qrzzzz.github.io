<script setup lang="ts">
import type { LibraryKind } from "../../content/library";

defineProps<{
  query: string;
  activeKind: LibraryKind | "all";
  resultCount: number;
}>();

const emit = defineEmits<{
  "update:query": [value: string];
  "change-kind": [kind: LibraryKind | "all"];
}>();

const filters: Array<{ value: LibraryKind | "all"; label: string }> = [
  { value: "all", label: "全部" },
  { value: "article", label: "文章" },
  { value: "prompt", label: "提示词" },
  { value: "excerpt", label: "偶拾" }
];

function handleInput(event: Event) {
  emit("update:query", (event.currentTarget as HTMLInputElement).value);
}
</script>

<template>
  <div class="library-toolbar">
    <label class="library-search">
      <span>搜索资料库</span>
      <input
        type="search"
        :value="query"
        placeholder="搜索标题、摘要或标签……"
        autocomplete="off"
        @input="handleInput"
      />
    </label>

    <div class="library-toolbar__filters" aria-label="按内容类型筛选">
      <button
        v-for="filter in filters"
        :key="filter.value"
        type="button"
        class="library-filter"
        :class="{ 'library-filter--active': activeKind === filter.value }"
        :aria-pressed="activeKind === filter.value"
        @click="emit('change-kind', filter.value)"
      >
        {{ filter.label }}
      </button>
    </div>

    <p class="library-toolbar__count" aria-live="polite">
      找到 {{ resultCount }} 项内容
    </p>
  </div>
</template>
