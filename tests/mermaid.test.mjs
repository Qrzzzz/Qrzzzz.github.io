import assert from "node:assert/strict";
import test from "node:test";
import { createMarkdownRenderer } from "vitepress";
import { parseHTML } from "linkedom";
import { mermaidPlugin } from "../docs/.vitepress/markdown/mermaid.mjs";

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
