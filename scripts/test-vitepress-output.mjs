import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const markdownFixture = path.join(repositoryRoot, "docs/__vitepress-output-test.md");
const publicFixtureRoot = path.join(repositoryRoot, "docs/public/__vitepress-output-test");
const publicFixture = path.join(publicFixtureRoot, "manual.pdf");
const outputRoot = path.join(repositoryRoot, ".cache/vitepress-output-test");
const outputHtml = path.join(outputRoot, "__vitepress-output-test.html");
const outputPdf = path.join(outputRoot, "__vitepress-output-test/manual.pdf");
const vitepressBin = path.join(repositoryRoot, "node_modules/vitepress/bin/vitepress.js");
const pdfFixture = "%PDF-1.4\n% VitePress public attachment fixture\n";

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

  console.log("[docs:output-test] 通过：中文锚点、重复锚点和 public PDF 构建产物均有效。");
} catch (error) {
  console.error(`[docs:output-test] ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  rmSync(markdownFixture, { force: true });
  rmSync(publicFixtureRoot, { recursive: true, force: true });
  rmSync(outputRoot, { recursive: true, force: true });
}
