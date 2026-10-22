<script setup lang="ts">
import SiteIcon from "./SiteIcon.vue";
import { withBase } from "vitepress";
import { data as libraryItems } from "../content/library.data";
import { PROJECTS } from "../content/projects.mjs";
import HomePoetry from "./HomePoetry.vue";
</script>

<template>
  <div class="home-page">
    <h1 class="visually-hidden">Cherry Chu</h1>
    <section class="home-composition" aria-label="Poetry, library and projects">
      <nav class="home-actions" aria-label="Primary destinations">
        <a class="home-entry home-entry--library" :href="withBase('/library/')">
          <span class="home-entry__name">Library</span>
          <span class="home-entry__count">{{ libraryItems.length }}</span>
          <SiteIcon name="arrow-right" class="home-entry__arrow" />
        </a>
        <a class="home-entry home-entry--projects" :href="withBase('/projects/')">
          <span class="home-entry__name">Projects</span>
          <span class="home-entry__count">{{ PROJECTS.length }}</span>
          <SiteIcon name="arrow-right" class="home-entry__arrow" />
        </a>
      </nav>
      <HomePoetry />
    </section>
    <footer class="home-colophon">
      <a href="https://github.com/Qrzzzz" target="_blank" rel="noopener noreferrer">GitHub <SiteIcon name="arrow-up-right" /></a>
      <a :href="withBase('/docs/')">Docs <SiteIcon name="arrow-up-right" /></a>
    </footer>
  </div>
</template>
