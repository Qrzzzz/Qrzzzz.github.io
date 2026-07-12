<script setup lang="ts">
import AnimatedGeometry from "./AnimatedGeometry.vue";
</script>

<template>
  <div class="home-page">
    <section class="home-intro" aria-labelledby="home-title">
      <p class="home-byline">
        <span>Qrzzzz</span>
        <span aria-hidden="true">/</span>
        <span>Cherry Chu</span>
      </p>
      <h1 id="home-title" class="home-title">我做工具，也写下为什么这样做。</h1>
      <div class="home-geometry" aria-hidden="true">
        <AnimatedGeometry />
      </div>
      <p class="home-deck">
        这里放着 Qrzzzz 的公开项目、维护文档，以及不想交给信息流决定寿命的文字。
      </p>
      <nav class="home-actions" aria-label="首页入口">
        <a class="home-text-link" href="/projects/lyrics-card-generator/">看正在做的项目</a>
        <a class="home-text-link" href="/notes/why-this-site">读一篇文章</a>
      </nav>
    </section>

    <section class="home-section home-current" aria-labelledby="home-current-heading">
      <header class="home-section-heading">
        <h2 id="home-current-heading">当前项目</h2>
        <p>一件持续维护的开源作品，以及它完整、可追溯的项目文档。</p>
      </header>

      <div class="home-current-grid">
        <div>
          <h3 class="home-project-title">Lyrics Card Generator</h3>
          <p class="home-project-description">
            导入歌曲信息，编辑歌词和翻译，并把排版结果导出为高质量分享图片。
          </p>
        </div>

        <div>
          <ul class="home-project-meta" aria-label="项目技术与维护信息">
            <li>Next.js · TypeScript · Electron</li>
            <li>开源，持续维护</li>
          </ul>
          <nav class="home-project-links" aria-label="Lyrics Card Generator 项目入口">
            <a href="https://qrzzzz.github.io/lyrics-card-generator/">在线使用</a>
            <a href="https://github.com/Qrzzzz/lyrics-card-generator">查看源代码</a>
            <a href="/projects/lyrics-card-generator/docs/">阅读项目文档</a>
          </nav>
        </div>
      </div>
    </section>

    <section class="home-section" aria-labelledby="home-reading-heading">
      <header class="home-section-heading">
        <h2 id="home-reading-heading">精选内容</h2>
        <p>从一篇文章、一份维护说明和一个项目档案开始。</p>
      </header>

      <div class="home-reading-list">
        <a class="home-reading-row" href="/notes/why-this-site">
          <span>文章</span>
          <strong>为什么要有这个网站</strong>
          <span>给分散的文字与项目找一个长期入口。</span>
        </a>
        <a class="home-reading-row" href="/guide/getting-started">
          <span>文档</span>
          <strong>维护这个网站</strong>
          <span>从本地编辑、构建检查到 GitHub Pages 发布。</span>
        </a>
        <a class="home-reading-row" href="/projects/lyrics-card-generator/docs/">
          <span>项目</span>
          <strong>Lyrics Card Generator 项目文档</strong>
          <span>维护说明、桌面端资料与多语言版本记录。</span>
        </a>
        <a class="home-reading-row" href="/prompt-collection/">
          <span>Prompts</span>
          <strong>Prompt Collection</strong>
          <span>A growing library of reusable prompts.</span>
        </a>
      </div>
    </section>

    <section id="about" class="home-section home-author" aria-labelledby="home-author-heading">
      <header class="home-section-heading">
        <h2 id="home-author-heading">Cherry Chu</h2>
        <p>作者</p>
      </header>
      <div>
        <p>
          我在这里整理公开项目、工程文档和长期写作。内容会继续修订，但不交给信息流决定顺序和寿命。
        </p>
        <nav class="home-author-links" aria-label="作者相关链接">
          <a class="home-text-link" href="/about">关于这个站点</a>
          <a class="home-text-link" href="https://github.com/Qrzzzz">在 GitHub 上找到我</a>
        </nav>
      </div>
    </section>
  </div>
</template>
