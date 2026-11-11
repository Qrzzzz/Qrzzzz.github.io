import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareLoadingHtml } from '../docs/.vitepress/theme/loadingBootHtml.mjs';
test('SSR keeps layout styles blocking without a JS-dependent reading gate', () => {
  const html = prepareLoadingHtml('<head><link rel="preload stylesheet" href="/style.css" as="style"><script id="sync-initial-theme-color">theme()</script></head><main>Article</main>');
  assert.ok(html.indexOf('theme()') < html.indexOf('/style.css'));
  assert.match(html, /<link rel="preload stylesheet" href="\/style.css" as="style">/);
  assert.doesNotMatch(html, /visibility:hidden|site-boot-loading|data-site-boot-style/);
});
test('optional fonts remain deferred with a no-JS fallback', () => {
  const html = prepareLoadingHtml('<head><link rel="stylesheet" href="/fonts.css" data-site-fonts="" media="print"></head>');
  assert.ok(html.includes('<noscript><link rel="stylesheet" href="/fonts.css" data-site-fonts="" media="all"></noscript>'));
});
