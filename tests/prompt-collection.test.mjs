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
  const enhancer = readFileSync("docs/.vitepress/theme/useLineOutline.ts", "utf8");
  const styles = readFileSync("docs/.vitepress/theme/styles/content.css", "utf8");

  assert.match(layout, /useLineOutline\(\)/);
  assert.match(enhancer, /\.VPDocAsideOutline\.has-outline/);
  assert.match(enhancer, /page\.value\.relativePath/);
  assert.match(styles, /counter\(line-outline-item, decimal-leading-zero\)/);
  assert.match(styles, /--line-outline-shift/);
});
