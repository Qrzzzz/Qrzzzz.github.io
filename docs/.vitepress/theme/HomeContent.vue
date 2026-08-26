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
          Public projects, practical documentation, and writing worth keeping beyond the feed.
        </p>
        <nav class="home-actions" aria-label="Featured destinations">
          <a class="home-text-link" href="/library/">Library</a>
          <a class="home-text-link" href="/works/">Explore the work</a>
        </nav>
      </div>
    </section>
  </div>
</template>
