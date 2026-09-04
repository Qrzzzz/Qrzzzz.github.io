import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createMarkdownRenderer } from "vitepress";
import { CONTENT_FORMAT, PROJECT_READMES, importProjectReadme } from "../scripts/lib/project-readmes.mjs";

const SHA = "b".repeat(40);
const IMPORTED_AT = "2026-08-19T00:00:00.000Z";

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "project-readme-"));
  writeFileSync(
    path.join(root, "README.md"),
    `<div align="center">\n\n# Demo Project\n\n### Demo tagline\n\n</div>\n\n---\n\n` +
    `![Preview](./assets/preview.png)\n\n[English](./README.en.md)\n\n* Item\n`
  );
  mkdirSync(path.join(root, "assets"));
  writeFileSync(path.join(root, "assets/preview.png"), "fixture");
  writeFileSync(path.join(root, "index.html"), "<title>Demo</title>");
  return root;
}

test("imports a README into a commit-bound in-site project page", () => {
  const root = fixture();
  const output = path.join(root, "output/index.md");
  const project = {
    slug: "demo",
    repository: "Qrzzzz/demo",
    title: "Demo Project",
    description: "Demo description.",
    summary: "Demo summary.",
    status: "stable",
    statusLabel: "稳定版",
    sourcePath: "README.md",
    homepage: "https://example.com"
  };
  try {
    const entry = importProjectReadme({ project, sourceRoot: root, outputRoot: output, commitSha: SHA, importedAt: IMPORTED_AT });
    const page = readFileSync(output, "utf8");
    assert.equal(entry.sourceMode, "readme");
    assert.equal(entry.status, "stable");
    assert.match(page, new RegExp(`^contentFormat: "${CONTENT_FORMAT}"$`, "m"));
    assert.match(page, new RegExp(`^sourceCommit: "${SHA}"$`, "m"));
    assert.match(page, /This page is synchronized from upstream/);
    assert.match(page, new RegExp(`raw\.githubusercontent\.com/Qrzzzz/demo/${SHA}/assets/preview\.png`));
    assert.match(page, new RegExp(`github\.com/Qrzzzz/demo/blob/${SHA}/README\.en\.md`));
    assert.match(page, /^- Item$/m);
    assert.match(page, new RegExp(`github\.com/Qrzzzz/demo/commit/${SHA}`));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("preserves the full upstream README layout while pinning relative links", async () => {
  const root = fixture();
  const output = path.join(root, "output/index.md");
  const project = { ...PROJECT_READMES.find((entry) => entry.slug === "bili-downloader") };
  const source = [
    '<div align="center">',
    "",
    "# 📺 Original heading",
    "",
    "### Original tagline",
    "",
    "**Original summary**",
    "",
    '<p><a href="./docs/releases/v2.3.md">Release notes</a> · <a href="#features">Features</a></p>',
    "",
    "![Platform](https://img.shields.io/badge/Platform-Windows-blue)",
    "![Preview](./assets/preview.png)",
    "",
    "</div>",
    "",
    "---",
    "",
    "> Original notice",
    "",
    '<a id="features"></a>',
    "",
    "## ✨ Features",
    "",
    "* BiliDownloader.v2.3.exe",
    "* Line one  ",
    "  Line two",
    "",
    "| Format | Output |",
    "| --- | --- |",
    "| Video | MP4 |",
    "",
    "<details>",
    "<summary><strong>Build commands</strong></summary>",
    "",
    "```powershell",
    ".\\build.ps1 -Clean -OneFile",
    "# [Example](./do-not-rewrite.md)",
    "```",
    "",
    "</details>"
  ].join("\n");
  try {
    assert.equal(project.preserveReadmeFormatting, true);
    writeFileSync(path.join(root, "README.md"), source.replaceAll("\n", "\r\n"));
    importProjectReadme({ project, sourceRoot: root, outputRoot: output, commitSha: SHA, importedAt: IMPORTED_AT });
    const page = readFileSync(output, "utf8");
    const expected = source
      .replace('./docs/releases/v2.3.md', `https://github.com/${project.repository}/blob/${SHA}/docs/releases/v2.3.md`)
      .replace('./assets/preview.png', `https://raw.githubusercontent.com/${project.repository}/${SHA}/assets/preview.png`);
    assert.ok(page.includes(expected), "Upstream content and formatting must be unchanged apart from relative links");
    assert.doesNotMatch(page, /<p class="lead">/);
    assert.match(page, /preserves the upstream content and formatting/);
    assert.ok(page.indexOf('class="project-docs-sync sync-notice"') > page.indexOf("</details>"));

    const markdown = await createMarkdownRenderer("docs");
    const html = markdown.render(expected);
    assert.match(html, /<div align="center">\s*<h1[^>]*>📺 Original heading/);
    assert.match(html, /<h3[^>]*>Original tagline/);
    assert.match(html, /<strong>Original summary<\/strong>/);
    assert.match(html, /<img[^>]+alt="Platform"/);
    assert.match(html, /<a id="features"><\/a>/);
    assert.match(html, /Line one<br\s*\/?>/);
    assert.match(html, /<table[\s\S]*<td>MP4<\/td>/);
    assert.match(html, /<details>\s*<summary><strong>Build commands<\/strong><\/summary>\s*<div class="language-powershell/);
    assert.match(html, /<pre[^>]*>[\s\S]*<code>/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("uses an explicit, non-README fallback only while README is absent", () => {
  const root = fixture();
  rmSync(path.join(root, "README.md"));
  const output = path.join(root, "output/index.md");
  const project = {
    slug: "demo",
    repository: "Qrzzzz/demo",
    title: "Demo Project",
    description: "Demo description.",
    summary: "Demo summary.",
    status: "online",
    statusLabel: "在线作品",
    sourcePath: "index.html",
    homepage: "https://example.com",
    readmeFallback: true
  };
  try {
    const entry = importProjectReadme({ project, sourceRoot: root, outputRoot: output, commitSha: SHA, importedAt: IMPORTED_AT });
    const page = readFileSync(output, "utf8");
    assert.equal(entry.sourceMode, "fallback");
    assert.match(page, /The source repository does not currently contain a README/);
    assert.match(page, /This page uses a transparent fallback/);
    assert.match(page, /Demo summary\./);

    writeFileSync(path.join(root, "README.md"), "# Newly added");
    assert.throws(
      () => importProjectReadme({ project, sourceRoot: root, outputRoot: output, commitSha: SHA, importedAt: IMPORTED_AT }),
      /已新增 README\.md/
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("imports new releases and rewritten README copy without pinning a version label", () => {
  const root = fixture();
  const output = path.join(root, "output/index.md");
  const project = PROJECT_READMES.find((entry) => entry.slug === "bili-downloader");
  try {
    for (const source of [
      "# Bili Downloader\n\nDownload BiliDownloader.v9.0.exe.\n",
      "# Bili Downloader\n\nThe download section has moved.\n"
    ]) {
      writeFileSync(path.join(root, "README.md"), source);
      const entry = importProjectReadme({ project, sourceRoot: root, outputRoot: output, commitSha: SHA, importedAt: IMPORTED_AT });
      const page = readFileSync(output, "utf8");
      assert.ok(page.includes(source.trim()));
      assert.equal(entry.statusLabel, "Stable · Windows");
      assert.equal(entry.commit, SHA);
      assert.doesNotMatch(page, /Stable 2\.3/);
    }

    // Relaxing prose checks must not bypass source identity or missing-file errors.
    assert.throws(
      () => importProjectReadme({ project, sourceRoot: root, outputRoot: output, commitSha: "invalid" }),
      /commit SHA 无效/
    );
    rmSync(path.join(root, "README.md"));
    assert.throws(
      () => importProjectReadme({ project, sourceRoot: root, outputRoot: output, commitSha: SHA }),
      /缺少 README\.md/
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("wires all project sync and check scripts into deployment", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  const workflow = readFileSync(".github/workflows/deploy.yml", "utf8");
  const navigationCheck = readFileSync("scripts/check-site-navigation.mjs", "utf8");
  assert.equal(packageJson.scripts["docs:pull"], "node scripts/pull-project-docs.mjs");
  assert.equal(packageJson.scripts["docs:check"], "node scripts/check-project-docs.mjs");
  assert.match(workflow, /name: Pull project documentation\s+run: npm run docs:pull/);
  assert.doesNotMatch(workflow, /Checkout lyrics-card-generator docs/);
  assert.match(navigationCheck, /"\/second-glow\/"/);
  assert.match(navigationCheck, /"\/AI-slop-site\/"/);
});
