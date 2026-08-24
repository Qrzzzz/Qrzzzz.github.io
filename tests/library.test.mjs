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
    ['"Works"', '"/works/"'],
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
  assert.match(libraryIndex, /title: "Articles"/);
  assert.match(libraryIndex, /title: "Prompts"/);
  assert.match(libraryIndex, /title: "Excerpts"/);
  assert.match(libraryIndex, /slice\(0, 3\)/);
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

test("renders the Library as responsive categories and stable result rows", () => {
  assert.match(layout, /relativePath\.startsWith\("library\/"\)/);
  assert.match(library, /^outline: false$/m);
  assert.match(
    styles,
    /\.library-categories\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/s
  );
  assert.match(
    styles,
    /@media \(max-width: 959px\)[\s\S]*?\.library-categories\s*\{[^}]*repeat\(2, minmax\(0, 1fr\)\)/s
  );
  assert.match(
    styles,
    /@media \(max-width: 639px\)[\s\S]*?\.library-categories\s*\{[^}]*minmax\(0, 1fr\)/s
  );
  assert.match(
    styles,
    /\.library-result\s*\{[^}]*grid-template-columns:\s*100px minmax\(220px, 1fr\) 120px/s
  );
  assert.match(
    styles,
    /\.library-result:hover,[\s\S]*?box-shadow:\s*inset 2px 0 0 var\(--site-accent\)/s
  );
  assert.doesNotMatch(styles, /padding-inline:\s*8px/);
  assert.match(
    styles,
    /@media \(max-width: 639px\)[\s\S]*?\.library-result__date\s*\{[^}]*display:\s*none/s
  );
});
