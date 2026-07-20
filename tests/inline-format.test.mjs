import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createMarkdownRenderer } from "vitepress";

const note = readFileSync("docs/notes/until-the-tower-falls.md", "utf8");
const styles = readFileSync("docs/.vitepress/theme/styles/content.css", "utf8");
const tokens = readFileSync("docs/.vitepress/theme/styles/tokens.css", "utf8");

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
    /\.vp-doc strong\s*\{[^}]*var\(--site-accent-soft\)[^}]*color:\s*var\(--site-emphasis-text\)[^}]*font-weight:\s*750/s
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

  const markdown = await createMarkdownRenderer("docs");
  const html = markdown.render(finalParagraph);

  assert.match(html, /<strong>夜之城没有王，只有结构<\/strong>。而你/);
  assert.doesNotMatch(html, /\*\*/);
});
