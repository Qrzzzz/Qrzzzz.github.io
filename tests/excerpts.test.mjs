import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import YAML from "yaml";
import { parseHTML } from "linkedom";
import { createMarkdownRenderer } from "vitepress";

const config = readFileSync("docs/.vitepress/config.mts", "utf8");
const layout = readFileSync("docs/.vitepress/theme/Layout.vue", "utf8");
const styles = readFileSync("docs/.vitepress/theme/styles/content.css", "utf8");
const index = readFileSync("docs/excerpts/index.md", "utf8");
const markdown = await createMarkdownRenderer("docs", { math: true });
const pages = readdirSync("docs/excerpts").filter(name => /^\d{4}-\d{2}-\d{2}-\d{2}\.md$/.test(name)).map(name => {
  const source = readFileSync(`docs/excerpts/${name}`, "utf8").replace(/\r\n/g, "\n");
  const match = source.match(/^---\n([\s\S]*?)\n---/);
  const meta = YAML.parse(match[1]);
  const body = source.slice(match[0].length).trim();
  const document = parseHTML(`<html><body>${markdown.render(body)}</body></html>`).document;
  return { name, source, meta, body, document };
});
const page = id => pages.find(item => item.name === `${id}.md`);

test("uses shared data and compact previews for 偶拾", () => {
  assert.match(readFileSync("docs/library/index.md", "utf8"), /<LibraryIndex \/>/);
  assert.match(index, /<CollectionIndex kind="excerpt" \/>/);
  for (const item of pages) {
    assert.equal(item.meta.collection, "library", item.name);
    assert.equal(item.meta.kind, "excerpt", item.name);
    assert.ok(item.meta.preview.trim(), item.name);
  }
  assert.match(styles, /\.library-result__title--excerpt\s*\{[\s\S]*?-webkit-line-clamp:\s*2/);
});

test("supports Markdown-authored excerpt bodies inside the outer article shell", () => {
  for (const { name, body, document } of pages) {
    assert.match(body, /^<article class="excerpt-entry excerpt-entry--markdown"[^>]*aria-label="Excerpt">/, name);
    assert.doesNotMatch(body, /<(?:p|h[1-6]|blockquote|footer|figure|figcaption|cite)(?:\s|>)/, name);
    assert.doesNotMatch(body, /excerpt-entry--(?:parallel|quotation)|excerpt-renderings/, name);
    assert.equal(document.querySelectorAll("article.excerpt-entry").length, 1, name);
    assert.ok(document.querySelector("article.excerpt-entry > p"), name);
  }
  const math = page("2026-09-28-02");
  assert.match(math.body, /^> 我证明了雅可比猜想：$/m);
  assert.equal(math.document.querySelectorAll("mjx-container").length, 8);
  assert.ok(math.document.querySelector('mjx-container [data-mml-node="mtable"]'));
  assert.match(page("2026-09-28-03").body, /\*\*Did that fix it\?\*\*/);
  assert.match(page("2026-10-15-02").body, /^> 腌蛋以高邮为佳/m);
  assert.ok(page("2026-10-04-01").document.querySelector("ruby rt"));
});

test("renders Markdown inside preserved special excerpt containers", () => {
  for (const [id, lang] of [["2026-07-17-03", "it"], ["2026-07-22-01", "es"], ["2026-08-24-03", "ja"], ["2026-08-25-01", "de"], ["2026-09-14-01", "en"], ["2026-09-16-01", "tr"], ["2026-09-23-01", "en"]]) {
    const item = page(id);
    const article = item.document.querySelector("article");
    assert.equal(article.getAttribute("lang"), lang, id);
    assert.ok(article.querySelector(":scope > p"), id);
    assert.ok(article.querySelector(":scope > .excerpt-attribution p"), id);
    assert.ok(article.querySelector(".excerpt-translations .excerpt-translation[lang='zh-CN'] > p"), id);
    const children = [...article.children];
    assert.ok(children.findIndex(n => n.classList.contains("excerpt-attribution")) < children.findIndex(n => n.classList.contains("excerpt-translations")), id);
  }
  assert.equal(page("2026-07-17-03").document.querySelectorAll(".excerpt-translations br").length, 1);
  assert.equal(page("2026-08-24-03").document.querySelectorAll(".excerpt-translations br").length, 4);
  assert.match(page("2026-07-17-03").body, /关联诗句/);
  assert.match(page("2026-07-22-01").body, /中文表达/);
});

test("keeps every excerpt in its own Markdown page", () => {
  for (const { name, body, meta, document } of pages) {
    const article = document.querySelector("article");
    assert.equal(article.id, `excerpt-${name.slice(0, -3)}`, name);
    assert.equal(article.getAttribute("lang"), meta.lang, name);
    assert.equal(meta.outline, false, name);
    assert.equal(meta.description, undefined, name);
    assert.doesNotMatch(body, /excerpt-entry__heading|aria-labelledby=/, name);
    const headings = article.querySelectorAll("h1");
    assert.ok(headings.length <= 1, name);
    if (headings.length) {
      assert.equal(meta.complete, true, name);
      const heading = headings[0].cloneNode(true);
      heading.querySelectorAll(".header-anchor").forEach(n => n.remove());
      assert.equal(heading.textContent.trim(), meta.title, name);
      assert.equal(article.firstElementChild.localName, "h1", name);
    } else {
      assert.equal(meta.complete, false, name);
      assert.equal(meta.title, `Excerpt ${name.slice(0, -3)}`, name);
    }
    for (const note of article.querySelectorAll(":scope > .excerpt-notes")) {
      assert.equal(note.nextElementSibling?.className ?? "excerpt-notes", "excerpt-notes", name);
    }
  }
  const passages = {
    "2026-07-17-01": "拜托你一直鲜活，keep learning",
    "2026-07-17-02": "这太摇滚了。",
    "2026-07-25-01": "只是有些仓位叫投资，有些仓位叫人生。",
    "2026-07-27-01": "还是只是在为自我的声音等待空隙？",
    "2026-07-29-01": "不要寻找故土，要寻找沃土。",
    "2026-07-29-02": "I'll just become a stupider version of myself.",
    "2026-07-29-03": "我第一次为无神论者感到一些遗憾",
    "2026-07-29-04": "不要听任何从小到大没有换过生活地点的长辈的话。",
    "2026-08-15-01": "chasing the escaping sun.",
    "2026-08-16-01": "核心技术是买不到的，必须靠我们自己",
    "2026-08-17-01": "we would expect major changes to occur in the world.",
    "2026-08-21-01": "你不必反复纠结他们为什么那样，因为你不是那样的人。",
    "2026-08-21-02": "我十分怀念在大学里学习的时光",
    "2026-08-24-01": "多和健谈的人一起吃麦当劳",
    "2026-08-25-01": "每一个不曾起舞的日子都是对生命的辜负。",
    "2026-09-06-01": "My new Sunday morning routine:",
    "2026-09-06-02": "I wonder",
    "2026-09-07-01": "If it’s painful",
    "2026-09-07-02": "总之，猫好玩",
    "2026-09-07-03": "但是太阳",
    "2026-09-07-04": "4397328654844826923",
    "2026-09-08-01": "The reasonable man",
    "2026-09-09-01": "I resigned from Anthropic today",
    "2026-09-09-02": "很多人不知道人生体验也是有利息的。",
    "2026-09-09-03": "当时地球还年轻，我们诞生在荒凉的大海里。",
    "2026-09-09-04": "人生在世必遇患难，如同火星飞腾。",
    "2026-09-10-01": "蒸馏更好的模型",
    "2026-09-19-01": "在这个深秋",
    "2026-09-21-01": "海永远无法被看完。",
    "2026-09-24-01": "桂花的香，是忽然来的。",
    "2026-09-26-01": "竟摸出根辫子。",
    "2026-09-26-02": "Do you hear the people sing?",
    "2026-09-28-01": "Hating pop music doesn’t make you deep.",
    "2026-09-28-04": "2020 年，光大证券保荐业务部门负责人",
    "2026-09-30-01": "潮水（焯水）",
    "2026-09-30-02": "战争总是要有牺牲的。为民族独立事业牺牲的人是伟大的。",
    "2026-10-15-02": "筷子头一扎下去，吱——红油就冒出来了。",
    "2026-10-21-03": "却道天凉好个秋！",
    "2026-10-21-06": "古今将相在何方？荒冢一堆草没了。"
  };
  for (const [id, text] of Object.entries(passages)) assert.ok(page(id).document.body.textContent.includes(text), id);
});

test("preserves the Tim Cook report and formats its source as an excerpt attribution", () => {
  const item = page("2026-09-04-01");
  const paragraphs = [...item.document.querySelectorAll("article > p")];
  assert.equal(paragraphs.length, 6);
  assert.match(paragraphs[0].textContent, /^That shareholder proposal was rejected by Apple's shareholders/);
  assert.match(paragraphs[1].textContent, /100 percent of its power/);
  assert.match(paragraphs[2].textContent, /commit right then and there/);
  assert.match(paragraphs[3].textContent, /return on investment/);
  assert.equal(paragraphs[4].querySelector("strong").textContent, "“When we work on making our devices accessible by the blind,” he said, “I don't consider the bloody ROI.”");
  assert.match(paragraphs[5].textContent, /the usual metered and controlled way he speaks\.$/);
  const source = item.document.querySelector(".excerpt-attribution");
  assert.match(source.textContent, /Bryan Chaffin/);
  assert.equal(source.querySelector("a").href, "https://www.macobserver.com/news/tim-cook-rejects-ncppr-politics/");
  assert.doesNotMatch(item.source, /utm_source=|&#x20;|\*\*出处\*\*/);
});

test("keeps every excerpt attribution free of leading dashes", () => {
  assert.match(index, /excerpt-attribution-rule:[^\n]*must not begin with a dash/);
  for (const {name, document} of pages) for (const source of document.querySelectorAll(".excerpt-attribution")) {
    assert.ok(source.textContent.trim(), name);
    assert.doesNotMatch(source.textContent.trim(), /^(?:—|–|-)/, name);
    assert.ok(source.querySelector("p"), name);
  }
});

test("renders simple excerpts as standard body copy without an accent rail", () => {
  assert.match(styles, /\.excerpt-entry\s*\{[^}]*max-width:\s*none;[^}]*border-inline-start:\s*0;[^}]*padding-inline-start:\s*0;/);
  assert.match(styles, /\.vp-doc \.excerpt-entry > p,[\s\S]*?line-height:\s*1\.82/);
  assert.match(styles, /\.excerpt-entry \.excerpt-attribution\s*\{[^}]*text-align:\s*right;/);
  assert.match(styles, /@media \(max-width: 767px\)\s*\{\s*:root\s*\{[^}]*--site-body-size:\s*18px;/);
});

test("renders translations across the full excerpt width", () => {
  assert.match(styles, /\.excerpt-translations\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(styles, /\.excerpt-translation\s*\{[^}]*min-width:\s*0/);
  assert.equal(page("2026-08-24-03").document.querySelectorAll(".excerpt-translation").length, 1);
  assert.equal(page("2026-07-17-03").document.querySelectorAll(".excerpt-translation").length, 2);
});

test("wires 偶拾 into the top-level Library area without a left sidebar", () => {
  assert.doesNotMatch(config, /"\/excerpts\/": \[/);
  assert.match(layout, /relativePath\.startsWith\("excerpts\/"\)/);
  assert.match(styles, /data-page-kind="excerpt"/);
  const guide = readFileSync("docs/guide/writing-style.md", "utf8");
  assert.match(guide, /^## Excerpts 新增与维护$/m);
  assert.match(readFileSync("docs/guide/getting-started.md", "utf8"), /writing-style#excerpts-新增与维护/);
});
