---
title: 维护这个网站
description: 在本地编辑、检查并发布 Qrzzzz.github.io。
---

# 维护这个网站

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

部署完成后，GitHub Pages 会自动更新网站内容。

## 同步项目文档

Lyrics Card Generator 的项目页与维护文档由上游仓库生成。不要直接修改 `docs/projects/lyrics-card-generator/` 下的生成文件；内容变更先进入上游，再在本站仓库根目录运行：

```bash
npm run docs:pull
```

同步过程会锁定上游 commit、改写站内链接、补充导航和来源信息，并按[正文写作与排版规范](/guide/writing-style)统一展示格式。同步完成后仍需运行 `npm run check`。

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

标题、段落、列表、引用、代码与媒体的完整写法见[正文写作与排版规范](/guide/writing-style)。
