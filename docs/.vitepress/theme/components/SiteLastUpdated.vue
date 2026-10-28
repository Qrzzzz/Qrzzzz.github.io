<script setup lang="ts">
import { computed } from "vue";
import { useData } from "vitepress";
import { formatSiteDate } from "../siteDate.mjs";

const { page } = useData();
const datetime = computed(() => new Date(page.value.lastUpdated!).toISOString());
</script>

<template>
  <p class="VPLastUpdated">Updated: <time :datetime="datetime">{{ formatSiteDate(page.lastUpdated) }}</time></p>
</template>

<style scoped>
.VPLastUpdated { margin: 0; color: var(--site-text-muted); font-size: var(--site-ui-meta-size); font-weight: 400; line-height: 24px; }
</style>
