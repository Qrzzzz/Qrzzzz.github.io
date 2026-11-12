import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import YAML from "yaml";
import { parseHTML } from "linkedom";
import { createMarkdownRenderer } from "vitepress";

const markdown = await createMarkdownRenderer("docs", { math: true });
const pages = readdirSync("docs/excerpts")
  .filter(name => /^\d{4}-\d{2}-\d{2}-\d{2}\.md$/.test(name))
  .map(name => {
    const source = readFileSync("docs/excerpts/" + name, "utf8").replace(/\r\n/g, "\n");
    const match = source.match(/^---\n([\s\S]*?)\n---/);
    const meta = YAML.parse(match[1]);
    const body = source.slice(match[0].length);
    const document = parseHTML("<html><body>" + markdown.render(body) + "</body></html>").document;
    return { name, meta, document };
  });

test("excerpt Markdown renders one readable article with its public anchor and language", () => {
  for (const { name, meta, document } of pages) {
    const articles = document.querySelectorAll("article.excerpt-entry");
    assert.equal(articles.length, 1, name);
    const article = articles[0];
    assert.equal(article.id, "excerpt-" + name.slice(0, -3), name);
    assert.equal(article.getAttribute("lang"), meta.lang, name);
    assert.ok(article.textContent.trim(), name);
  }
});

test("complete works use their real title while fragments remain titleless", () => {
  for (const { name, meta, document } of pages) {
    const article = document.querySelector("article");
    const headings = article.querySelectorAll("h1");
    assert.equal(headings.length, meta.complete ? 1 : 0, name);
    if (meta.complete) {
      const heading = headings[0].cloneNode(true);
      heading.querySelectorAll(".header-anchor").forEach(node => node.remove());
      assert.equal(heading.textContent.trim(), meta.title, name);
      assert.equal(article.firstElementChild.localName, "h1", name);
    }
  }
});

test("optional attributions and translations remain readable in their authored order", () => {
  for (const { name, document } of pages) {
    const article = document.querySelector("article");
    for (const block of article.querySelectorAll(".excerpt-attribution, .excerpt-translation")) {
      assert.ok(block.textContent.trim(), name);
    }
    const children = [...article.children];
    const source = children.findIndex(node => node.classList.contains("excerpt-attribution"));
    const translations = children.findIndex(node => node.classList.contains("excerpt-translations"));
    if (source >= 0 && translations >= 0) assert.ok(source < translations, name);
    for (const translation of article.querySelectorAll(".excerpt-translation")) {
      assert.ok(translation.getAttribute("lang"), name);
    }
  }
});
