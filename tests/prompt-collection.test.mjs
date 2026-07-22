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
  assert.match(index, /class="content-index-title">复杂决策顾问<\/span>/);
  assert.match(index, /class="content-index-title">证据校准研究员<\/span>/);
  assert.match(index, /href="\/prompt-collection\/x-community-note-fact-checker"/);
  assert.match(index, /class="content-index-title">X Community Note 事实核查助手<\/span>/);
  assert.match(index, /href="\/prompt-collection\/chinese-wikipedia-entry-edit-review-assistant"/);
  assert.match(index, /class="content-index-title">中文维基条目编辑与复核助手<\/span>/);
  assert.match(index, /href="\/prompt-collection\/learning-mode-tutor"/);
  assert.match(index, /class="content-index-title">学习模式导师<\/span>/);
  assert.doesNotMatch(index, /<strong class="content-index-title"/);
  assert.doesNotMatch(index, /严谨研究与决策助手|最高严谨度研究与分析助手/);
  assert.match(config, /text: "复杂决策顾问"/);
  assert.match(config, /text: "证据校准研究员"/);
  assert.match(config, /text: "X Community Note 事实核查助手"/);
  assert.match(config, /text: "中文维基条目编辑与复核助手"/);
  assert.match(config, /text: "学习模式导师"/);
  assert.doesNotMatch(config, /text: "(?:严谨研究与决策助手|最高严谨度研究与分析助手)"/);
});

test("preserves the two-stage Chinese Wikipedia editing and review boundary", () => {
  const prompt = readFileSync(`${promptRoot}/chinese-wikipedia-entry-edit-review-assistant.md`, "utf8");
  const editStage = prompt.indexOf("## 编辑阶段");
  const reviewStage = prompt.indexOf("## 复核阶段");

  assert.match(prompt, /^# 中文维基条目编辑与复核助手$/m);
  assert.equal((prompt.match(/^```md$/gm) ?? []).length, 2);
  assert.ok(editStage >= 0 && reviewStage > editStage, "编辑阶段应位于独立复核阶段之前");
  assert.match(prompt, /本阶段只负责编辑，不进行最终链接可访问性或全文复核/);
  assert.match(prompt, /请执行独立的“复核阶段”，不要擅自扩写或改变条目结构/);
  assert.match(prompt, /实际访问全部外部链接并报告状态/);
  assert.match(prompt, /检查维基语法、模板和参考文献能否正确解析/);
  assert.match(prompt, /若无问题，也要明确说明已经检查的项目/);
});

test("preserves the Community Note fact-checking and submission gate", () => {
  const prompt = readFileSync(`${promptRoot}/x-community-note-fact-checker.md`, "utf8");

  assert.match(prompt, /^# X Community Note 事实核查助手$/m);
  assert.match(prompt, /请明确说明“不建议写 Note”/);
  assert.match(prompt, /Community Note 必须按照原帖主要语言来写/);
  assert.match(prompt, /证据不足，暂不建议提交/);
  assert.match(prompt, /权威、真实、可访问、非 404 的来源链接/);
  assert.match(prompt, /如果无法找到足够权威且可访问的来源，请不要硬写 Note/);
  assert.match(prompt, /- 是否建议提交 Community Note：/);
  assert.match(prompt, /- 不确定性或仍需核验的地方：/);
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
