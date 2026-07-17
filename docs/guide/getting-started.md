---
title: 维护这个网站
description: 在本地编辑、检查并发布 Qrzzzz.github.io。
---

# 维护这个网站

本文记录网站日常维护所需的基本操作，包括本地编辑、构建检查和发布更新。

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

提交更新前，应先执行正式构建，确认项目能够正常编译。

```bash
npm run docs:build
```

如需检查构建后的页面，可启动本地预览服务：

```bash
npm run docs:preview
```

## 发布更新

1. 在 `docs` 目录中创建或修改 Markdown 文件。
2. 执行 `npm run docs:build`，确认构建通过。
3. 提交更改并推送到 `main` 分支。
4. 前往仓库的 Actions 页面查看部署状态。

部署完成后，GitHub Pages 会自动更新网站内容。

## 新增页面

新页面可以使用以下模板：

```md
---
title: 页面标题
description: 一句话说明本页的主要内容。
---

# 页面标题

正文从这里开始。
```
