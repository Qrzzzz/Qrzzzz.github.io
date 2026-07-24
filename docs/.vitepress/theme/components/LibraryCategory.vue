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
  description: string;
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

    <p class="library-category__description">{{ description }}</p>

    <div class="library-category__latest">
      <span>最近</span>
      <ul>
        <li v-for="item in latest" :key="item.url">
          <a :href="item.url">{{ item.displayTitle }}</a>
        </li>
      </ul>
    </div>

    <a class="library-category__action" :href="href">{{ action }}</a>
  </section>
</template>
