<script setup lang="ts">
import TextType from "./TextType.vue";
</script>

<template>
  <div class="home-page">
    <section class="home-intro" aria-labelledby="home-title">
      <p class="home-byline">
        <span>Qrzzzz</span>
        <span aria-hidden="true">/</span>
        <span>Cherry Chu</span>
      </p>
      <h1
        id="home-title"
        class="home-title"
        aria-label="我做工具，也写下为什么这样做。"
      >
        <span class="home-title-reserve" aria-hidden="true">
          我做工具，也写下为什么这样做。_
        </span>
        <TextType
          text="我做工具，也写下为什么这样做。"
          :typing-speed="90"
          :deleting-speed="45"
          :pause-duration="2600"
          :initial-delay="350"
          cursor-character="_"
          aria-hidden="true"
        />
      </h1>
      <p class="home-deck">
        这里放着 Qrzzzz 的公开项目、维护文档，以及不想交给信息流决定寿命的文字。
      </p>
      <nav class="home-actions" aria-label="首页入口">
        <a class="home-text-link" href="/projects/lyrics-card-generator/">看正在做的项目</a>
        <a class="home-text-link" href="/notes/why-this-site">读一篇文章</a>
      </nav>
    </section>

    <section id="about" class="home-section home-author" aria-labelledby="home-author-heading">
      <header class="home-section-heading">
        <h2 id="home-author-heading">Cherry Chu</h2>
      </header>
      <div>
        <nav class="home-author-links" aria-label="作者相关链接">
          <a class="home-text-link" href="/about">关于这个站点</a>
          <a class="home-text-link" href="https://github.com/Qrzzzz">在 GitHub 上找到我</a>
        </nav>
      </div>
    </section>
  </div>
</template>
