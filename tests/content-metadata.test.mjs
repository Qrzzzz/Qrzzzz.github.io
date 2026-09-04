import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  parseFrontmatterDocument,
  validateLibraryContent,
  validateLibraryRecords
} from "../scripts/check-content-metadata.mjs";

function record(overrides = {}) {
  return {
    relativePath: "notes/example.md",
    url: "/notes/example",
    expectedKind: "article",
    frontmatter: {
      collection: "library",
      kind: "article",
      title: "示例文章",
      published: "2026-07-01",
      updated: "2026-07-02",
      status: "maintained",
      tags: ["测试"],
      featured: false,
      ...overrides
    }
  };
}

test("accepts every current Library item and keeps the index pages out", () => {
  const result = validateLibraryContent(process.cwd());
  const markdownFiles = ["notes", "prompt-collection", "excerpts"].flatMap((directory) =>
    readdirSync(`docs/${directory}`, { recursive: true })
      .filter((file) => file.endsWith(".md"))
      .map((file) => `${directory}/${file.replaceAll("\\", "/")}`)
  );

  assert.deepEqual(result.errors, []);
  assert.ok(markdownFiles.length > 0);
  assert.deepEqual(
    result.records.map((record) => record.relativePath).sort(),
    markdownFiles.filter((file) => path.basename(file) !== "index.md").sort()
  );
  assert.deepEqual(
    result.indexes.map((record) => record.relativePath).sort(),
    markdownFiles.filter((file) => path.basename(file) === "index.md").sort()
  );
});

test("parses scalar and list frontmatter fields", () => {
  const source = `---
collection: library
kind: article
title: 示例
featured: true
tags:
  - AI
  - 组织设计
---
`;
  const parsed = parseFrontmatterDocument(source, "fixture.md");

  assert.equal(parsed.error, undefined);
  assert.equal(parsed.frontmatter.featured, true);
  assert.deepEqual(parsed.frontmatter.tags, ["AI", "组织设计"]);
});

test("reports missing fields, invalid dates, and invalid enum values", () => {
  const errors = validateLibraryRecords([
    record({
      kind: "unknown",
      title: "",
      published: "2026/07/01",
      updated: "2026-06-30",
      status: "draft",
      tags: [],
      featured: "yes"
    })
  ]);

  assert.match(errors.join("\n"), /kind 无效/);
  assert.match(errors.join("\n"), /缺少 title/);
  assert.match(errors.join("\n"), /published 必须使用 YYYY-MM-DD/);
  assert.match(errors.join("\n"), /status 无效/);
  assert.match(errors.join("\n"), /tags 必须是非空字符串列表/);
  assert.match(errors.join("\n"), /featured 必须是布尔值/);
});

test("reports excerpt previews, duplicate URLs, and archived featured items", () => {
  const excerpt = record({
    kind: "excerpt",
    status: "archived",
    featured: true
  });
  excerpt.relativePath = "excerpts/example.md";
  excerpt.expectedKind = "excerpt";
  const duplicate = record();
  duplicate.relativePath = "notes/duplicate.md";

  const errors = validateLibraryRecords([excerpt, duplicate], [
    {
      relativePath: "notes/index.md",
      frontmatter: { collection: "library" }
    }
  ]);
  const message = errors.join("\n");

  assert.match(message, /必须提供 preview/);
  assert.match(message, /已归档，不能设为 featured/);
  assert.match(message, /重复 URL/);
  assert.match(message, /分类首页，不能加入 Library 内容列表/);
});

test("forbids article descriptions while requiring them for other Library kinds", () => {
  const articleWithDescription = record({
    description: "文章摘要不应继续存在。"
  });
  const promptWithoutDescription = record({ kind: "prompt" });
  promptWithoutDescription.relativePath = "prompt-collection/example.md";
  promptWithoutDescription.expectedKind = "prompt";

  const message = validateLibraryRecords([
    articleWithDescription,
    promptWithoutDescription
  ]).join("\n");

  assert.match(message, /文章，不应提供 description/);
  assert.match(message, /prompt-collection\/example\.md 缺少 description/);
});

test("wires the metadata check into the complete validation chain", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

  assert.equal(
    packageJson.scripts["docs:content-check"],
    "node scripts/check-content-metadata.mjs"
  );
  assert.match(packageJson.scripts.check, /npm run docs:content-check/);
});
