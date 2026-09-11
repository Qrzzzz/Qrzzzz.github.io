import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const library = readFileSync("docs/library/index.md", "utf8");
const config = readFileSync("docs/.vitepress/config.mts", "utf8");
const layout = readFileSync("docs/.vitepress/theme/Layout.vue", "utf8");
const styles = readFileSync("docs/.vitepress/theme/styles/content.css", "utf8");
const libraryIndex = readFileSync(
  "docs/.vitepress/theme/components/LibraryIndex.vue",
  "utf8"
);
const libraryToolbar = readFileSync(
  "docs/.vitepress/theme/components/LibraryToolbar.vue",
  "utf8"
);
const collectionIndex = readFileSync(
  "docs/.vitepress/theme/components/CollectionIndex.vue",
  "utf8"
);

test("defines four non-overlapping top-level navigation areas", () => {
  const nav = config.match(/nav:\s*\[([\s\S]*?)\],\s*\n\s*sidebar:/)?.[1] ?? "";

  for (const entry of [
    ['"Docs"', '"/docs/"'],
    ['"Projects"', '"/projects/"'],
    ['"Library"', '"/library/"'],
    ['"About"', '"/about"']
  ]) {
    assert.ok(
      nav.includes(`text: ${entry[0]}`) && nav.includes(`link: ${entry[1]}`),
      `Top navigation is missing ${entry[0]}`
    );
  }
  assert.match(
    nav,
    /\^\/projects\/\(\?!\[\^\/\]\+\/docs\(\?:\/\|\$\)\)/
  );
  assert.match(
    nav,
    /\^\/projects\/\[\^\/\]\+\/docs\(\?:\/\|\$\)/
  );
  assert.doesNotMatch(config, /siteIndexSidebar/);
});

test("uses one generated Library source for the main and collection indexes", () => {
  assert.match(library, /^title: Library$/m);
  assert.match(library, /<LibraryIndex \/>/);
  assert.doesNotMatch(library, /01 \/ DOCS|library-folder|href="\/notes\//);
  assert.match(libraryIndex, /data as libraryItems/);
  assert.doesNotMatch(libraryIndex, /LibraryCategory|slice\(0, 3\)/);
  assert.doesNotMatch(libraryIndex, /description: "对技术、产品/);
  assert.doesNotMatch(libraryIndex, /description: "经过整理/);
  assert.doesNotMatch(libraryIndex, /description: "偶然遇见/);
  assert.match(collectionIndex, /data as libraryItems/);
  assert.match(collectionIndex, /v-if="item\.kind === 'prompt'"/);
  assert.match(libraryIndex, /v-if="item\.kind === 'prompt'"/);

  for (const [file, kind] of [
    ["docs/notes/index.md", "article"],
    ["docs/prompt-collection/index.md", "prompt"],
    ["docs/excerpts/index.md", "excerpt"]
  ]) {
    const source = readFileSync(file, "utf8");
    assert.match(source, new RegExp(`<CollectionIndex kind="${kind}" \\/>`));
    assert.doesNotMatch(source, /class="content-index-row"/);
  }
});

test("implements searchable URL-backed filters and a clear empty state", () => {
  assert.match(libraryToolbar, /type="search"/);
  assert.match(libraryToolbar, /aria-pressed/);
  assert.match(libraryIndex, /URLSearchParams\(window\.location\.search\)/);
  assert.match(libraryIndex, /window\.history\[method\]/);
  assert.match(libraryIndex, /window\.addEventListener\("popstate"/);
  assert.match(libraryIndex, /No results found/);
  assert.match(libraryIndex, /Clear filters/);
  assert.match(libraryIndex, /matchesLibraryItem\(item, query\.value\)/);
});

test("entry pages share a header and keep collections reachable", () => {
  for (const slug of ["library", "projects", "works", "tools", "docs", "notes", "prompt-collection", "excerpts"]) {
    const source = readFileSync(`docs/${slug}/index.md`, "utf8");
    assert.match(source, /^pageType: index$/m);
    assert.match(source, /^outline: false$/m);
    assert.match(source, /<CatalogHeader /);
  }
  for (const slug of ["notes", "prompt-collection", "excerpts"]) {
    assert.ok(libraryIndex.includes(`href="/${slug}/"`));
  }
  assert.match(layout, /frontmatter.value.pageType === "index"/);
  assert.match(styles, /library-result__date/);
});
