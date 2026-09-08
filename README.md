# Qrzzzz.github.io

Qrzzzz 的个人网站源码，基于 VitePress 构建，使用 Node.js 24。

## 本地开发

```bash
npm ci
npm run docs:pull
npm run docs:dev
```

`docs:pull` 按已提交的 `sources.lock.json` 获取七个项目的完整 commit SHA。README、Lyrics Card Generator 文档、附件与来源清单先在临时目录生成并校验，全部成功后才替换上次输出；导入失败会保留上次可用内容。生成内容和 Git 缓存不提交。

项目名称、状态、仓库与独立工具地址统一维护于 `docs/.vitepress/content/projects.mjs`；Works、Projects、Tools 共用该目录。文章元数据由共享 YAML 解析器读取，校验和页面生成使用同一内容模型。

## 更新上游与重放构建

```bash
npm run docs:refresh
npm run check
npm run docs:e2e
npm run docs:audit
```

`docs:refresh` 显式解析各上游 `main` 的 SHA，成功后同时更新生成内容与锁文件。审核内容和路由变化后，将锁文件与本站修改一起提交。常规 push、PR 和手动 CI 使用已提交快照；定时任务及上游 dispatch 会先刷新快照，保留自动同步能力。这类自动构建不回写仓库，因此之后普通 push 仍使用仓库锁定的版本。

每次完整检查生成 `dist/build-info.json`，部署后可从站点根路径读取。文件包含本站 commit、七个上游 SHA、完整 sourceLock、依赖锁文件和导入器摘要、产物摘要及 Actions 运行 ID。重放某次自动部署时，将其 `sourceLock` 对象保存为独立 JSON，然后运行：

```bash
npm run docs:pull -- --lock path/to/deployment-sources.json
npm run check
```

重放会将该快照安装到当前 `sources.lock.json`。精确复现还需检出 build-info 中的本站 commit，并使用对应 Node 与 package-lock；时间戳和运行 ID 不参与产物摘要。上游提交必须仍可从仓库获取。

## 验证与预览

```bash
npm run check
npx playwright install chromium
npm run docs:e2e
npm run docs:audit
npm run docs:preview
```

`check` 包含 Vue/TypeScript 类型检查、单元测试、元数据检查、导入契约检查、一次完整生产构建、渲染产物检查、全站链接/锚点/媒体与可达性检查，以及构建来源记录。`docs:e2e` 启动独立预览服务，验证中文搜索按需加载、Library URL/历史、移动导航焦点、主题/语言和完整文章 PNG 导出。CI 同时要求浏览器测试和依赖审计通过才允许发布。

`config/public-routes.json` 记录已确认的公开 URL。新增页面经构建检查后可加入；删除或改名需要逐条审核并保留兼容路径，不能通过降低页面数量门槛绕过检查。独立部署的工具路径由共享项目目录确定，不按本站文件处理。

搜索索引只在打开搜索时加载，使用相同的中文分词器建索引与查询，并合并同页命中。VitePress 原生菜单的焦点及背景状态适配集中在 `navigationAccessibility.ts`，升级主题后应重跑移动端浏览器测试。

当前通过 overrides 将 Vite、PostCSS、nanoid 固定到已验证的修复版本。调整 VitePress 或 overrides 时必须运行完整检查、浏览器测试和依赖审计，确认主题及构建插件兼容，不能仅以安装成功作为验收。

`docs:output-test` 还会构建独立单页样例，验证锚点和 public 附件；样例不会进入正式站点。单独运行产物检查前应先执行 `npm run docs:build`。

## 许可

原创源码采用 [MIT License](./LICENSE)。站点文章与其他非代码内容不在 MIT 授权范围内；第三方组件与素材按各自许可使用，详见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。
