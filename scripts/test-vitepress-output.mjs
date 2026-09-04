import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { generatedManifest } from "./lib/lyrics-card-docs.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(repositoryRoot, "docs/.vitepress/dist");
const cacheRoot = path.join(repositoryRoot, ".cache");
const excerptHtml = path.join(outputRoot, "excerpts/2026-07-17-03.html");
const vitepressBin = path.join(repositoryRoot, "node_modules/vitepress/bin/vitepress.js");
const pdfFixture = "%PDF-1.4\n% VitePress public attachment fixture\n";
const releaseLanguages = ["zh-CN", "zh-TW", "en", "fr", "ja", "es"];
let fixtureRoot;

function routeHtml(route) {
  const relative = route.replace(/^\/+|\/+$/g, "");
  return path.join(outputRoot, ...relative.split("/"), "index.html");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

try {
  assert.ok(existsSync(path.join(outputRoot, "index.html")), "请先运行 npm run docs:build，再验收生产构建产物。");
  mkdirSync(cacheRoot, { recursive: true });
  fixtureRoot = mkdtempSync(path.join(cacheRoot, "vitepress-output-test-"));
  const fixtureConfigRoot = path.join(fixtureRoot, ".vitepress");
  const fixtureOutput = path.join(fixtureConfigRoot, "dist");
  const publicFixtureRoot = path.join(fixtureRoot, "public/__vitepress-output-test");
  const siteConfigImport = path.relative(fixtureConfigRoot, path.join(repositoryRoot, "docs/.vitepress/config.mts")).replaceAll("\\", "/");
  mkdirSync(fixtureConfigRoot, { recursive: true });
  // Share the real Markdown settings without loading the full site's pages or theme.
  writeFileSync(
    path.join(fixtureConfigRoot, "config.mts"),
    `import siteConfig from ${JSON.stringify(siteConfigImport)};\n` +
    `export default { lang: siteConfig.lang, base: siteConfig.base, markdown: siteConfig.markdown };\n`,
    "utf8"
  );
  mkdirSync(publicFixtureRoot, { recursive: true });
  writeFileSync(
    path.join(fixtureRoot, "index.md"),
    `# 锚点与附件验收

[中文标题](#中文标题) · [第二个重复标题](#重复-1) · [下载 PDF](/__vitepress-output-test/manual.pdf)

## 中文标题

## 重复

## 重复

## 行内强调

**包含[链接](/)和行内代码的重点**。

<strong class="future-component-title">Component title</strong>
`,
    "utf8"
  );
  writeFileSync(path.join(publicFixtureRoot, "manual.pdf"), pdfFixture, "utf8");

  const build = spawnSync(process.execPath, [vitepressBin, "build", fixtureRoot], {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (build.error || build.status !== 0) {
    throw new Error(`VitePress 单页样例构建失败：\n${build.stderr || build.stdout || build.error}`);
  }

  const outputHtml = path.join(fixtureOutput, "index.html");
  const outputPdf = path.join(fixtureOutput, "__vitepress-output-test/manual.pdf");
  assert.ok(existsSync(outputHtml), "验收构建缺少 HTML 页面");
  const html = readFileSync(outputHtml, "utf8");
  assert.match(html, /id="中文标题"/, "中文标题锚点不稳定");
  assert.match(html, /id="重复"/, "第一个重复标题锚点缺失");
  assert.match(html, /id="重复-1"/, "第二个重复标题没有唯一锚点");
  assert.match(html, /href="#中文标题"/, "中文标题链接未指向实际锚点");
  assert.match(html, /href="#重复-1"/, "重复标题链接未指向第二个实际锚点");
  assert.match(html, /<strong><span class="text-emphasis">包含<a href="\/">链接<\/a>和行内代码的重点<\/span><\/strong>/, "生产 Markdown 配置未生成行内强调层");
  assert.match(html, /<strong class="future-component-title">Component title<\/strong>/, "普通 HTML 组件标题不应自动添加荧光层");
  assert.ok(existsSync(outputPdf), "public PDF 没有进入最终构建产物");
  assert.equal(readFileSync(outputPdf, "utf8"), pdfFixture, "最终 PDF 内容与 public 源文件不一致");

  assert.ok(existsSync(excerptHtml), "验收构建缺少第三则偶拾页面");
  const excerpt = readFileSync(excerptHtml, "utf8");
  assert.equal(
    (excerpt.match(/class="excerpt-rendering"/g) ?? []).length,
    2,
    "第三则偶拾没有渲染为两栏中文表达"
  );
  assert.match(
    excerpt,
    /<blockquote><p>公道世间唯白发，<br>贵人头上不曾饶。<\/p><\/blockquote><cite>杜牧《送隐者一绝》<\/cite>/,
    "第三则偶拾的古典近义表达结构缺失"
  );
  assert.doesNotMatch(
    excerpt,
    /<code>&lt;div class="excerpt-rendering"&gt;/,
    "第三则偶拾的网页错误显示了 HTML 源码"
  );

  const manifest = generatedManifest(path.join(repositoryRoot, "docs/projects/lyrics-card-generator/docs"));
  for (const language of releaseLanguages) {
    const release = manifest.routes.find(
      (entry) => entry.source?.startsWith("docs/releases/") && entry.source.endsWith(`.${language}.md`)
    );
    assert.ok(release, `导入清单缺少 ${language} Release Note`);
    const releaseOutput = routeHtml(release.route);
    assert.ok(existsSync(releaseOutput), `验收构建缺少 ${language} Release Note HTML`);
    const releaseHtml = readFileSync(releaseOutput, "utf8");
    assert.match(releaseHtml, new RegExp(`<html lang="${language}"`), `${language} 页面 html lang 错误`);
    const languageNav = releaseHtml.match(/<nav class="release-language-nav"[^>]*>[\s\S]*?<\/nav>/)?.[0];
    assert.ok(languageNav, `${language} 页面缺少可见语言导航`);
    assert.equal((languageNav.match(/aria-current="page"/g) ?? []).length, 1, `${language} 当前语言标记不唯一`);
    for (const candidate of releaseLanguages) {
      assert.ok(
        languageNav.includes(`lang="${candidate}" hreflang="${candidate}"`),
        `${language} 页面缺少 ${candidate} 的 lang/hreflang`
      );
    }
    assert.match(releaseHtml, /class="project-docs-sync sync-notice"/, `${language} 页面缺少同步说明`);
    assert.match(releaseHtml, /<p class="sync-notice__title">[^<]+<\/p>/, `${language} 同步标题不应使用正文强调标签`);
    assert.match(releaseHtml, /class="project-docs-sync import-source"/, `${language} 页面缺少可见来源信息`);
    assert.match(
      releaseHtml,
      new RegExp(`${escapeRegExp(manifest.repository)}/blob/${manifest.commit}/docs/releases/`),
      `${language} 页面缺少锁定 commit 的源文件链接`
    );
    assert.match(
      releaseHtml,
      new RegExp(`${escapeRegExp(manifest.repository)}/commit/${manifest.commit}`),
      `${language} 页面缺少 commit 链接`
    );
    assert.match(releaseHtml, new RegExp(`<code>${manifest.commit.slice(0, 8)}</code>`), `${language} 页面缺少短 SHA`);
    assert.match(
      releaseHtml,
      new RegExp(`<time datetime="${escapeRegExp(manifest.importedAt)}"`),
      `${language} 页面缺少同步时间`
    );
  }

  const releaseArchive = manifest.routes.find((entry) => entry.source === "docs/releases/README.md");
  assert.ok(releaseArchive, "导入清单缺少版本档案");
  const releaseArchiveHtml = readFileSync(routeHtml(releaseArchive.route), "utf8");
  assert.match(releaseArchiveHtml, /class="release-archive"/, "版本档案缺少可见版本列表");
  assert.match(releaseArchiveHtml, /<span class="release-archive__version">[^<]+<\/span>/, "版本号应使用独立组件标签");
  assert.doesNotMatch(releaseArchiveHtml, /<strong class="(?:sync-notice__title|release-archive__version)"/, "组件标签重新使用了正文强调结构");
  assert.match(releaseArchiveHtml, /class="project-docs-sync import-source"/, "版本档案缺少可见来源信息");

  console.log("[docs:output-test] 通过：独立样例的锚点、public PDF 与行内强调有效；生产产物的六语 html lang、偶拾排版、同步说明、版本号与可见来源信息均有效。");
} catch (error) {
  console.error(`[docs:output-test] ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  if (fixtureRoot) {
    assert.equal(path.dirname(path.resolve(fixtureRoot)), cacheRoot, "样例清理路径必须位于本站 .cache 内。");
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
}
