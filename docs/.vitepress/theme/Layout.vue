<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import ClickSpark from "./ClickSpark.vue";
import HomeContent from "./HomeContent.vue";

const { Layout } = DefaultTheme;
</script>

<template>
  <ClickSpark />

  <div class="site-atmosphere" aria-hidden="true">
    <span class="site-atmosphere__grid" />
    <span class="site-atmosphere__glow" />
  </div>

  <Layout>
    <template #home-hero-info-before>
      <p class="home-kicker">
        <span class="home-kicker__dot" />
        <span>SYSTEM / ONLINE</span>
      </p>
    </template>

    <template #home-features-after>
      <HomeContent />
    </template>
  </Layout>
</template>
