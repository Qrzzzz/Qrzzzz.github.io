import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const config = readFileSync("docs/.vitepress/config.mts", "utf8");
const layout = readFileSync("docs/.vitepress/theme/Layout.vue", "utf8");
const styles = readFileSync("docs/.vitepress/theme/styles/content.css", "utf8");
const library = readFileSync("docs/library/index.md", "utf8");
const index = readFileSync("docs/excerpts/index.md", "utf8");
const first = readFileSync("docs/excerpts/2026-07-17-01.md", "utf8");
const second = readFileSync("docs/excerpts/2026-07-17-02.md", "utf8");
const third = readFileSync("docs/excerpts/2026-07-17-03.md", "utf8");
const fourth = readFileSync("docs/excerpts/2026-07-22-01.md", "utf8");

test("adds 偶拾 as a fourth Library category with compact previews", () => {
  assert.match(library, /04 \/ EXCERPTS/);
  assert.match(library, /拜托你一直鲜活，keep learning，去思考原子……/);
  assert.match(library, /蝉真的是世界上最摇滚的生物了。一生大部分时间……/);
  assert.match(library, /棋局结束时，国王与卒子归入同一盒中。/);
  assert.match(library, /我们走后，他们会给你们修学校和医院，会提高你们的工资……/);
  assert.match(index, /class="content-index-row content-index-row--excerpt"/);
  assert.match(styles, /\.excerpt-preview\s*\{[\s\S]*?text-overflow: ellipsis;[\s\S]*?white-space: nowrap;/);
  assert.match(styles, /@media \(max-width: 767px\)[\s\S]*?\.excerpt-preview\s*\{[\s\S]*?-webkit-line-clamp: 2;[\s\S]*?white-space: normal;/);
  assert.match(styles, /\.content-index-row--excerpt \.content-index-meta\s*\{[\s\S]*?white-space: nowrap;/);
});

test("keeps every excerpt in its own titleless Markdown page", () => {
  for (const page of [first, second, third, fourth]) {
    assert.doesNotMatch(page, /^#\s+/m);
    assert.match(page, /class="excerpt-entry__heading"/);
  }

  assert.match(first, /拜托你一直鲜活，keep learning/);
  assert.match(second, /盛夏、音乐、性、死亡。/);
  assert.match(second, /这太摇滚了。/);
  assert.doesNotMatch(second, /^next: false$/m);
  assert.match(third, /<blockquote lang="it">/);
  assert.match(third, /<figcaption>意大利谚语<\/figcaption>/);
  assert.match(third, /杜牧《送隐者一绝》/);
  assert.doesNotMatch(third, /^next: false$/m);
  assert.match(fourth, /中文流传译文/);
  assert.match(fourth, /未检得可追溯的西班牙语原文；网络流传署名为切·格瓦拉，出处待考。/);
  assert.match(fourth, /^next: false$/m);
  assert.match(styles, /\.vp-doc \.excerpt-entry__heading\s*\{[\s\S]*?clip-path: inset\(50%\)/);
  assert.match(styles, /\.excerpt-renderings\s*\{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});

test("wires 偶拾 into contextual navigation and its page family", () => {
  assert.match(config, /"\/excerpts\/": \[/);
  assert.match(config, /\{ text: "偶拾", link: "\/excerpts\/" \}/);
  assert.match(layout, /relativePath\.startsWith\("excerpts\/"\)/);
  assert.match(styles, /data-page-kind="excerpt"/);
});
