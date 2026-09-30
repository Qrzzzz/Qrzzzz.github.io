import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { createMarkdownRenderer } from "vitepress";
const markdown = await createMarkdownRenderer(process.cwd(), { math: true });
import { parseHTML } from "linkedom";
import { SHARE_IMAGE_CHARACTER_LIMIT, SHARE_IMAGE_FORMAT, countShareCharacters, createShareImageFilename, extractLongformContent, measureLongformHeight, snapshotShareImagePalette, withExportTimeout } from "../docs/.vitepress/theme/shareImageRuntime.mjs";

const component = readFileSync("docs/.vitepress/theme/ShareImage.vue", "utf8");
const canvas = readFileSync("docs/.vitepress/theme/ShareImageCanvas.vue", "utf8");
const controller = readFileSync("docs/.vitepress/theme/useShareImageExport.ts", "utf8");
const resources = readFileSync("docs/.vitepress/theme/shareImageResources.ts", "utf8");
const fixture = readFileSync("tests/fixtures/share-image-longform.md", "utf8");
function source(html) {
  return parseHTML(`<html><head><base href="https://qrzzzz.github.io/notes/test"></head><body><div class="vp-doc">${html}</div></body></html>`).document.querySelector(".vp-doc");
}

test("exports a nested article title and all collapsed author metadata", () => {
  const input = source('<header class="article-header"><h1>Long article</h1><p>Lead</p><p>Author A · Author B</p><p>2026-09-15</p><details><summary>Author details</summary><p>Long institution name</p><p><a href="mailto:author@example.com">author@example.com</a></p></details></header><h2>Abstract</h2><p>Body</p>');
  const result = extractLongformContent(input);
  const exported = source(result.html);
  assert.equal(result.title, "Long article");
  assert.equal(exported.querySelector("h1"), null);
  assert.ok(exported.querySelector("details").hasAttribute("open"));
  for (const text of ["Lead", "Author A · Author B", "2026-09-15", "Long institution name", "author@example.com", "Abstract", "Body"]) {
    assert.ok(exported.textContent.includes(text), text);
  }
  assert.equal(input.querySelector("details").hasAttribute("open"), false);
});

test("exports every excerpt without a title while preserving its complete body", () => {
  for (const name of readdirSync("docs/excerpts").filter(name => /^\d.*\.md$/.test(name))) {
    const text = readFileSync(`docs/excerpts/${name}`, "utf8");
    const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
    const input = source(markdown.render(body));
    input.querySelectorAll(".header-anchor").forEach(node => node.remove());
    const result = extractLongformContent(input, `Excerpt ${name.slice(0, -3)}`, "excerpt");
    assert.equal(result.title, "", name);
    assert.equal(source(result.html).textContent, input.textContent, name);
    assert.equal(source(result.html).querySelectorAll("h1").length, input.querySelectorAll("h1").length, name);
  }
  const legacy = extractLongformContent(source('<article><h1 class="excerpt-entry__heading">偶拾，2026 年 9 月 4 日，第一则</h1><p>正文</p></article>'), "Excerpt 2026-09-04-01", "excerpt");
  assert.equal(legacy.title, "");
  assert.equal(source(legacy.html).textContent, "正文");
  assert.match(canvas, /<h1 v-if="content.title">/);
  assert.doesNotMatch(canvas, /content.href\s*}}/);
});

test("exports complete Markdown structure, including text well beyond 200 characters", () => {
  const input = source(markdown.render(fixture));
  input.querySelectorAll(".header-anchor, button, .lang").forEach(node => node.remove());
  const result = extractLongformContent(input);
  const output = source(result.html);
  assert.equal(result.title, input.querySelector("h1").textContent.trim());
  assert.equal(output.querySelector("h1"), null);
  assert.ok(output.textContent.length > 500);
  assert.match(output.textContent, /LONGFORM_END_全文保留/);
  for (const tag of ["h2", "h3", "p", "blockquote", "ul", "ol", "li", "hr", "pre", "code", "strong", "a"]) {
    assert.equal(output.querySelectorAll(tag).length, input.querySelectorAll(tag).length, tag);
  }
  assert.equal(output.querySelector("ol").getAttribute("start"), "3");
  assert.equal(output.querySelector("pre").textContent, input.querySelector("pre").textContent);
  input.querySelector("h1").remove();
  assert.equal(output.textContent, input.textContent);
});

