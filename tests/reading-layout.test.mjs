import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const config = readFileSync("docs/.vitepress/config.mts", "utf8");
const layout = readFileSync("docs/.vitepress/theme/Layout.vue", "utf8");
const styles = readFileSync("docs/.vitepress/theme/styles/content.css", "utf8");
const tokens = readFileSync("docs/.vitepress/theme/styles/tokens.css", "utf8");

test("keeps contextual sidebars only for the current documentation set", () => {
  assert.match(tokens, /--vp-sidebar-width:\s*224px/);
  assert.match(config, /sidebar:\s*\{/);
  for (const route of ["/guide/", "/projects/lyrics-card-generator/docs/"]) {
    assert.match(config, new RegExp(`"${route.replaceAll("/", "\\/")}": \\[`));
  }
  for (const route of ["/notes/", "/prompt-collection/", "/excerpts/", "/projects/"]) {
    assert.doesNotMatch(config, new RegExp(`"${route.replaceAll("/", "\\/")}": \\[`));
  }
  assert.doesNotMatch(config, /siteIndexSidebar/);
  assert.match(
    styles,
    /\.VPContent\.has-sidebar \.VPDoc\.has-aside \.content-container\s*\{\s*max-width:\s*100%/s
  );
  assert.match(styles, /\.VPSidebar\s*\{\s*border-right:\s*1px solid var\(--site-line\)/s);
  assert.match(layout, /window\.matchMedia\("\(max-width: 959px\)"\)/);
  assert.match(layout, /setElementInert\(sidebar, isMobileSidebar && !sidebar\.classList\.contains\("open"\)\)/);
});

test("renders the largest document heading with the site two-color gradient", () => {
  assert.match(styles, /\.vp-doc h1\s*\{[\s\S]*?width:\s*fit-content/);
  assert.match(
    styles,
    /@supports \(\(background-clip: text\) or \(-webkit-background-clip: text\)\)/
  );
  assert.match(
    styles,
    /background-image:\s*linear-gradient\(\s*to right,\s*var\(--site-accent\) 0%,\s*var\(--site-spark-secondary\) 100%/s
  );
  assert.match(styles, /-webkit-text-fill-color:\s*transparent/);
  assert.match(styles, /@media \(forced-colors: active\)/);
});

test("starts the back-to-top progress ring at twelve o'clock", () => {
  assert.match(styles, /conic-gradient\(\s*from 0deg,/s);
  assert.doesNotMatch(styles, /conic-gradient\(\s*from -90deg,/s);
});
