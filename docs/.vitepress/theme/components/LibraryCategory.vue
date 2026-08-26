<script setup lang="ts">
import type {
  LibraryItem,
  LibraryKind
} from "../../content/library";

defineProps<{
  kind: LibraryKind;
  title: string;
  count: number;
  unit: string;
  latest: LibraryItem[];
  action: string;
  href: string;
}>();
</script>

<template>
  <section class="library-category" :aria-labelledby="`library-${kind}-title`">
    <header class="library-category__header">
      <div>
        <h2 :id="`library-${kind}-title`">{{ title }}</h2>
        <p>{{ count }} {{ unit }}</p>
      </div>
    </header>

    <div class="library-category__latest">
      <span>Latest additions</span>
      <ul>
        <li v-for="item in latest" :key="item.url">
          <a :href="item.url">{{ item.displayTitle }}</a>
        </li>
      </ul>
    </div>

    <a class="library-category__action" :href="href">{{ action }}</a>
  </section>
</template>
