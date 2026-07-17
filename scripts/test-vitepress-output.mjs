import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { generatedManifest } from "./lib/lyrics-card-docs.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const markdownFixture = path.join(repositoryRoot, "docs/__vitepress-output-test.md");
const publicFixtureRoot = path.join(repositoryRoot, "docs/public/__vitepress-output-test");
const publicFixture = path.join(publicFixtureRoot, "manual.pdf");
const outputRoot = path.join(repositoryRoot, ".cache/vitepress-output-test");
const outputHtml = path.join(outputRoot, "__vitepress-output-test.html");
const outputPdf = path.join(outputRoot, "__vitepress-output-test/manual.pdf");
const excerptHtml = path.join(outputRoot, "excerpts/2026-07-17-03.html");
const vitepressBin = path.join(repositoryRoot, "node_modules/vitepress/bin/vitepress.js");
const pdfFixture = "%PDF-1.4\n% VitePress public attachment fixture\n";
const releaseLanguages = ["zh-CN", "zh-TW", "en", "fr", "ja", "es"];

function routeHtml(route) {
  const relative = route.replace(/^\/+|\/+$/g, "");
  return path.join(outputRoot, ...relative.split("/"), "index.html");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

try {
  rmSync(outputRoot, { recursive: true, force: true });
  mkdirSync(publicFixtureRoot, { recursive: true });
  writeFileSync(
    markdownFixture,
    `# 锚点与附件验收

[中文标题](#中文标题) · [第二个重复标题](#重复-1) · [下载 PDF](/__vitepress-output-test/manual.pdf)

## 中文标题

## 重复

## 重复
`,
    "utf8"
  );
  writeFileSync(publicFixture, pdfFixture, "utf8");

  const build = spawnSync(process.execPath, [vitepressBin, "build", "docs", "--outDir", outputRoot], {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });
  if (build.error || build.status !== 0) {
    throw new Error(`VitePress 验收构建失败：\n${build.stderr || build.stdout || build.error}`);
  }

  assert.ok(existsSync(outputHtml), "验收构建缺少 HTML 页面");
  const html = readFileSync(outputHtml, "utf8");
  assert.match(html, /id="中文标题"/, "中文标题锚点不稳定");
  assert.match(html, /id="重复"/, "第一个重复标题锚点缺失");
  assert.match(html, /id="重复-1"/, "第二个重复标题没有唯一锚点");
  assert.match(html, /href="#中文标题"/, "中文标题链接未指向实际锚点");
  assert.match(html, /href="#重复-1"/, "重复标题链接未指向第二个实际锚点");
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
    /<blockquote><p>公道世间唯白发，贵人头上不曾饶。<\/p><\/blockquote><cite>杜牧《送隐者一绝》<\/cite>/,
    "第三则偶拾的古典近义表达结构缺失"
  );
  assert.doesNotMatch(
    excerpt,
    /<code>&lt;div class="excerpt-rendering"&gt;/,
    "第三则偶拾的网页错误显示了 HTML 源码"
  );

  const manifest = generatedManifest(path.join(repositoryRoot, "docs/projects/lyrics-card-generator/docs"));
  for (const language of releaseLanguages) {
    const release = manifest.routes.find((entry) => entry.source?.endsWith(`.${language}.md`));
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
    assert.match(releaseHtml, /class="project-docs-sync import-source"/, `${language} 页面缺少可见来源信息`);
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
  assert.match(releaseArchiveHtml, /class="project-docs-sync import-source"/, "版本档案缺少可见来源信息");

  console.log("[docs:output-test] 通过：锚点、public PDF、六语 html lang 与可见来源信息均有效。");
} catch (error) {
  console.error(`[docs:output-test] ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  rmSync(markdownFixture, { force: true });
  rmSync(publicFixtureRoot, { recursive: true, force: true });
  rmSync(outputRoot, { recursive: true, force: true });
}
