<script setup lang="ts">
withDefaults(defineProps<{ detailsLabel?: string }>(), {
  detailsLabel: "作者与资料详情"
});
</script>

<template>
  <header class="article-header">
    <slot />
    <details v-if="$slots.details" class="article-header__details">
      <summary>{{ detailsLabel }}</summary>
      <slot name="details" />
    </details>
  </header>
</template>

<style scoped>
.article-header { max-width: var(--site-reading); overflow-wrap: anywhere; }
.article-header :deep(h1) { margin-bottom: 16px; line-height: 1.4; }
.article-header :deep(p) { margin-block: 10px; }
.article-header :deep(.lead) { margin-bottom: 14px; }
.article-header :deep(p:not(.lead)) { font-size: 14px; line-height: 1.7; }
.article-header .article-header__details { margin-block: 16px 24px; padding-block: 0; }
.article-header__details summary { min-height: 44px; padding-block: 10px; font-size: 14px; }
</style>
