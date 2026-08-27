<script setup lang="ts">
import ParticleText from "./ParticleText.vue";
</script>

<template>
  <div class="home-page">
    <section class="home-intro" aria-labelledby="home-title">
      <h1
        id="home-title"
        class="home-title"
        aria-label="Cherry Chu"
      >
        <ParticleText text="Cherry Chu" />
      </h1>
      <nav class="home-actions" aria-label="Primary destinations">
        <a class="home-text-link" href="/library/">Browse the Library</a>
        <a class="home-text-link" href="/works/">View the projects</a>
      </nav>
    </section>
  </div>
</template>
