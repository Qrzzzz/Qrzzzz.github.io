import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import {
  buildOutlineModel,
  MAX_INLINE_SECTIONS,
  MIN_INLINE_SECTIONS
} from "../docs/.vitepress/theme/readingOutlineRuntime.mjs";

const promptRoot = "docs/prompt-collection";

test("keeps the collection title in English while localizing the visible index copy", () => {
  const index = readFileSync(`${promptRoot}/index.md`, "utf8");
  const config = readFileSync("docs/.vitepress/config.mts", "utf8");

  assert.match(index, /^# Prompt Collection$/m);
  assert.match(index, /^## 提示词$/m);
  assert.match(index, /aria-label="提示词列表"/);
  assert.doesNotMatch(index, /A growing library|Chinese-language|Research · Analysis/);
  assert.match(config, /text: "提示词合集", link: "\/prompt-collection\/"/);
  assert.match(config, /sidebar: false/);
  assert.match(config, /aside: false/);
  assert.match(index, /href="\/prompt-collection\/rigorous-research-decision-assistant"/);
});

test("marks every prompt body as Markdown inside its existing code block", () => {
  const promptFiles = readdirSync(promptRoot)
    .filter((name) => name.endsWith(".md") && name !== "index.md")
    .map((name) => readFileSync(`${promptRoot}/${name}`, "utf8"));

  assert.ok(promptFiles.length > 0);
  for (const prompt of promptFiles) {
    assert.match(prompt, /```md\r?\n/);
    assert.doesNotMatch(prompt, /```text\r?\n/);
  }
});

test("renders long pages with an inline outline and an on-demand outline popover", () => {
  const layout = readFileSync("docs/.vitepress/theme/Layout.vue", "utf8");
  const outline = readFileSync("docs/.vitepress/theme/ReadingOutline.vue", "utf8");
  const styles = readFileSync("docs/.vitepress/theme/styles/content.css", "utf8");

  assert.match(layout, /<ReadingOutline \/>/);
  assert.match(layout, /#doc-before/);
  assert.doesNotMatch(layout, /OutlineToggle|useLineOutline/);
  assert.equal(existsSync("docs/.vitepress/theme/OutlineToggle.vue"), false);
  assert.equal(existsSync("docs/.vitepress/theme/useLineOutline.ts"), false);
  assert.match(outline, /<Teleport/);
  assert.match(outline, /reading-outline-inline/);
  assert.match(outline, /reading-outline-popover/);
  assert.match(outline, /event\.key !== "Escape"/);
  assert.match(outline, /aria-controls="reading-outline-popover"/);
  assert.match(styles, /\.reading-outline-inline nav/);
  assert.match(styles, /\.reading-outline-control\[data-visible\]/);
  assert.match(styles, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /\.VPLocalNav\s*\{\s*display: none !important;/s);
  assert.match(styles, /\.back-to-top\.is-visible/);
  assert.match(styles, /conic-gradient\(/);
  assert.doesNotMatch(styles, /\.back-to-top[\s\S]*?box-shadow:\s*0\s+10px/);
});

test("keeps nested headings in the popover while limiting the inline outline", () => {
  const entries = [
    { id: "a", text: "第一节", level: 2 },
    { id: "a-child", text: "第一节细目", level: 3 },
    { id: "b", text: "第二节", level: 2 },
    { id: "c", text: "第三节", level: 2 },
    { id: "", text: "无效标题", level: 2 }
  ];
  const model = buildOutlineModel(entries, 2);

  assert.equal(MIN_INLINE_SECTIONS, 3);
  assert.equal(MAX_INLINE_SECTIONS, 8);
  assert.equal(model.hasInlineOutline, true);
  assert.equal(model.hasMore, true);
  assert.deepEqual(model.inlineHeaders.map(({ id }) => id), ["a", "b"]);
  assert.deepEqual(model.headers.map(({ id }) => id), ["a", "a-child", "b", "c"]);
});
