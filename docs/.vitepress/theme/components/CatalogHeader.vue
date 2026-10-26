<script setup lang="ts">
import SiteIcon from "../SiteIcon.vue";
import FadeContent from "../effects/FadeContent.vue";
defineProps<{
  title: string;
  description: string;
  parent?: string;
  parentHref?: string;
}>();
</script>

<template>
  <FadeContent as="header" class="catalog-header">
    <a v-if="parent && parentHref" class="catalog-header__parent" :href="parentHref">
      <SiteIcon name="arrow-left" /> {{ parent }}
    </a>
    <h1>{{ title }}</h1>
    <p class="catalog-header__description">{{ description }}</p>
  </FadeContent>
</template>
