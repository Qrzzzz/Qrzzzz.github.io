import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const promptRoot = "docs/prompt-collection";

test("keeps the collection title in English while localizing the visible index copy", () => {
  const index = readFileSync(`${promptRoot}/index.md`, "utf8");
  const config = readFileSync("docs/.vitepress/config.mts", "utf8");

  assert.match(index, /^# Prompt Collection$/m);
  assert.match(index, /^## 提示词$/m);
  assert.match(index, /aria-label="提示词列表"/);
  assert.doesNotMatch(index, /A growing library|Chinese-language|Research · Analysis/);
  assert.match(config, /text: "Library", link: "\/library\/"/);
  assert.doesNotMatch(config, /text: "提示词合集", link: "\/prompt-collection\/"/);
  assert.match(config, /"\/prompt-collection\/": \[/);
  assert.match(config, /aside: true/);
  assert.match(index, /href="\/prompt-collection\/rigorous-research-decision-assistant"/);
  assert.match(index, />复杂决策顾问<\/strong>/);
  assert.match(index, />证据校准研究员<\/strong>/);
  assert.match(index, /href="\/prompt-collection\/learning-mode-tutor"/);
  assert.match(index, />学习模式导师<\/strong>/);
  assert.doesNotMatch(index, /严谨研究与决策助手|最高严谨度研究与分析助手/);
  assert.match(config, /text: "复杂决策顾问"/);
  assert.match(config, /text: "证据校准研究员"/);
  assert.match(config, /text: "学习模式导师"/);
  assert.doesNotMatch(config, /text: "(?:严谨研究与决策助手|最高严谨度研究与分析助手)"/);
});

test("preserves the learning-mode tutoring protocol", () => {
  const prompt = readFileSync(`${promptRoot}/learning-mode-tutor.md`, "utf8");

  assert.match(prompt, /^# 学习模式导师$/m);
  assert.match(prompt, /默认按高中一年级学生能够理解的程度解释/);
  assert.match(prompt, /一次只问一个问题；每问一步，都等待用户回答后再继续/);
  assert.match(prompt, /两次尝试后再公布答案/);
  assert.match(prompt, /第一条回复不要直接解题/);
  assert.match(prompt, /不要直接给出作业答案，也不要替用户完成作业/);
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

test("uses the native always-visible page outline without custom folding", () => {
  const layout = readFileSync("docs/.vitepress/theme/Layout.vue", "utf8");
  const config = readFileSync("docs/.vitepress/config.mts", "utf8");
  const styles = readFileSync("docs/.vitepress/theme/styles/content.css", "utf8");
  const tokens = readFileSync("docs/.vitepress/theme/styles/tokens.css", "utf8");

  assert.match(config, /sidebar:\s*\{/);
  assert.match(config, /aside: true/);
  assert.match(config, /outline:\s*\{\s*label: "页面导航",\s*level: "deep"/s);
  assert.doesNotMatch(layout, /OutlineToggle|useLineOutline|#aside-outline-before/);
  assert.equal(existsSync("docs/.vitepress/theme/OutlineToggle.vue"), false);
  assert.equal(existsSync("docs/.vitepress/theme/useLineOutline.ts"), false);
  assert.equal(existsSync("docs/.vitepress/theme/ReadingOutline.vue"), false);
  assert.equal(existsSync("docs/.vitepress/theme/readingOutlineRuntime.mjs"), false);
  assert.doesNotMatch(styles, /outline-toolbar|outline-is-collapsed|line-outline/);
  assert.match(
    styles,
    /\.VPDocAsideOutline \.outline-link::before\s*\{[^}]*background:\s*var\(--site-accent\)/s
  );
  assert.match(styles, /\.VPDocAsideOutline \.outline-link:hover::before,[\s\S]*?opacity:\s*1/);
  assert.doesNotMatch(tokens, /--site-menu-prelayer/);
  assert.match(styles, /\.back-to-top\.is-visible/);
  assert.match(styles, /conic-gradient\(/);
  assert.doesNotMatch(styles, /\.back-to-top[\s\S]*?box-shadow:\s*0\s+10px/);
});

test("reproduces the macOS code window and hides line numbers by default", () => {
  const config = readFileSync("docs/.vitepress/config.mts", "utf8");
  const codeStyles = readFileSync("docs/.vitepress/theme/styles/code.css", "utf8");
  const customStyles = readFileSync("docs/.vitepress/theme/custom.css", "utf8");

  assert.match(config, /lineNumbers: false/);
  assert.match(customStyles, /@import "\.\/styles\/code\.css"/);
  assert.match(
    codeStyles,
    /\.vp-doc div\[class\*="language-"\]\s*\{[^}]*box-shadow:\s*0 10px 30px 0 rgb\(0 0 0 \/ 40%\)[^}]*padding-top:\s*20px/s
  );
  assert.match(codeStyles, /background-color:\s*#ff5f56/);
  assert.match(codeStyles, /box-shadow:\s*20px 0 0 #ffbd2e, 40px 0 0 #27c93f/);
  assert.match(codeStyles, /\.vp-code-group\s*\{[^}]*box-shadow:\s*0 10px 30px 0 rgb\(0 0 0 \/ 40%\)/s);
});
