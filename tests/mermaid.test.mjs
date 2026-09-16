import assert from "node:assert/strict";
import test from "node:test";
import { createMarkdownRenderer } from "vitepress";
import { parseHTML } from "linkedom";
import { mermaidPlugin } from "../docs/.vitepress/markdown/mermaid.mjs";
import { extractLongformContent } from "../docs/.vitepress/theme/shareImageRuntime.mjs";

const markdown = await createMarkdownRenderer(process.cwd());
mermaidPlugin(markdown);

test("Mermaid fences safely pass literal source while nested examples stay code", () => {
  const source = 'flowchart TD\n A["<script> & {{ value }}"] --> B';
  const html = markdown.render('```mermaid\n' + source + '\n```');
  const { document } = parseHTML(html);
  assert.equal(JSON.parse(document.querySelector("mermaiddiagram").getAttribute(":source")), source + '\n');
  assert.doesNotMatch(html, /<script>/);
  const example = markdown.render('````md\n```mermaid\nflowchart TD\nA-->B\n```\n````');
  assert.doesNotMatch(example, /<MermaidDiagram/);
});

test("longform replaces only explicitly prepared diagrams and excludes source controls", () => {
  const { document } = parseHTML('<div class="vp-doc"><h1>文章</h1><figure class="mermaid-diagram"><svg><text>节点</text></svg><details>源码</details></figure><img src="data:image/png;base64,untrusted"></div>');
  const source = document.querySelector(".vp-doc");
  const diagram = source.querySelector("figure");
  const result = extractLongformContent(source, "", "article", new Map([[diagram, { src: "data:image/png;base64,trusted", alt: "文档流程" }]]));
  assert.match(result.html, /src="data:image\/png;base64,trusted"/);
  assert.doesNotMatch(result.html, /untrusted|源码|<svg/);
  assert.match(result.html, /alt="文档流程"/);
});
