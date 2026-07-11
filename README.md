# Qrzzzz.github.io

Qrzzzz 的个人网站源码，基于 VitePress 构建。

## 本地开发

```bash
npm ci
npm run docs:pull
npm run docs:dev
```

## 构建与预览

```bash
npm run docs:build
npm run docs:preview
```

`docs:pull` 会更新 `Qrzzzz/lyrics-card-generator` 的稀疏本地缓存，仅导入其 `docs/`，并重新生成被 Git 忽略的项目文档路由。运行 `npm run check` 可依次完成导入器测试、路由与链接检查、生产构建和 Pages 边界检查。
