import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { createMarkdownRenderer } from "vitepress";
const markdown = await createMarkdownRenderer(process.cwd());
import { parseHTML } from "linkedom";
import { SHARE_IMAGE_FORMAT, createShareImageFilename, extractLongformContent, measureLongformHeight, snapshotShareImagePalette, withExportTimeout } from "../docs/.vitepress/theme/shareImageRuntime.mjs";

const component = readFileSync("docs/.vitepress/theme/ShareImage.vue", "utf8");
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
  assert.match(component, /<h1 v-if="exportContent.title">/);
  assert.match(component, /v-if="pageKind !== 'excerpt'" class="share-image-longform__url"/);
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

test("rejects unknown and near-match classes even beside semantic classes", () => {
  const result = extractLongformContent(source('<div class="custom-block info info-extra custom-block-title-extra unknown"><p class="custom-block-title highlighted">Title</p><pre class="shiki tip-extra"><code class="language-js"><span class="line info">code</span></code></pre><button class="tip">control</button><nav class="warning">navigation</nav></div>'));
  const output = source(result.html);
  assert.equal(output.querySelector("div.custom-block").className, "custom-block info");
  assert.equal(output.querySelector("p").className, "custom-block-title");
  assert.equal(output.querySelector("pre").hasAttribute("class"), false);
  assert.equal(output.querySelector("code").hasAttribute("class"), false);
  assert.equal(output.querySelector("pre").textContent, "code");
  assert.doesNotMatch(result.html, /extra|unknown|highlighted|shiki|language-js|line|control|navigation|span/);
});

test("measures natural longform height instead of fixing a 720px canvas", () => {
  assert.deepEqual(SHARE_IMAGE_FORMAT, { id: "longform", width: 540, scale: 2 });
  assert.equal(measureLongformHeight({ scrollHeight: 2480, getBoundingClientRect: () => ({ height: 2479.5 }) }), 2480);
  assert.equal(measureLongformHeight({ scrollHeight: 500, getBoundingClientRect: () => ({ height: 500.4 }) }), 501);
  assert.equal(createShareImageFilename('文章/标题'), "文章-标题-longform.png");
  assert.match(component, /height: measureLongformHeight\(element\)/);
  assert.match(component, /scale: SHARE_IMAGE_FORMAT.scale/);
  assert.match(component, /v-html="exportContent.html"/);
  assert.match(component, /Export article image/);
  assert.match(component, /document.fonts.load/);
  assert.match(component, /font-family: var\(--site-font-reading\)/);
  assert.match(component, /font: \{ preferredFormat: "woff2" \}/);
  assert.match(component, /image.decode\(\)/);
  assert.match(component, /current !== generation/);
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
  assert.match(component, /exportContent.value = undefined/);
});


test("captures both site palettes independently of subsequent theme changes", () => {
  for (const canvas of ["#eef2f3", "#151d37"]) {
    const values = { "--site-canvas": canvas, "--site-text": "#30332f", "--site-link": "#006778", "--site-content-muted": "#566580", "--site-content-surface": "#f6f8fa", "--vp-c-success-1": "#18794e", "--vp-c-warning-1": "#915930", "--vp-c-danger-1": "#b8272c" };
    const palette = snapshotShareImagePalette({ getPropertyValue: key => values[key] || "" });
    values["--site-canvas"] = "changed";
    assert.equal(palette["--share-canvas"], canvas);
    assert.equal(palette["--share-link"], "#006778");
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
