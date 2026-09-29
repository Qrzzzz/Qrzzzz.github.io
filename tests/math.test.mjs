import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createMarkdownRenderer } from 'vitepress';
import { parseHTML } from 'linkedom';
import { inlineEmphasisPlugin } from '../docs/.vitepress/markdown/inline-emphasis.mjs';
import { mermaidPlugin } from '../docs/.vitepress/markdown/mermaid.mjs';
const renderer = createMarkdownRenderer('docs', {
  math: true,
  config(md) { inlineEmphasisPlugin(md); mermaidPlugin(md); }
});

test('MathJax renders the baseline including quoted matrices and fractions', async () => {
  const source = readFileSync('docs/excerpts/2026-09-28-02.md', 'utf8').replace(/^---[\s\S]*?---\s*/, '');
  const html = (await renderer).render(source);
  const { document } = parseHTML(html);
  assert.equal(document.querySelectorAll('mjx-container').length, 8);
  assert.equal(document.querySelectorAll('mjx-container[display="true"][tabindex="0"]').length, 6);
  assert.equal(document.querySelectorAll('blockquote mjx-container').length, 3);
  assert.equal(document.querySelectorAll('[data-mml-node="mtable"]').length, 2);
  assert.equal(document.querySelectorAll('[data-mml-node="mfrac"]').length, 10);
  assert.equal(document.querySelectorAll('mjx-assistive-mml').length, 8);
  assert.doesNotMatch(html, /data-mjx-error|<merror|\$\$|<pre|<code/);
});

test('math preserves emphasis, Mermaid, literal code and monetary amounts', async () => {
  const html = (await renderer).render([
    '**公式 $x^2$**，价格 $25。', '', '`$x$`', '',
    '```text', '$$x$$', '```', '',
    '```mermaid', 'graph TD', 'A --> B', '```'
  ].join('\n'));
  assert.match(html, /<strong><span class="text-emphasis">公式 <mjx-container/);
  assert.match(html, /价格 \$25/);
  assert.match(html, /<code>\$x\$<\/code>/);
  assert.match(html, /\$\$x\$\$/);
  assert.match(html, /<MermaidDiagram :source=/);
  assert.equal((html.match(/<mjx-container /g) || []).length, 1);
});
