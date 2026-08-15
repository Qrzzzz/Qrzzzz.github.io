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
const fifth = readFileSync("docs/excerpts/2026-07-25-01.md", "utf8");
const sixth = readFileSync("docs/excerpts/2026-07-27-01.md", "utf8");
const seventh = readFileSync("docs/excerpts/2026-07-29-01.md", "utf8");
const eighth = readFileSync("docs/excerpts/2026-07-29-02.md", "utf8");
const ninth = readFileSync("docs/excerpts/2026-07-29-03.md", "utf8");
const tenth = readFileSync("docs/excerpts/2026-07-29-04.md", "utf8");
const eleventh = readFileSync("docs/excerpts/2026-08-15-01.md", "utf8");

const excerptPages = [
  first,
  second,
  third,
  fourth,
  fifth,
  sixth,
  seventh,
  eighth,
  ninth,
  tenth,
  eleventh
];

test("uses shared data and compact previews for 偶拾", () => {
  assert.match(library, /<LibraryIndex \/>/);
  assert.match(index, /<CollectionIndex kind="excerpt" \/>/);
  assert.doesNotMatch(index, /class="content-index-row/);
  for (const page of excerptPages) {
    assert.match(page, /^collection: library$/m);
    assert.match(page, /^kind: excerpt$/m);
    assert.match(page, /^preview: .+$/m);
  }
  assert.match(
    styles,
    /\.library-result__title--excerpt\s*\{[\s\S]*?-webkit-line-clamp:\s*2/s
  );
});

test("keeps every excerpt in its own titleless Markdown page", () => {
  for (const page of excerptPages) {
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
  assert.match(fourth, /<blockquote lang="es">/);
  assert.match(fourth, /después de nuestro paso por aquí/);
  assert.match(fourth, /原文直译/);
  assert.match(fourth, /流传意译/);
  assert.match(fourth, /Mi campaña con el Che/);
  assert.match(fourth, /第 43—44 页/);
  assert.doesNotMatch(fourth, /^next: false$/m);
  assert.match(fifth, /我一直觉得，大家多少都在炒股。/);
  assert.match(fifth, /"城市发展"ETF/);
  assert.match(fifth, /也没法设止损。<\/p>/);
  assert.match(fifth, /谁都逃不过这场资产轮盘/);
  assert.match(fifth, /有些仓位，我们管它叫人生。/);
  assert.doesNotMatch(fifth, /^next: false$/m);
  assert.match(sixth, /你的沉默，究竟是在倾听另一个灵魂/);
  assert.match(sixth, /还是只是在为自我的声音等待空隙？/);
  assert.match(seventh, /不要寻找故土，要寻找沃土。/);
  assert.match(eighth, /<blockquote class="excerpt-quotation" lang="en">/);
  assert.match(eighth, /I plan to live Anthropically\./);
  assert.match(eighth, /I'll just become a stupider version of myself\./);
  assert.match(ninth, /我第一次为无神论者感到一些遗憾/);
  assert.match(
    ninth,
    /<footer>——章北海，出自刘慈欣<cite>《三体Ⅱ：黑暗森林》<\/cite><\/footer>/
  );
  assert.match(tenth, /不要听任何从小到大没有换过生活地点的长辈的话。/);
  assert.match(eleventh, /Take your fastest ship and brightest crew/);
  assert.match(eleventh, /chasing the escaping sun\./);
  assert.match(eleventh, /<footer>——电影<cite>《奥德赛》<\/cite><\/footer>/);
  assert.match(styles, /\.vp-doc \.excerpt-entry__heading\s*\{[\s\S]*?clip-path: inset\(50%\)/);
  assert.match(styles, /\.excerpt-renderings\s*\{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});

test("renders simple excerpts as standard body copy without an accent rail", () => {
  assert.match(
    styles,
    /\.excerpt-entry\s*\{[^}]*max-width:\s*none;[^}]*border-inline-start:\s*0;[^}]*padding-inline-start:\s*0;[^}]*\}/
  );
  assert.match(styles, /\.vp-doc blockquote:not\(\.excerpt-quotation\) p/);
  assert.match(
    styles,
    /\.vp-doc \.excerpt-entry > \.excerpt-quotation p\s*\{[^}]*margin:\s*18px 0;[^}]*font-size:\s*17px;[^}]*line-height:\s*1\.82;[^}]*\}/
  );
  assert.match(
    styles,
    /@media \(max-width: 767px\)[\s\S]*?\.vp-doc \.excerpt-entry > \.excerpt-quotation p\s*\{[^}]*font-size:\s*16px;[^}]*\}/
  );
});

test("wires 偶拾 into the top-level Library area without a left sidebar", () => {
  assert.doesNotMatch(config, /"\/excerpts\/": \[/);
  assert.match(
    config,
    /text: "资料库",[\s\S]*?\^\/\(\?:library\|notes\|prompt-collection\|excerpts\)/
  );
  assert.match(layout, /relativePath\.startsWith\("excerpts\/"\)/);
  assert.match(styles, /data-page-kind="excerpt"/);
});
