<template>
  <div class="home-content">
    <section class="home-latest" aria-labelledby="home-latest-title">
      <header class="home-section-heading">
        <div>
          <p>内容入口</p>
          <h2 id="home-latest-title">最近整理</h2>
        </div>
        <p>从一篇短文、一份维护说明或一个项目开始。</p>
      </header>

      <div class="home-entry-grid">
        <a class="home-entry" href="/guide/getting-started">
          <span class="home-entry__index">01</span>
          <span class="home-entry__body">
            <small>文档</small>
            <strong>维护这个网站</strong>
            <span>从本地编辑、构建检查到 GitHub Pages 发布。</span>
          </span>
          <span class="home-entry__arrow" aria-hidden="true">↗</span>
        </a>

        <a class="home-entry" href="/notes/why-this-site">
          <span class="home-entry__index">02</span>
          <span class="home-entry__body">
            <small>文章</small>
            <strong>为什么要有这个网站</strong>
            <span>给分散的文字与项目找一个长期入口。</span>
          </span>
          <span class="home-entry__arrow" aria-hidden="true">↗</span>
        </a>

        <a class="home-entry" href="/projects/">
          <span class="home-entry__index">03</span>
          <span class="home-entry__body">
            <small>项目</small>
            <strong>Lyrics Card Generator</strong>
            <span>从歌词编辑到图片导出的开源工具。</span>
          </span>
          <span class="home-entry__arrow" aria-hidden="true">↗</span>
        </a>
      </div>
    </section>

    <section class="home-principles" aria-labelledby="home-principles-title">
      <div class="home-principles__copy">
        <p>站点结构</p>
        <h2 id="home-principles-title">把内容放在能长期找到的地方。</h2>
        <p>
          文档写操作方法，文章留完整上下文，项目页只列公开且仍在维护的作品。内容准备好，再放进来。
        </p>
        <a href="/about">查看关于 <span aria-hidden="true">↗</span></a>
      </div>

      <ol class="home-principles__list">
        <li>
          <span>01</span>
          <div>
            <strong>文档</strong>
            <p>可复用的步骤、配置和维护说明。</p>
          </div>
        </li>
        <li>
          <span>02</span>
          <div>
            <strong>文章</strong>
            <p>需要完整上下文，不适合塞进信息流的文字。</p>
          </div>
        </li>
        <li>
          <span>03</span>
          <div>
            <strong>项目</strong>
            <p>已经公开，也准备继续维护的作品。</p>
          </div>
        </li>
      </ol>
    </section>
  </div>
</template>