test("unwraps VitePress highlighting, keeps nested excerpt content and additional h1 headings", () => {
  const input = source('<article><h1>标题<a class="header-anchor">#</a></h1><p class="lead">导语</p><h1>正文一级标题</h1><figure><blockquote><p>完整引用</p></blockquote><figcaption>出处</figcaption></figure><div class="language-js"><button>复制</button><span class="lang">js</span><pre><code><span class="line">  const x = 1;</span>\n<span class="line">  x++;</span></code></pre></div></article>');
  const result = extractLongformContent(input);
  const output = source(result.html);
  assert.equal(result.title, "标题");
  assert.equal(output.querySelector("h1").textContent, "正文一级标题");
  assert.equal(output.querySelector("pre").textContent, "  const x = 1;\n  x++;");
  assert.match(output.textContent, /导语/);
  assert.match(output.textContent, /出处/);
  assert.doesNotMatch(result.html, /header-anchor|button|class=|复制/);
  assert.ok(input.querySelector("button"), "source is never mutated");
});

test("does not carry executable HTML, page controls or source styles into v-html", () => {
  const result = extractLongformContent(source('<script>alert(1)</script><p onclick="bad()" style="display:none">正文<img src="javascript:bad()" onerror="bad()" alt="图"><a href="javascript:bad()">链接</a></p><div data-share-image-exclude>排除</div>'), "后备标题");
  assert.equal(result.title, "后备标题");
  assert.doesNotMatch(result.html, /script|onclick|onerror|style=|javascript:|排除/);
  assert.match(result.html, /正文/);
  assert.throws(() => extractLongformContent(null), /unavailable/);
});

for (const type of ["info", "tip", "warning", "danger"]) {
  test(`preserves ${type} block structure with only allowlisted semantic classes`, () => {
    const input = source(markdown.render(`::: ${type} 标题\n正文含有 **强调** 和 [链接](https://example.com)。\n\n- 列表\n\n> 引用\n:::`));
    input.querySelector(".custom-block").classList.add("unknown", "language-js", "is-active");
    input.querySelector(".custom-block-title").setAttribute("style", "color:red");
    const before = input.innerHTML;
    const result = extractLongformContent(input);
    const output = source(result.html);
    const block = output.querySelector(`div.custom-block.${type}`);
    assert.ok(block);
    assert.equal(block.className, `${type} custom-block`);
    assert.equal(block.querySelector("p.custom-block-title").textContent, "标题");
    for (const tag of ["strong", "a", "ul", "li", "blockquote"]) assert.ok(block.querySelector(tag), tag);
    assert.equal(output.textContent, input.textContent);
    assert.doesNotMatch(result.html, /unknown|language-js|is-active|style=/);
    assert.equal(input.innerHTML, before, "source is never mutated");
  });
}

test("preserves only the semantic emphasis span used by the marker treatment", () => {
  const result = extractLongformContent(source('<p><strong><span class="text-emphasis extra">重点</span></strong><span class="unknown">普通</span></p>'));
  const output = source(result.html);
  const marker = output.querySelector("strong > span.text-emphasis");
  assert.ok(marker);
  assert.equal(marker.className, "text-emphasis");
  assert.equal(marker.textContent, "重点");
  assert.equal(output.querySelector("span.unknown"), null);
  assert.equal(output.textContent, "重点普通");
});

test("converts excerpt strong marker semantics when no text-emphasis span exists", () => {
  const result = extractLongformContent(source('<article class="excerpt-entry"><p><strong>摘录重点</strong></p></article>'), "", "excerpt");
  const output = source(result.html);
  assert.equal(output.querySelector("strong").className, "text-emphasis");
});

