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
        <ParticleText text="Cherry&#10;Chu" />
      </h1>
      <div class="home-intro-copy">
        <p class="home-deck">
          Projects I build, documentation I maintain, and writing I want to find again.
        </p>
        <nav class="home-actions" aria-label="Primary destinations">
          <a class="home-text-link" href="/library/">Browse the Library</a>
          <a class="home-text-link" href="/works/">View the projects</a>
        </nav>
      </div>
    </section>
  </div>
</template>
