import assert from "node:assert/strict";
import test from "node:test";
import { createMarkdownRenderer } from "vitepress";
import { inlineEmphasisPlugin } from "../docs/.vitepress/markdown/inline-emphasis.mjs";

const markdown = createMarkdownRenderer("docs", { config: inlineEmphasisPlugin });

test("keeps links, inline code, nested emphasis, and line breaks inside the text layer", async () => {
  const html = (await markdown).render(
    "**包含[链接](/guide/)和 `code`、*轻微强调* 的重点<br>仍属于同一段重点**。"
  );
  assert.match(html, /<strong><span class="text-emphasis">包含<a href="\/guide\/">链接<\/a>/);
  assert.match(html, /<code>code<\/code>、<em>轻微强调<\/em>/);
  assert.match(html, /<br>仍属于同一段重点<\/span><\/strong>。/);
  assert.equal((html.match(/class="text-emphasis"/g) ?? []).length, 1);
});

test("does not decorate raw HTML labels or code examples", async () => {
  const html = (await markdown).render([
    '<strong class="future-component-title">Future component</strong>',
    "",
    "`**literal emphasis**`",
    "",
    "```html",
    "<strong>Example</strong>",
    "```"
  ].join("\n"));
  assert.match(html, /<strong class="future-component-title">Future component<\/strong>/);
  assert.match(html, /<code>\*\*literal emphasis\*\*<\/code>/);
  assert.doesNotMatch(html, /class="text-emphasis"/);
});
