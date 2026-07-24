<script setup lang="ts">
import { computed } from "vue";
import { data as libraryItems } from "../../content/library.data";
import {
  LIBRARY_KIND_LABELS,
  LIBRARY_STATUS_LABELS,
  type LibraryKind
} from "../../content/library";

const props = defineProps<{
  kind: LibraryKind;
}>();

const items = computed(() =>
  libraryItems.filter((item) => item.kind === props.kind)
);
</script>

<template>
  <div
    v-if="items.length"
    class="library-results collection-index"
    :aria-label="`${LIBRARY_KIND_LABELS[kind]}列表`"
  >
    <a
      v-for="item in items"
      :key="item.url"
      class="library-result"
      :href="item.url"
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
  <p v-else class="library-empty">当前分类还没有内容。</p>
</template>
