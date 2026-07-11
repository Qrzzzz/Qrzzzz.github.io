---
title: 维护这个网站
description: 在本地编辑、检查并发布 Qrzzzz.github.io。
---

# 维护这个网站

这是一份留给自己的维护说明。改文案、加页面或发布更新时，按下面的顺序走一遍即可。

## 本地编辑

首次使用先安装依赖；之后启动开发服务器，终端会显示本地预览地址。

```bash
npm install
npm run docs:dev
```

## 发布前检查

正式构建必须通过。需要查看构建后的页面时，再启动预览服务。

```bash
npm run docs:build
npm run docs:preview
```

## 发布更新

1. 在 `docs` 中创建或修改 Markdown 文件。
2. 执行 `npm run docs:build`。
3. 提交更改并推送到 `main`。
4. 在仓库的 Actions 页面查看部署进度。

构建完成后，GitHub Pages 会自动更新。

## 新增页面

```md
---
title: 页面标题
description: 一句话说明这页解决什么问题。
---

# 页面标题

正文从这里开始。
```

::: tip
新页面不会自动出现在导航中。创建文件后，记得把入口补到索引页或 `config.mts`。
:::
