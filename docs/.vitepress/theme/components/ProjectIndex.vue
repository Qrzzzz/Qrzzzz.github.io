<script setup lang="ts">
import { computed } from "vue";
import CatalogList from "./CatalogList.vue";
import { PROJECTS } from "../../content/projects.mjs";
const props = withDefaults(defineProps<{
  kind?: "project" | "tool";
  external?: boolean;
}>(), { external: false });
const projects = computed(() => PROJECTS.filter(project => !props.kind || project.kind === props.kind));
</script>

<template>
  <CatalogList class="content-index project-catalog" :aria-label="kind === 'tool' ? 'Tool list' : 'Project list'">
    <a v-for="project in projects" :key="project.slug" class="content-index-row catalog-entry"
      :href="external ? project.homepage : `/projects/${project.slug}/`" :target="external ? '_self' : undefined">
      <span class="project-catalog__body">
        <span class="content-index-title catalog-entry__title">{{ project.title }}</span>
        <span class="content-index-summary">{{ project.summary }}</span>
      </span>
      <span class="content-index-meta">{{ project.statusLabel }}</span>
    </a>
  </CatalogList>
</template>
