import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { importLyricsCardDocs } from "../scripts/lib/lyrics-card-docs.mjs";

const SHA = "a".repeat(40);

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "lyrics-card-docs-"));
  const source = path.join(root, "docs");
  const output = path.join(root, "output");
  const publicOutput = path.join(root, "public-output");
  mkdirSync(path.join(source, "releases"), { recursive: true });
  mkdirSync(path.join(source, "assets"), { recursive: true });
  writeFileSync(
    path.join(source, "desktop.md"),
    "# Desktop\n\n[示例](./examples.md)\n\n![图](./assets/demo.png)\n\n[维护手册](./assets/manual.pdf)\n\n<details><summary>详情</summary>内容</details>\n"
  );
  writeFileSync(path.join(source, "examples.md"), "# Examples\n\n[版本](./releases/)\n");
  writeFileSync(
    path.join(source, "releases/README.md"),
    "# Releases\n\n[v1 中文](./v1.0.0.zh-CN.md) · [v1 English](./v1.0.0.en.md)\n"
  );
  writeFileSync(path.join(source, "releases/v1.0.0.zh-CN.md"), "# 第一版\n\n## 重复\n\n## 重复\n");
  writeFileSync(path.join(source, "releases/v1.0.0.en.md"), "Language: English\n\n## Changes\n");
  writeFileSync(path.join(source, "releases/v2.0.0.zh-CN.md"), "# 第二版\n");
  writeFileSync(path.join(source, "assets/demo.png"), "fixture");
  writeFileSync(path.join(source, "assets/manual.pdf"), "%PDF-1.4 fixture");
  return { root, source, output, publicOutput };
}

test("imports stable routes, links, assets and metadata", () => {
  const { root, source, output, publicOutput } = fixture();
  try {
    const manifest = importLyricsCardDocs({
      sourceRoot: source,
      outputRoot: output,
      publicOutputRoot: publicOutput,
      commitSha: SHA,
      importedAt: "2026-07-11T00:00:00.000Z"
    });
    assert.equal(manifest.markdownCount, 6);
    assert.equal(manifest.assetCount, 2);
    assert.deepEqual(
      manifest.assets.map((entry) => entry.output),
      [
        "projects/lyrics-card-generator/docs/assets/demo.png",
        "projects/lyrics-card-generator/docs/assets/manual.pdf"
      ]
    );
    assert.ok(manifest.routes.some((entry) => entry.route.endsWith("/desktop/")));
    assert.ok(manifest.routes.some((entry) => entry.route.endsWith("/releases/v1.0.0.en/")));
    const desktop = readFileSync(path.join(output, "desktop/index.md"), "utf8");
    assert.match(desktop, /\/projects\/lyrics-card-generator\/docs\/examples\//);
    assert.match(desktop, /\/projects\/lyrics-card-generator\/docs\/assets\/demo\.png/);
    assert.match(desktop, /\/projects\/lyrics-card-generator\/docs\/assets\/manual\.pdf/);
    assert.match(desktop, /<details><summary>详情<\/summary>/);
    assert.match(desktop, /<\/nav>\n\n# Desktop/);
    assert.match(desktop, /aria-current="page">桌面端维护<\/span>/);
    const release = readFileSync(path.join(output, "releases/v1.0.0.en/index.md"), "utf8");
    assert.match(release, /# v1\.0\.0 · English/);
    const releaseIndex = readFileSync(path.join(output, "releases/index.md"), "utf8");
    assert.match(releaseIndex, /## 全部版本说明/);
    assert.match(releaseIndex, /已从上游同步 \*\*2\*\* 个版本、\*\*3\*\* 篇/);
    assert.match(releaseIndex, /\[简体中文\]\(\/projects\/lyrics-card-generator\/docs\/releases\/v2\.0\.0\.zh-CN\/\)/);
    assert.match(releaseIndex, /\[English\]\(\/projects\/lyrics-card-generator\/docs\/releases\/v1\.0\.0\.en\/\)/);
    assert.ok(releaseIndex.indexOf("**v2.0.0**") < releaseIndex.indexOf("**v1.0.0**"));
    assert.ok(!existsSync(path.join(output, "assets/demo.png")));
    assert.ok(existsSync(path.join(publicOutput, "assets/demo.png")));
    assert.ok(existsSync(path.join(publicOutput, "assets/manual.pdf")));
    assert.match(readFileSync(path.join(output, "index.md"), "utf8"), new RegExp(SHA.slice(0, 8)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a repeated import removes deleted pages and discovers new Markdown", () => {
  const { root, source, output, publicOutput } = fixture();
  try {
    writeFileSync(path.join(source, "releases/obsolete.md"), "# Obsolete\n");
    importLyricsCardDocs({ sourceRoot: source, outputRoot: output, publicOutputRoot: publicOutput, commitSha: SHA });
    assert.ok(existsSync(path.join(output, "releases/obsolete/index.md")));
    assert.ok(existsSync(path.join(publicOutput, "assets/manual.pdf")));
    rmSync(path.join(source, "releases/obsolete.md"));
    rmSync(path.join(source, "assets/manual.pdf"));
    writeFileSync(
      path.join(source, "desktop.md"),
      "# Desktop\n\n[示例](./examples.md)\n\n![图](./assets/demo.png)\n"
    );
    writeFileSync(path.join(source, "releases/new-page.md"), "# New page\n");
    importLyricsCardDocs({ sourceRoot: source, outputRoot: output, publicOutputRoot: publicOutput, commitSha: SHA });
    assert.ok(!existsSync(path.join(output, "releases/obsolete")));
    assert.ok(!existsSync(path.join(publicOutput, "assets/manual.pdf")));
    assert.ok(existsSync(path.join(output, "releases/new-page/index.md")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("fails explicitly for unresolved links and duplicate routes", () => {
  const first = fixture();
  try {
    writeFileSync(path.join(first.source, "desktop.md"), "# Desktop\n\n[missing](./missing.md)\n");
    assert.throws(
      () => importLyricsCardDocs({
        sourceRoot: first.source,
        outputRoot: first.output,
        publicOutputRoot: first.publicOutput,
        commitSha: SHA
      }),
      /无法解析链接/
    );
    assert.ok(!existsSync(first.output));
    assert.ok(!existsSync(first.publicOutput));
  } finally {
    rmSync(first.root, { recursive: true, force: true });
  }

  const second = fixture();
  try {
    mkdirSync(path.join(second.source, "foo"));
    writeFileSync(path.join(second.source, "foo.md"), "# Foo\n");
    writeFileSync(path.join(second.source, "foo/README.md"), "# Duplicate Foo\n");
    assert.throws(
      () => importLyricsCardDocs({
        sourceRoot: second.source,
        outputRoot: second.output,
        publicOutputRoot: second.publicOutput,
        commitSha: SHA
      }),
      /路由重名/
    );
  } finally {
    rmSync(second.root, { recursive: true, force: true });
  }
});