test("rejects unknown and near-match classes even beside semantic classes", () => {
  const result = extractLongformContent(source('<div class="custom-block info info-extra custom-block-title-extra unknown"><p class="custom-block-title highlighted">Title</p><pre class="shiki tip-extra"><code class="language-js"><span class="line info">code</span></code></pre><button class="tip">control</button><nav class="warning">navigation</nav></div>'));
  const output = source(result.html);
  assert.equal(output.querySelector("div.custom-block").className, "custom-block info");
  assert.equal(output.querySelector("p").className, "custom-block-title");
  assert.equal(output.querySelector("pre").hasAttribute("class"), false);
  assert.equal(output.querySelector("code").hasAttribute("class"), false);
  assert.equal(output.querySelector("pre").textContent, "code");
  assert.doesNotMatch(result.html, /extra|unknown|highlighted|shiki|language-js|line|control|navigation|<span/);
});

test("measures natural longform height instead of fixing a 720px canvas", () => {
  assert.deepEqual(SHARE_IMAGE_FORMAT, { id: "longform", width: 540, scale: 2 });
  assert.equal(measureLongformHeight({ scrollHeight: 2480, getBoundingClientRect: () => ({ height: 2479.5 }) }), 2480);
  assert.equal(measureLongformHeight({ scrollHeight: 500, getBoundingClientRect: () => ({ height: 500.4 }) }), 501);
  assert.equal(createShareImageFilename('文章/标题'), "文章-标题-longform.png");
  assert.match(controller, /measureLongformHeight\(element\)/);
  assert.match(controller, /scale: SHARE_IMAGE_FORMAT.scale/);
  assert.match(canvas, /v-html="content.html"/);
  assert.match(component, /Export article image/);
  assert.match(resources, /document.fonts.load/);
  assert.match(canvas, /font-family: var\(--share-font-reading\)/);
  assert.match(controller, /font: \{ preferredFormat: "woff2" \}/);
  assert.match(resources, /image.decode\(\)/);
  assert.match(controller, /current !== generation/);
  assert.doesNotMatch(component, /line-clamp|maxExcerptLength|shareExcerpt|resolveExcerpt|share-image-card|720px|3x4/);
});


test("keeps one direct accessible export on article and excerpt pages", () => {
  const layout = readFileSync("docs/.vitepress/theme/Layout.vue", "utf8");
  assert.match(layout, /<ShareImage/);
  assert.match(layout, /pageKind.value === "article" \|\| pageKind.value === "excerpt"/);
  assert.match(component, /:disabled="rendering"/);
  assert.match(component, /:aria-busy="rendering"/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /aria-hidden="true" inert/);
  assert.match(controller, /exportContent.value = undefined/);
});

test("the optional limit counts visible Unicode characters and leaves short or exact-length articles intact", () => {
  assert.equal(SHARE_IMAGE_CHARACTER_LIMIT, 3000);
  assert.equal(countShareCharacters("中 A， 👨‍👩‍👧‍👦 e\u0301\n"), 5);
  for (const count of [2999, 3000, 3001]) {
    const input = source(`<h1>Title</h1><p>${"字".repeat(count)}</p>`);
    const original = input.innerHTML;
    const result = extractLongformContent(input, "", "article", new Map(), { limit: 3000 });
    assert.equal(result.totalCharacters, count);
    assert.equal(result.characterCount, Math.min(count, 3000));
    assert.equal(result.truncated, count > 3000);
    assert.equal(input.innerHTML, original);
    assert.equal(extractLongformContent(input).characterCount, count, "full export remains available");
  }
});

