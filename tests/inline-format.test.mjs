import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createMarkdownRenderer } from "vitepress";
import { inlineEmphasisPlugin } from "../docs/.vitepress/markdown/inline-emphasis.mjs";

const note = readFileSync("docs/notes/until-the-tower-falls.md", "utf8");
const styles = readFileSync("docs/.vitepress/theme/styles/content.css", "utf8");
const tokens = readFileSync("docs/.vitepress/theme/styles/tokens.css", "utf8");
const markdown = createMarkdownRenderer("docs", { config: inlineEmphasisPlugin });

test("ties bold and inline-code treatments to the active accent", () => {
  for (const token of [
    "--site-emphasis-text",
    "--site-inline-code-bg",
    "--site-inline-code-border",
    "--site-inline-code-text"
  ]) {
    assert.match(tokens, new RegExp(`${token}:`), `missing theme token: ${token}`);
  }

  assert.match(
    styles,
    /\.vp-doc strong\s*\{\s*background:\s*none;\s*color:\s*var\(--site-emphasis-text\);\s*font-weight:\s*750;\s*\}/s
  );
  assert.match(
    styles,
    /\.vp-doc \.text-emphasis\s*\{[^}]*display:\s*inline;[^}]*var\(--site-accent-soft\)[^}]*box-decoration-break:\s*clone/s
  );
  assert.match(
    styles,
    /\.vp-doc :not\(pre\) > code\s*\{[^}]*border:\s*1px solid var\(--site-inline-code-border\)[^}]*background:\s*var\(--site-inline-code-bg\)[^}]*color:\s*var\(--site-inline-code-text\)/s
  );
});

test("renders the final Night City sentence as bold before Chinese punctuation", async () => {
  const finalParagraph = note
    .split(/\r?\n/)
    .find((line) => line.startsWith("**夜之城没有王，只有结构"));

  assert.ok(finalParagraph, "missing the final Night City paragraph");
  assert.match(finalParagraph, /^\*\*夜之城没有王，只有结构\*\*。而你/);

  const html = (await markdown).render(finalParagraph);

  assert.match(html, /<strong><span class="text-emphasis">夜之城没有王，只有结构<\/span><\/strong>。而你/);
  assert.doesNotMatch(html, /\*\*/);
});

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
