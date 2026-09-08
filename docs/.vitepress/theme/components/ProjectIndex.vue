<script setup lang="ts">
import { computed } from "vue";
import { PROJECTS } from "../../content/projects.mjs";
const props = withDefaults(defineProps<{
  kind?: "project" | "tool";
  variant?: "index" | "hub";
  external?: boolean;
}>(), { variant: "index", external: false });
const projects = computed(() => PROJECTS.filter(project => !props.kind || project.kind === props.kind));
</script>

<template>
  <div v-if="variant === 'hub'" class="hub-list">
    <article v-for="project in projects" :key="project.slug" class="hub-entry">
      <div class="hub-entry__body"><h3>{{ project.title }}</h3><p>{{ project.summary }}</p></div>
      <a class="hub-entry__action" :href="`/projects/${project.slug}/`">View project</a>
    </article>
  </div>
  <div v-else class="content-index" :aria-label="kind === 'tool' ? 'Tool list' : 'Project list'">
    <a v-for="project in projects" :key="project.slug" class="content-index-row"
      :href="external ? project.homepage : `/projects/${project.slug}/`" :target="external ? '_self' : undefined">
      <span class="content-index-meta">{{ project.statusLabel }}</span>
      <span class="content-index-title">{{ project.title }}</span>
      <span class="content-index-summary">{{ project.summary }}</span>
    </a>
  </div>
</template>