test("cutoff respects sentence boundaries, nested markup and complete Unicode graphemes", () => {
  const text = "字".repeat(2890) + "。";
  const result = extractLongformContent(source(`<p>${text}<strong>${"👨‍👩‍👧‍👦".repeat(200)}</strong></p>`), "", "article", new Map(), { limit: 3000 });
  const output = source(result.html);
  assert.equal(result.truncated, true);
  assert.ok(result.characterCount <= 3000);
  assert.ok(output.querySelector("p"));
  assert.doesNotMatch(output.textContent.replaceAll("👨‍👩‍👧‍👦", ""), /[👨👩👧👦\u200d]/u);
  const sentences = extractLongformContent(source(`<p>${text}${"字".repeat(300)}</p>`), "", "article", new Map(), { limit: 3000 });
  assert.equal(source(sentences.html).textContent, text);
});

test("keeps large structured blocks atomic and removes headings orphaned by the cutoff", () => {
  for (const block of [`<pre><code>${"码".repeat(200)}</code></pre>`, `<table><tr><td>${"表".repeat(200)}</td></tr></table>`, `<figure><img src="https://example.com/a.png"><figcaption>${"图".repeat(200)}</figcaption></figure>`]) {
    const result = extractLongformContent(source(`<p>${"文".repeat(2900)}</p><h2>Next section</h2>${block}<p>Late text</p>`), "", "article", new Map(), { limit: 3000 });
    assert.equal(result.characterCount, 2900);
    assert.equal(result.truncated, true);
    assert.doesNotMatch(result.html, /h2|pre|table|figure|Late text/);
  }
});

test("separates complete author metadata and excerpt sources from the body budget", () => {
  const article = source(`<header class="article-header"><h1>Title</h1><p>Author</p><details><summary>Details</summary><p>Institution</p></details></header><p>${"文".repeat(3001)}</p>`);
  const original = article.innerHTML;
  const result = extractLongformContent(article, "", "article", new Map(), { separateMetadata: true, limit: 3000 });
  assert.equal(result.title, "Title");
  assert.equal(result.characterCount, 3000);
  assert.match(result.metadataHtml, /Author/);
  assert.ok(source(result.metadataHtml).querySelector("details").hasAttribute("open"));
  assert.equal(article.innerHTML, original);
  const excerpt = extractLongformContent(source(`<article class="excerpt-entry"><blockquote><p>${"文".repeat(3001)}</p><footer>Author, <cite>Original book</cite></footer></blockquote></article>`), "Excerpt 2026-01-01-01", "excerpt", new Map(), { separateMetadata: true, limit: 3000 });
  assert.equal(excerpt.title, "");
  assert.equal(excerpt.characterCount, 3000);
  assert.match(excerpt.attributionHtml, /Author/);
  assert.match(excerpt.attributionHtml, /Original book/);
});

test("only retains resource requests inside the selected opening section", () => {
  const article = source(`<p>First</p><mjx-container><svg></svg><mjx-assistive-mml>x</mjx-assistive-mml></mjx-container><p>${"文".repeat(3100)}</p><figure class="mermaid-diagram"><svg><text>Late diagram</text></svg></figure>`);
  const result = extractLongformContent(article, "", "article", new Map(), { collectResources: true, limit: 3000 });
  assert.equal(result.resources.length, 1);
  assert.equal(result.resources[0].kind, "math");
  assert.equal(result.resources[0].inline, true);
  assert.equal(source(result.html).querySelectorAll("[data-share-resource]").length, 1);
  assert.doesNotMatch(result.html, /Late diagram|<svg|mjx-assistive/);
});

test("truncated prose retains early images and breaks while ignoring diagram stylesheet text", () => {
  const input = source(`<img src="https://example.com/early.png"><p>First<br>line</p><figure class="mermaid-diagram"><svg><style>${"css".repeat(2000)}</style><text>Diagram label</text></svg></figure><p>${"字".repeat(3100)}</p><img src="https://example.com/late.png">`);
  const result = extractLongformContent(input, "", "article", new Map(), { collectResources: true, limit: 3000 });
  const output = source(result.html);
  assert.equal(output.querySelectorAll("img").length, 1);
  assert.match(output.querySelector("img").getAttribute("src"), /early/);
  assert.ok(output.querySelector("br"));
  assert.equal(result.resources.length, 1);
  assert.equal(result.characterCount, 3000);
  assert.doesNotMatch(result.html, /css|late/);
});

