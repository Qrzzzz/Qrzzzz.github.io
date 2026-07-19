import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const config = readFileSync("docs/.vitepress/config.mts", "utf8");
const guideIndex = readFileSync("docs/guide/index.md", "utf8");
const library = readFileSync("docs/library/index.md", "utf8");
const writingStyle = readFileSync("docs/guide/writing-style.md", "utf8");
const styles = readFileSync("docs/.vitepress/theme/styles/content.css", "utf8");

test("publishes the writing style guide through every document entry point", () => {
  assert.match(writingStyle, /^title: 正文写作与排版规范$/m);
  assert.match(
    config,
    /\{ text: "正文写作与排版规范", link: "\/guide\/writing-style" \}/
  );
  assert.match(guideIndex, /href="\/guide\/writing-style"/);
  assert.match(library, /href="\/guide\/writing-style"/);
});

test("documents the common formats used in article content", () => {
  for (const section of [
    "页面起点",
    "标题与段落",
    "行内文本",
    "链接",
    "列表",
    "引用与出处",
    "代码",
    "表格",
    "术语与定义",
    "提示块",
    "折叠内容与分隔线",
    "图片、图注与无障碍文本",
    "发布前检查"
  ]) {
    assert.match(writingStyle, new RegExp(`^## ${section}$`, "m"));
  }

  for (const example of [
    "<mark>",
    "<kbd>",
    "<abbr",
    "<sub>",
    "<sup>",
    "<blockquote>",
    "<cite>",
    "<dl>",
    "<figure>",
    "::: info",
    "::: tip",
    "::: warning",
    "::: danger",
    "<details>",
    "<summary>展开查看移动端验收记录</summary>",
    "<small>"
  ]) {
    assert.ok(writingStyle.includes(example), `规范页缺少格式示例：${example}`);
  }

  assert.doesNotMatch(
    writingStyle,
    /::: details/,
    "折叠示例应沿用项目文章中的原生 details 样式，而不是提示卡样式"
  );
});

test("uses specific, publication-ready wording in every format example", () => {
  for (const example of [
    "title: 为个人文档站新增全文搜索",
    "发布前必须通过站内链接检查",
    "[站点维护流程](/guide/getting-started)",
    "展开查看移动端验收记录",
    "| 验收项 | 结果与说明 |",
    "手机端搜索面板打开后"
  ]) {
    assert.ok(writingStyle.includes(example), `规范页缺少细化示例：${example}`);
  }

  for (const placeholder of [
    /^title: 页面标题$/m,
    /description: 一句话说明本页的主要内容/,
    /^- 先写结论$/m,
    /好的格式不会抢走内容的声音/,
    /这里放背景资料、完整输出或次要示例/
  ]) {
    assert.doesNotMatch(writingStyle, placeholder);
  }
});

test("styles inline semantic formats for every VitePress document", () => {
  for (const selector of [
    "em",
    "del",
    "mark",
    "small",
    "abbr\\[title\\]",
    "kbd",
    "sup",
    "sub"
  ]) {
    assert.match(styles, new RegExp(`\\.vp-doc ${selector}\\s*\\{`));
  }

  assert.match(styles, /\.vp-doc h5\s*\{/);
  assert.match(styles, /\.vp-doc h6\s*\{/);
  assert.match(styles, /\.vp-doc \.lead\s*\{/);
});

test("styles structured article content and live format demonstrations", () => {
  for (const selector of [
    "blockquote footer",
    "blockquote cite",
    "dl",
    "dt",
    "dd",
    "figure",
    "figcaption",
    "table",
    "details"
  ]) {
    assert.match(styles, new RegExp(`\\.vp-doc ${selector}\\s*\\{`));
  }

  assert.match(styles, /\.vp-doc \.custom-block\.info\s*\{/);
  assert.match(styles, /\.vp-doc \.custom-block\.tip\s*\{/);
  assert.match(styles, /\.vp-doc \.custom-block\.warning\s*\{/);
  assert.match(styles, /\.vp-doc \.custom-block\.danger\s*\{/);
  assert.match(
    styles,
    /\.vp-doc \.custom-block\.info\s*\{[^}]*border-inline-start-color:\s*var\(--site-text-muted\)/s
  );
  assert.match(
    styles,
    /\.vp-doc \.custom-block\.tip\s*\{[^}]*border-inline-start-color:\s*var\(--vp-c-success-1\)/s
  );
  assert.match(
    styles,
    /\.vp-doc \.custom-block\.warning\s*\{[^}]*border-inline-start-color:\s*var\(--vp-c-warning-1\)/s
  );
  assert.match(
    styles,
    /\.vp-doc \.custom-block\.danger\s*\{[^}]*border-inline-start-color:\s*var\(--vp-c-danger-1\)/s
  );
  assert.match(styles, /\.vp-doc \.format-demo-label::after\s*\{/);
  assert.match(
    styles,
    /\.vp-doc details\s*\{[^}]*border-block:\s*1px solid var\(--site-line\)[^}]*padding:\s*16px 0/s
  );
  assert.match(
    styles,
    /\.vp-doc details summary::marker\s*\{[^}]*color:\s*var\(--site-accent\)/s
  );
});
