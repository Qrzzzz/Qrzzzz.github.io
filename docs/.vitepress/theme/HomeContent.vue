<script setup lang="ts">
import ParticleText from "./ParticleText.vue";
</script>

<template>
  <div class="home-page">
    <section class="home-intro" aria-labelledby="home-title">
      <p class="home-byline">
        <span>Qrzzzz</span>
        <span aria-hidden="true">/</span>
        <span>Works &amp; writing</span>
      </p>
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

    <section id="about" class="home-section home-author" aria-labelledby="home-author-heading">
      <header class="home-section-heading">
        <h2 id="home-author-heading">Cherry Chu</h2>
      </header>
      <div>
        <nav class="home-author-links" aria-label="About the author">
          <a class="home-text-link" href="/about">About this site</a>
          <a class="home-text-link" href="https://github.com/Qrzzzz">Find me on GitHub</a>
        </nav>
      </div>
    </section>
  </div>
</template>
