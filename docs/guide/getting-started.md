---
title: 本地开发与发布
---

# 本地开发与发布

<p class="lead">本文记录网站日常维护所需的基本操作，包括本地编辑、完整检查、项目文档同步和发布更新。</p>

## 本地编辑

首次运行项目时，需要先安装依赖。安装完成后，启动开发服务器，终端中会显示本地预览地址。

```bash
npm install
npm run docs:dev
```

后续进行本地编辑时，通常只需运行：

```bash
npm run docs:dev
```

## 发布前检查

提交更新前，在仓库根目录运行完整检查。它会依次验证站内测试、项目文档、构建产物和页面导航，而不只是确认 VitePress 能够编译。

```bash
npm run check
```

完整检查通过后，如需阅读全文或核对交互，可启动本地预览服务：

```bash
npm run docs:preview
```

## 发布更新

1. 在 `docs` 目录中创建或修改 Markdown 文件。
2. 执行 `npm run check`，确认内容、构建与导航检查全部通过。
3. 提交更改并推送到 `main` 分支。
4. 前往 GitHub 仓库的 Actions 页面查看部署状态。

部署完成后，GitHub Pages 会自动更新网站内容。纯 Markdown 内容更新会跳过浏览器回归，主题、构建脚本、测试或依赖发生变化时运行全套浏览器测试。依赖审计由独立工作流在依赖变化及每周定时执行，失败状态会保留在 Actions 中。

## 同步项目文档

Lyrics Card Generator 的项目页与维护文档由上游仓库生成。不要直接修改 `docs/projects/lyrics-card-generator/` 下的生成文件；内容变更先进入上游，再在本站仓库根目录运行：

```bash
npm run docs:pull
```

同步过程会锁定上游 commit、改写站内链接、补充导航和来源信息，并按[内容写作规范](/guide/writing-style)统一展示格式。同步完成后仍需运行 `npm run check`。

定时与上游通知触发的同步会刷新来源锁。来源没有变化时跳过构建与部署；有变化时先完成验证，再自动提交 `sources.lock.json` 并部署对应产物。普通 push 重放仓库中已提交的来源锁，避免回到旧的上游版本。若并发提交导致锁文件无法快进推送，本次部署会停止。

部署工作流在合并兼容资源后只生成一次 `build-info.json`。本地需要该文件时，可在完整检查后运行 `npm run docs:provenance`。

## 新增页面

新页面先确定主题、读者和内容边界，再使用具体标题与完整摘要。以下示例可以直接改写，不要保留示例文字：

```md
---
title: 记录一次站点发布
description: 记录本次内容变更、发布步骤与线上验证结果。
---

# 记录一次站点发布

<p class="lead">本文说明这次发布改了什么、如何完成检查，以及上线后确认了哪些结果。</p>

## 改动范围

列出本次新增、修改和保持不变的内容。
```

标题、段落、列表、引用、代码与媒体的完整写法见[内容写作规范](/guide/writing-style)。

## 新增或维护 Excerpts

摘录遵循[Excerpts 新增与维护规范](/guide/writing-style#excerpts-新增与维护)。每篇使用独立的日期文件，仅完整且有明确原题的作品使用 H1（`complete: true`）；节选与无题内容不加 H1（`complete: false`），原作题名只在文末出处提及。正文使用 Markdown。出处、译文和说明按固定顺序排列，没有的信息直接省略。

新增时先确定原题、原文语言及已知来源，再创建 `docs/excerpts/YYYY-MM-DD-NN.md`。修订已有内容时保留文件名、ID 和首次收录日期，只更新 `updated`。Library 与 Excerpts 索引自动发现元数据，无需手写列表；发布前复核正文、分行、出处链接和分享长图。
