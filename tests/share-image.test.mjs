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

test("exports every excerpt without a title while preserving its complete body", () => {
  for (const name of readdirSync("docs/excerpts").filter(name => /^\d.*\.md$/.test(name))) {
    const text = readFileSync(`docs/excerpts/${name}`, "utf8");
    const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
    const input = source(markdown.render(body));
    const result = extractLongformContent(input, `Excerpt ${name.slice(0, -3)}`, "excerpt");
    assert.equal(result.title, "", name);
    assert.equal(source(result.html).textContent, input.textContent, name);
    assert.equal(source(result.html).querySelector("h1"), null, name);
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

test("measures natural longform height instead of fixing a 720px canvas", () => {
  assert.deepEqual(SHARE_IMAGE_FORMAT, { id: "longform", width: 540, scale: 2 });
  assert.equal(measureLongformHeight({ scrollHeight: 2480, getBoundingClientRect: () => ({ height: 2479.5 }) }), 2480);
  assert.equal(measureLongformHeight({ scrollHeight: 500, getBoundingClientRect: () => ({ height: 500.4 }) }), 501);
  assert.equal(createShareImageFilename('文章/标题'), "文章-标题-longform.png");
  assert.match(component, /height: measureLongformHeight\(element\)/);
  assert.match(component, /scale: SHARE_IMAGE_FORMAT.scale/);
  assert.match(component, /v-html="exportContent.html"/);
  assert.match(component, /导出全文长图/);
  assert.match(component, /document.fonts.load/);
  assert.match(component, /font-family: "Site Han Serif"/);
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
  for (const canvas of ["#f5f0e6", "#252724"]) {
    const values = { "--site-canvas": canvas, "--site-text": "#30332f", "--site-link": "#006778" };
    const palette = snapshotShareImagePalette({ getPropertyValue: key => values[key] || "" });
    values["--site-canvas"] = "changed";
    assert.equal(palette["--share-canvas"], canvas);
    assert.equal(palette["--share-link"], "#006778");
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
