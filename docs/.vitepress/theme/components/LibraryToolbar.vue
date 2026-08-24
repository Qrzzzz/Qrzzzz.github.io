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
  { value: "all", label: "All" },
  { value: "article", label: "Articles" },
  { value: "prompt", label: "Prompts" },
  { value: "excerpt", label: "Excerpts" }
];

function handleInput(event: Event) {
  emit("update:query", (event.currentTarget as HTMLInputElement).value);
}
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

    <div class="library-toolbar__filters" aria-label="Filter by content type">
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
      {{ resultCount }} {{ resultCount === 1 ? "result" : "results" }}
    </p>
  </div>
</template>
