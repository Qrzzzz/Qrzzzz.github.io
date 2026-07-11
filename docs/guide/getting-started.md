---
title: 网站维护
description: 本网站的本地运行、构建与发布流程。
---

# 网站维护

本网站使用 VitePress 生成，并通过 GitHub Actions 发布到 GitHub Pages。

## 本地运行

```bash
npm install
npm run docs:dev
```

## 构建检查

```bash
npm run docs:build
npm run docs:preview
```

## 更新内容

1. 在 `docs` 目录中创建或修改 Markdown 文件。
2. 执行正式构建检查。
3. 提交并推送到 `main` 分支。
4. GitHub Actions 自动构建并发布网站。

## Markdown 示例

```ts
function greet(name: string): string {
  return `Hello, ${name}`;
}

console.log(greet("World"));
```

::: tip
VitePress 支持提示容器、代码高亮、表格、标题锚点和 Frontmatter。
:::