test("formulas retain dedicated inline and display resources rather than flattened text", async () => {
  const article = source(markdown.render("Inline $x^2$.\n\n$$\n\\frac{a}{b}\n$$"));
  const original = article.innerHTML;
  const result = extractLongformContent(article, "", "article", new Map(), { collectResources: true });
  assert.equal(result.resources.length, 2);
  assert.equal(result.resources[0].inline, true);
  assert.equal(result.resources[1].inline, false);
  assert.equal(source(result.html).querySelectorAll("[data-share-resource]").length, 2);
  assert.equal(article.innerHTML, original);
});

test("rejects unrenderable canvas heights and labels truncated downloads", () => {
  assert.throws(() => measureLongformHeight({ scrollHeight: 15001, getBoundingClientRect: () => ({ height: 15001 }) }), /Image is too tall/);
  assert.equal(createShareImageFilename("Article", true), "Article-longform-truncated.png");
});

test("keeps language and table alignment as validated semantics without copying arbitrary styles", () => {
  const result = extractLongformContent(source('<blockquote lang="en"><p>Quote</p></blockquote><table><tr><th style="text-align:right;color:red">Number</th><td align="center" style="position:fixed">42</td><td lang="invalid!" style="text-align:justify">Other</td></tr></table>'));
  const output = source(result.html);
  assert.equal(output.querySelector("blockquote").getAttribute("lang"), "en");
  assert.equal(output.querySelector("th").getAttribute("data-share-align"), "right");
  assert.equal(output.querySelector("td").getAttribute("data-share-align"), "center");
  assert.doesNotMatch(result.html, /style=|color:|position:|justify|invalid!/);
});


test("captures both site palettes independently of subsequent theme changes", () => {
  for (const canvas of ["#eef2f3", "#151d37"]) {
    const values = { "--site-canvas": canvas, "--site-text": "#30332f", "--site-link": "#006778", "--site-content-muted": "#566580", "--site-content-surface": "#f6f8fa", "--site-marker-fill": "rgba(36, 62, 205, 0.14)", "--vp-c-success-1": "#18794e", "--vp-c-warning-1": "#915930", "--vp-c-danger-1": "#b8272c" };
    const palette = snapshotShareImagePalette({ getPropertyValue: key => values[key] || "" });
    values["--site-canvas"] = "changed";
    assert.equal(palette["--share-canvas"], canvas);
    assert.equal(palette["--share-link"], "#006778");
    assert.equal(palette["--share-marker-fill"], "rgba(36, 62, 205, 0.14)");
    for (const name of ["success", "warning", "danger"]) {
      const original = values[`--vp-c-${name}-1`];
      values[`--vp-c-${name}-1`] = "changed";
      assert.equal(palette[`--share-${name}`], original);
    }
    assert.equal(palette["--share-content-muted"], "#566580");
    assert.equal(palette["--share-content-surface"], "#f6f8fa");
  }
});

test("bounds stuck export work and preserves success and image failures", async () => {
  assert.equal(await withExportTimeout(Promise.resolve("image"), 50), "image");
  await assert.rejects(withExportTimeout(Promise.reject(new Error("broken image")), 50), /broken image/);
  await assert.rejects(withExportTimeout(new Promise(() => {}), 10), /timed out/);
});

test("preserves merged table cells and expanded disclosure content", () => {
  const output = source(extractLongformContent(source('<table><tr><td colspan="2" rowspan="3">merged</td></tr></table><details><summary>More</summary><p>All content</p></details>')).html);
  assert.equal(output.querySelector("td").getAttribute("colspan"), "2");
  assert.equal(output.querySelector("td").getAttribute("rowspan"), "3");
  assert.ok(output.querySelector("details").hasAttribute("open"));
});
