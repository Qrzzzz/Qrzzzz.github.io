<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  parent?: string;
  parentHref?: string;
}>();
</script>

<template>
  <header class="catalog-header">
    <a v-if="parent && parentHref" class="catalog-header__parent" :href="parentHref">
      <span aria-hidden="true">←</span> {{ parent }}
    </a>
    <h1>{{ title }}</h1>
    <p class="catalog-header__description">{{ description }}</p>
  </header>
</template>
