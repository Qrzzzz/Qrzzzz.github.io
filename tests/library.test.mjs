import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const library = readFileSync("docs/library/index.md", "utf8");
const config = readFileSync("docs/.vitepress/config.mts", "utf8");
const layout = readFileSync("docs/.vitepress/theme/Layout.vue", "utf8");
const styles = readFileSync("docs/.vitepress/theme/styles/content.css", "utf8");

function contentRoutes(directory) {
  return readdirSync(`docs/${directory}`)
    .filter((name) => name.endsWith(".md") && name !== "index.md")
    .map((name) => `/${directory}/${name.slice(0, -3)}`);
}

test("merges the four content areas into one Library navigation entry", () => {
  const nav = config.match(/nav:\s*\[([\s\S]*?)\],\s*\n\s*sidebar:/)?.[1] ?? "";

  assert.match(config, /\{ text: "Library", link: "\/library\/" \}/);
  assert.doesNotMatch(nav, /\{ text: "(?:文档|文章|提示词合集|偶拾)", link:/);
  assert.match(library, /^# Library$/m);
  assert.match(library, />文档<\/a><\/h2>/);
  assert.match(library, />文章<\/a><\/h2>/);
  assert.match(library, />Prompt Collection<\/a><\/h2>/);
  assert.match(library, />偶拾<\/a><\/h2>/);
});

test("uses the visible Library introduction as the page description", () => {
  const frontmatterDescription = library.match(/^description:\s*(.+)$/m)?.[1];
  const visibleDescription = library.match(
    /^# Library\r?\n\r?\n<p class="lead">([^\r\n]+)<\/p>$/m
  )?.[1];

  assert.ok(frontmatterDescription);
  assert.equal(frontmatterDescription, visibleDescription);
});

test("links every document, article, prompt, and excerpt from the Library page", () => {
  const routes = [
    ...contentRoutes("guide"),
    ...contentRoutes("notes"),
    ...contentRoutes("prompt-collection"),
    ...contentRoutes("excerpts")
  ];

  assert.ok(routes.length > 0);
  for (const route of routes) {
    assert.ok(library.includes(`href="${route}"`), `Library 缺少内容入口：${route}`);
  }
});

test("renders Library as a responsive editorial index", () => {
  assert.match(layout, /relativePath\.startsWith\("library\/"\)/);
  assert.match(library, /^outline: false$/m);
  assert.match(config, /outline:\s*\{\s*label: "页面导航",\s*level: "deep"/s);
  assert.match(library, /class="library-folder"/);
  assert.match(library, /class="library-folder library-folder--wide"/);
  assert.match(library, /class="library-entry__title"/);
  assert.doesNotMatch(library, /<strong(?:\s|>)/);
  assert.match(styles, /\.library-folders\s*\{[^}]*border-top:\s*1px solid var\(--site-line\)/s);
  assert.match(
    styles,
    /\.library-folder\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*72px minmax\(210px, 240px\) minmax\(0, 1fr\)[^}]*border-bottom:\s*1px solid var\(--site-line\)[^}]*background:\s*transparent/s
  );
  assert.doesNotMatch(styles, /\.library-folder::before/);
  assert.match(
    styles,
    /\.site-layout\[data-page-kind="library"\] \.vp-doc h1\s*\{[^}]*background-image:\s*none[^}]*-webkit-text-fill-color:\s*currentColor/s
  );
  assert.match(
    styles,
    /\.site-layout\[data-page-kind="library"\] \.aside-curtain\s*\{[^}]*display:\s*none/s
  );
  assert.match(
    styles,
    /@media \(max-width: 767px\)[\s\S]*?\.library-folder,\s*\n\s*\.library-folder--wide\s*\{[^}]*grid-template-columns:\s*64px minmax\(0, 1fr\)/s
  );
});
