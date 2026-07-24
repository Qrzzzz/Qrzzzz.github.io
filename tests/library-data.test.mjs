import assert from "node:assert/strict";
import test from "node:test";
import {
  matchesLibraryItem,
  normalizeLibraryItem,
  normalizeLibraryPages
} from "../docs/.vitepress/content/library.ts";
import {
  collectLibraryRecords
} from "../scripts/check-content-metadata.mjs";

function sourcePage(url, frontmatter = {}) {
  return {
    url,
    frontmatter: {
      collection: "library",
      kind: "article",
      title: "示例",
      description: "示例摘要",
      published: "2026-07-01",
      updated: "2026-07-01",
      status: "maintained",
      tags: ["示例"],
      featured: false,
      ...frontmatter
    }
  };
}

test("normalizes all 14 Library records from one metadata source", () => {
  const { records } = collectLibraryRecords(process.cwd());
  const items = normalizeLibraryPages(
    records.map(({ url, frontmatter }) => ({ url, frontmatter }))
  );
  const counts = Object.fromEntries(
    ["article", "prompt", "excerpt"].map((kind) => [
      kind,
      items.filter((item) => item.kind === kind).length
    ])
  );

  assert.equal(items.length, records.length);
  assert.deepEqual(counts, { article: 3, prompt: 7, excerpt: 4 });
  assert.equal(items[0].updated, "2026-07-23");
  assert.equal(new Set(items.map((item) => item.url)).size, items.length);
});

test("uses excerpt previews as display titles without changing their page titles", () => {
  const item = normalizeLibraryItem(
    sourcePage("/excerpts/2026-07-17-03", {
      kind: "excerpt",
      title: "偶拾 · 2026-07-17 · 03",
      preview: "棋局结束时，国王与卒子归入同一盒中。",
      status: "stable"
    })
  );

  assert.equal(item.title, "偶拾 · 2026-07-17 · 03");
  assert.equal(item.displayTitle, "棋局结束时，国王与卒子归入同一盒中。");
});

test("sorts by updated date descending and then title in zh-CN order", () => {
  const items = normalizeLibraryPages([
    sourcePage("/older", {
      title: "Older",
      updated: "2026-07-01"
    }),
    sourcePage("/same-b", {
      title: "Beta",
      updated: "2026-07-02"
    }),
    sourcePage("/same-a", {
      title: "Alpha",
      updated: "2026-07-02"
    })
  ]);

  assert.deepEqual(
    items.map((item) => item.url),
    ["/same-a", "/same-b", "/older"]
  );
});

test("matches title, description, excerpt preview, tags, and content type", () => {
  const excerpt = normalizeLibraryItem(
    sourcePage("/excerpt", {
      kind: "excerpt",
      title: "偶拾 01",
      preview: "棋局结束时，国王与卒子归入同一盒中。",
      description: "偶然遇见，值得留下的一段文字。",
      status: "stable",
      tags: ["人生"]
    })
  );
  const article = normalizeLibraryItem(
    sourcePage("/article", {
      title: "一个“低占有欲”公司的巨大野心",
      description: "从组织边界讨论克制、开源与长期研究。",
      tags: ["AI", "DeepSeek"]
    })
  );

  assert.equal(matchesLibraryItem(excerpt, "棋局"), true);
  assert.equal(matchesLibraryItem(excerpt, "人生"), true);
  assert.equal(matchesLibraryItem(excerpt, "偶拾"), true);
  assert.equal(matchesLibraryItem(article, "DeepSeek"), true);
  assert.equal(matchesLibraryItem(article, "长期研究"), true);
  assert.equal(matchesLibraryItem(article, "不存在"), false);
});

test("rejects archived featured content during normalization", () => {
  assert.throws(
    () =>
      normalizeLibraryItem(
        sourcePage("/archived", {
          status: "archived",
          featured: true
        })
      ),
    /不能设为 featured/
  );
});
