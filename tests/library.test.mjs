import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const library = readFileSync("docs/library/index.md", "utf8");
const config = readFileSync("docs/.vitepress/config.mts", "utf8");
const layout = readFileSync("docs/.vitepress/theme/Layout.vue", "utf8");
const readingOutline = readFileSync("docs/.vitepress/theme/ReadingOutline.vue", "utf8");
const styles = readFileSync("docs/.vitepress/theme/styles/content.css", "utf8");

function contentRoutes(directory) {
  return readdirSync(`docs/${directory}`)
    .filter((name) => name.endsWith(".md") && name !== "index.md")
    .map((name) => `/${directory}/${name.slice(0, -3)}`);
}

test("merges the three content areas into one Library navigation entry", () => {
  assert.match(config, /\{ text: "Library", link: "\/library\/" \}/);
  assert.doesNotMatch(config, /\{ text: "(?:文档|文章|提示词合集)", link:/);
  assert.match(library, /^# Library$/m);
  assert.match(library, />文档<\/a><\/h2>/);
  assert.match(library, />文章<\/a><\/h2>/);
  assert.match(library, />Prompt Collection<\/a><\/h2>/);
});

test("links every document, article, and prompt from the Library page", () => {
  const routes = [
    ...contentRoutes("guide"),
    ...contentRoutes("notes"),
    ...contentRoutes("prompt-collection")
  ];

  assert.ok(routes.length > 0);
  for (const route of routes) {
    assert.ok(library.includes(`href="${route}"`), `Library 缺少内容入口：${route}`);
  }
});

test("renders Library as a responsive folder grid", () => {
  assert.match(layout, /relativePath\.startsWith\("library\/"\)/);
  assert.match(library, /^outline: false$/m);
  assert.match(readingOutline, /frontmatter\.value\.outline === false/);
  assert.match(readingOutline, /startsWith\("library\/"\)/);
  assert.match(library, /class="library-folder"/);
  assert.match(library, /class="library-folder library-folder--wide"/);
  assert.match(styles, /\.library-folders\s*\{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(styles, /@media \(max-width: 767px\)[\s\S]*?\.library-folders\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
});
