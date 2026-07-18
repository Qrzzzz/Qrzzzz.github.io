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

`docs:pull` 会更新 `Qrzzzz/lyrics-card-generator` 的稀疏本地缓存，以根目录 `README.md` 生成项目页，并导入其 `docs/` 下的项目文档。两类生成内容都被 Git 忽略，并在构建前从同一个上游 commit 重新同步。运行 `npm run check` 可依次完成导入器测试、路由与链接检查、生产构建和 Pages 边界检查。

## 许可

原创源码采用 [MIT License](./LICENSE)。站点文章与其他非代码内容不在 MIT 授权范围内；第三方组件与素材按各自许可使用，详见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。
