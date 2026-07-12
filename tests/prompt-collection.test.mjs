import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const promptRoot = "docs/prompt-collection";

test("keeps the collection title in English while localizing the visible index copy", () => {
  const index = readFileSync(`${promptRoot}/index.md`, "utf8");
  const config = readFileSync("docs/.vitepress/config.mts", "utf8");

  assert.match(index, /^# Prompt Collection$/m);
  assert.match(index, /^## 提示词$/m);
  assert.match(index, /aria-label="提示词列表"/);
  assert.doesNotMatch(index, /A growing library|Chinese-language|Research · Analysis/);
  assert.match(config, /text: "提示词合集", link: "\/prompt-collection\/"/);
  assert.match(config, /text: "合集概览"/);
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

test("enhances generated page outlines for any Markdown page with sections", () => {
  const layout = readFileSync("docs/.vitepress/theme/Layout.vue", "utf8");
  const toggle = readFileSync("docs/.vitepress/theme/OutlineToggle.vue", "utf8");
  const enhancer = readFileSync("docs/.vitepress/theme/useLineOutline.ts", "utf8");
  const styles = readFileSync("docs/.vitepress/theme/styles/content.css", "utf8");

  assert.match(layout, /useLineOutline\(\)/);
  assert.match(enhancer, /\.VPDocAsideOutline\.has-outline/);
  assert.match(enhancer, /page\.value\.relativePath/);
  assert.match(enhancer, /--outline-item-index/);
  assert.match(toggle, /outline-prelayers/);
  assert.match(toggle, /outline-is-opening/);
  assert.match(toggle, /aria-controls="site-page-outline"/);
  assert.match(styles, /counter\(line-outline-item, decimal-leading-zero\)/);
  assert.match(styles, /@keyframes outline-layer-enter/);
  assert.match(styles, /@keyframes outline-panel-enter/);
  assert.match(styles, /@keyframes outline-item-enter/);
  assert.match(styles, /outline-is-collapsed > :not\(\.outline-toolbar\)/);
  assert.match(styles, /animation-delay: calc\(20ms \+ var\(--outline-item-index/);
  assert.doesNotMatch(styles, /animation-delay: calc\(150ms/);
  assert.match(styles, /--line-outline-shift/);
  assert.match(styles, /outline-link\[data-outline-level="2"\]/);
  assert.match(styles, /outline-link\[data-outline-level="3"\]\s*\{\s*display:\s*none;/s);
  assert.match(styles, /li:hover\s*>\s*\.VPDocOutlineItem\.nested/);
  assert.match(styles, /outline-is-collapsed/);
  assert.match(styles, /\.back-to-top\.is-visible/);
  assert.match(styles, /VPDoc\.has-aside\.outline-is-collapsed/);
  assert.match(styles, /conic-gradient\(/);
  assert.doesNotMatch(styles, /\.back-to-top[\s\S]*?box-shadow:\s*0\s+10px/);
});
