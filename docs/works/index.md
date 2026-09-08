---
title: Works
description: Projects and small tools built and maintained by Cherry Chu.
lang: en
outline: false
---

# Works

<p class="lead">Things I build for real use and keep working after the first release.</p>

<script setup>
import ProjectIndex from "../.vitepress/theme/components/ProjectIndex.vue";
</script>

<section class="hub-section" aria-labelledby="works-projects-title">
  <header class="hub-section__header">
    <h2 id="works-projects-title">Projects</h2>
    <a href="/projects/">View all projects</a>
  </header>
  <ProjectIndex kind="project" variant="hub" />
</section>

<section class="hub-section" aria-labelledby="works-tools-title">
  <header class="hub-section__header">
    <h2 id="works-tools-title">Tools</h2>
    <a href="/tools/">View all tools</a>
  </header>
  <ProjectIndex kind="tool" variant="hub" />
</section>
