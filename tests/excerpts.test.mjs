import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { createMarkdownRenderer } from "vitepress";

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
const twelfth = readFileSync("docs/excerpts/2026-08-16-01.md", "utf8");
const thirteenth = readFileSync("docs/excerpts/2026-08-17-01.md", "utf8");
const fourteenth = readFileSync("docs/excerpts/2026-08-21-01.md", "utf8");
const fifteenth = readFileSync("docs/excerpts/2026-08-21-02.md", "utf8");
const sixteenth = readFileSync("docs/excerpts/2026-08-24-01.md", "utf8");
const seventeenth = readFileSync("docs/excerpts/2026-08-24-02.md", "utf8");
const eighteenth = readFileSync("docs/excerpts/2026-08-24-03.md", "utf8");
const nineteenth = readFileSync("docs/excerpts/2026-08-25-01.md", "utf8");
const twentieth = readFileSync("docs/excerpts/2026-09-04-01.md", "utf8");
const twentyFirst = readFileSync("docs/excerpts/2026-09-06-01.md", "utf8");
const twentySecond = readFileSync("docs/excerpts/2026-09-06-02.md", "utf8");
const twentyThird = readFileSync("docs/excerpts/2026-09-07-01.md", "utf8");
const twentyFourth = readFileSync("docs/excerpts/2026-09-07-02.md", "utf8");
const twentyFifth = readFileSync("docs/excerpts/2026-09-07-03.md", "utf8");
const twentySixth = readFileSync("docs/excerpts/2026-09-07-04.md", "utf8");
const twentySeventh = readFileSync("docs/excerpts/2026-09-08-01.md", "utf8");
const twentyEighth = readFileSync("docs/excerpts/2026-09-09-01.md", "utf8");
const twentyNinth = readFileSync("docs/excerpts/2026-09-09-02.md", "utf8");
const thirtieth = readFileSync("docs/excerpts/2026-09-09-03.md", "utf8");
const thirtyFirst = readFileSync("docs/excerpts/2026-09-09-04.md", "utf8");
const thirtySecond = readFileSync("docs/excerpts/2026-09-10-01.md", "utf8");
const thirtyThird = readFileSync("docs/excerpts/2026-09-19-01.md", "utf8");
const thirtyFourth = readFileSync("docs/excerpts/2026-09-21-01.md", "utf8");
const thirtyFifth = readFileSync("docs/excerpts/2026-09-24-01.md", "utf8");
const thirtySixth = readFileSync("docs/excerpts/2026-09-26-01.md", "utf8");
const thirtySeventh = readFileSync("docs/excerpts/2026-09-26-02.md", "utf8");
const thirtyEighth = readFileSync("docs/excerpts/2026-09-28-01.md", "utf8");
const thirtyNinth = readFileSync("docs/excerpts/2026-09-28-04.md", "utf8");
const fortieth = readFileSync("docs/excerpts/2026-09-30-01.md", "utf8");
const fortyFirst = readFileSync("docs/excerpts/2026-09-30-02.md", "utf8");
const markdownBaseline = readFileSync("docs/excerpts/2026-09-28-02.md", "utf8");
const markdownBoldBaseline = readFileSync("docs/excerpts/2026-09-28-03.md", "utf8");
const markdown = await createMarkdownRenderer("docs", { math: true });

const specialMigratedExcerpts = [
  ["2026-07-17-03.md", "it"],
  ["2026-07-22-01.md", "es"],
  ["2026-08-24-03.md", "ja"],
  ["2026-08-25-01.md", "de"],
  ["2026-09-14-01.md", "en"],
  ["2026-09-16-01.md", "tr"],
  ["2026-09-23-01.md", "en"]
].map(([name, language]) => [
  name,
  language,
  readFileSync(`docs/excerpts/${name}`, "utf8")
]);

const migratedExcerpts = [
  ["2026-07-17-01.md", first],
  ["2026-07-17-02.md", second],
  ["2026-07-25-01.md", fifth],
  ["2026-07-27-01.md", sixth],
  ["2026-07-29-01.md", seventh],
  ["2026-07-29-02.md", eighth],
  ["2026-07-29-03.md", ninth],
  ["2026-07-29-04.md", tenth],
  ["2026-08-15-01.md", eleventh],
  ["2026-08-16-01.md", twelfth],
  ["2026-08-17-01.md", thirteenth],
  ["2026-08-21-01.md", fourteenth],
  ["2026-08-21-02.md", fifteenth],
  ["2026-08-24-01.md", sixteenth],
  ["2026-08-24-02.md", seventeenth],
  ["2026-09-04-01.md", twentieth],
  ["2026-09-06-01.md", twentyFirst],
  ["2026-09-06-02.md", twentySecond],
  ["2026-09-07-01.md", twentyThird],
  ["2026-09-07-02.md", twentyFourth],
  ["2026-09-07-03.md", twentyFifth],
  ["2026-09-07-04.md", twentySixth],
  ["2026-09-08-01.md", twentySeventh],
  ["2026-09-09-01.md", twentyEighth],
  ["2026-09-09-02.md", twentyNinth],
  ["2026-09-09-03.md", thirtieth],
  ["2026-09-09-04.md", thirtyFirst],
  ["2026-09-10-01.md", thirtySecond],
  ["2026-09-19-01.md", thirtyThird],
  ["2026-09-21-01.md", thirtyFourth],
  ["2026-09-24-01.md", thirtyFifth],
  ["2026-09-26-01.md", thirtySixth],
  ["2026-09-26-02.md", thirtySeventh],
  ["2026-09-28-01.md", thirtyEighth],
  ["2026-09-28-04.md", thirtyNinth],
  ["2026-09-30-01.md", fortieth],
  ["2026-09-30-02.md", fortyFirst]
];

const markdownBody = (source) =>
  source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");

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
  eleventh,
  twelfth,
  thirteenth,
  fourteenth,
  fifteenth,
  sixteenth,
  seventeenth,
  eighteenth,
  nineteenth,
  twentieth,
  twentyFirst,
  twentySecond,
  twentyThird,
  twentyFourth,
  twentyFifth,
  twentySixth,
  twentySeventh,
  twentyEighth,
  twentyNinth,
  thirtieth,
  thirtyFirst,
  thirtySecond,
  thirtyThird,
  thirtyFourth,
  thirtyFifth,
  thirtySixth,
  thirtySeventh,
  thirtyEighth,
  thirtyNinth,
  fortieth,
  fortyFirst
];

const excerptSources = readdirSync("docs/excerpts", { withFileTypes: true })
  .filter((entry) => entry.isFile() && /^\d{4}-\d{2}-\d{2}-\d{2}\.md$/.test(entry.name))
  .map((entry) => ({
    name: entry.name,
    source: readFileSync(`docs/excerpts/${entry.name}`, "utf8")
  }));

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

test("supports Markdown-authored excerpt bodies inside the outer article shell", () => {
  for (const [name, source] of migratedExcerpts) {
    assert.match(
      source,
      /<article class="excerpt-entry excerpt-entry--markdown(?: excerpt-entry--quotation)?"[^>]*aria-label="Excerpt">/,
      name + " should use the Markdown excerpt shell"
    );
    assert.doesNotMatch(
      source,
      /<p>|<pre><code>/,
      name + " should not keep handwritten paragraph or code-block HTML"
    );
  }

  assert.match(
    markdownBaseline,
    /<article class="excerpt-entry excerpt-entry--markdown"[^>]*aria-label="Excerpt">/
  );
  assert.match(markdownBaseline, /^# 跟 AI 说，你证明了一个数学猜想$/m);
  assert.match(markdownBaseline, /\$-2\$/);
  assert.match(markdownBaseline, /^\$\$$/m);
  assert.match(markdownBaseline, /^> 我证明了雅可比猜想：$/m);
  assert.doesNotMatch(markdownBaseline, /<p>|<pre><code>|class="excerpt-quotation"/);
  assert.match(markdownBoldBaseline, /\*\*Did that fix it\?\*\*/);

  assert.match(eighth, /<blockquote class="excerpt-quotation" lang="en">/);
  assert.match(ninth, /^> 我第一次为无神论者感到一些遗憾/m);
  assert.match(twelfth, /^> 预计到2020年，国际上微电子技术水平将发展到14纳米/m);
  assert.match(fourteenth, /^> 没有恶意的人被恶意砸中的时候/m);
  assert.match(fifteenth, /^> 我十分怀念在大学里学习的时光/m);
  assert.match(sixteenth, /^> 多和健谈的人一起吃麦当劳/m);
  assert.match(seventeenth, /<blockquote class="excerpt-quotation" lang="en">/);
  assert.match(twentieth, /\*\*“When we work on making our devices accessible by the blind,”/);
  assert.doesNotMatch(twentieth, /<strong>/);
  assert.match(twentyFirst, /^> 1\\\. Get coffee\\$/m);
  assert.match(twentySecond, /<blockquote class="excerpt-quotation" lang="en">/);
  assert.match(twentyThird, /<blockquote class="excerpt-quotation" lang="en">/);
  assert.match(twentyFourth, /^> 猫这种东西/m);
  assert.match(twentyFifth, /^> 但是太阳/m);
  assert.match(twentySixth, /<blockquote class="excerpt-quotation" lang="en">/);
  assert.match(twentySeventh, /<blockquote class="excerpt-quotation" lang="en">/);
  assert.match(twentyEighth, /<blockquote class="excerpt-quotation" lang="en">/);
  assert.match(twentyNinth, /^> 很多人不知道人生体验也是有利息的。$/m);
  assert.match(thirtieth, /^> 当时地球还年轻，我们诞生在荒凉的大海里。/m);
  assert.match(thirtyFirst, /^> 人生在世必遇患难，如同火星飞腾。$/m);
  assert.match(thirtyFirst, /<cite><a href="https:\/\/www\.biblegateway\.com\/passage\//);
  assert.match(thirtySecond, /\*\*蒸馏更好的模型\*\*/);
  assert.doesNotMatch(thirtySecond, /<strong>/);
  assert.match(thirtyThird, /^> 我们能不能不要再聊奖学金科研竞赛绩点入党社团活动了\\$/m);
  assert.match(thirtyFourth, /^> 海永远无法被看完。/m);
  assert.match(thirtyFifth, /^> 桂花的香，是忽然来的。/m);
  assert.match(thirtySixth, /^> 我大抵是害怕了。$/m);
  assert.match(thirtySeventh, /<blockquote class="excerpt-quotation" lang="en">/);
  assert.match(thirtySeventh, /^Do you hear the people sing\?\\$/m);
  assert.match(thirtyEighth, /<blockquote class="excerpt-quotation" lang="en">/);
  assert.match(thirtyNinth, /^> 2020 年，光大证券保荐业务部门负责人/m);
  assert.match(fortieth, /^::: info 校订说明$/m);
  assert.match(fortieth, /^> 染上大荤了……/m);
  assert.match(fortyFirst, /^# 2026-10-04-01$/m);
  assert.match(fortyFirst, /^\*\*作者：佚名\*\*$/m);
  assert.match(fortyFirst, /^## 从中国访问回来的金正日将军$/m);
  assert.match(fortyFirst, /战争总是要有牺牲的。为民族独立事业牺牲的人是伟大的。/);
  assert.doesNotMatch(fortyFirst, /<footer|<cite|<a href=/);

  const renderedSimple = markdown.render(markdownBody(first));
  assert.match(
    renderedSimple,
    /<article class="excerpt-entry excerpt-entry--markdown"[^>]*>[\s\S]*?<p>拜托你一直鲜活，keep learning/
  );

  const renderedBaseline = markdown.render(markdownBody(markdownBaseline));
  assert.match(renderedBaseline, /<h1[^>]*>跟 AI 说，你证明了一个数学猜想\s*<a class="header-anchor"/);
  assert.equal((renderedBaseline.match(/<mjx-container\b/g) ?? []).length, 8);
  assert.match(renderedBaseline, /data-mml-node="mtable"/);
  assert.match(renderedBaseline, /<blockquote>[\s\S]*?<p>我证明了雅可比猜想：<\/p>/);

  const renderedBoldBaseline = markdown.render(markdownBody(markdownBoldBaseline));
  assert.match(renderedBoldBaseline, /<strong>Did that fix it\?<\/strong>/);

  const renderedLangExcerpt = markdown.render(markdownBody(eighth));
  assert.match(
    renderedLangExcerpt,
    /<blockquote class="excerpt-quotation" lang="en">[\s\S]*?<p>I plan to live Anthropically\./
  );

  const renderedQuotedExcerpt = markdown.render(markdownBody(ninth));
  assert.match(
    renderedQuotedExcerpt,
    /<blockquote>[\s\S]*?<p>我第一次为无神论者感到一些遗憾[^<]*<\/p>[\s\S]*?<footer>/
  );

  const renderedRoutine = markdown.render(markdownBody(twentyFirst));
  assert.match(
    renderedRoutine,
    /<blockquote>[\s\S]*?<p>My new Sunday morning routine:<\/p>[\s\S]*?<p>1\. Get coffee<br>\s*2\. Check GPT-5\.4 projects/
  );

  const renderedSeptemberBatch = [
    markdown.render(markdownBody(twentyThird)),
    markdown.render(markdownBody(twentyFourth)),
    markdown.render(markdownBody(twentyFifth)),
    markdown.render(markdownBody(twentySixth)),
    markdown.render(markdownBody(twentySeventh)),
    markdown.render(markdownBody(twentyEighth))
  ];
  assert.match(renderedSeptemberBatch[0], /<blockquote class="excerpt-quotation" lang="en">[\s\S]*?<p>If it’s painful/);
  assert.match(renderedSeptemberBatch[1], /<blockquote>[\s\S]*?<p>猫这种东西/);
  assert.match(renderedSeptemberBatch[2], /<blockquote>[\s\S]*?<p>但是太阳[\s\S]*?<footer>史铁生/);
  assert.match(renderedSeptemberBatch[3], /<blockquote class="excerpt-quotation" lang="en">[\s\S]*?<p>4397328654844826923/);
  assert.match(renderedSeptemberBatch[4], /<blockquote class="excerpt-quotation" lang="en">[\s\S]*?<p>The reasonable man/);
  assert.match(renderedSeptemberBatch[5], /<blockquote class="excerpt-quotation" lang="en">[\s\S]*?<p>I resigned from Anthropic today/);

  const renderedCurrentBatch = [
    markdown.render(markdownBody(twentyNinth)),
    markdown.render(markdownBody(thirtieth)),
    markdown.render(markdownBody(thirtyFirst)),
    markdown.render(markdownBody(thirtySecond)),
    markdown.render(markdownBody(thirtyThird)),
    markdown.render(markdownBody(thirtyFourth))
  ];
  assert.match(renderedCurrentBatch[0], /<blockquote>[\s\S]*?<p>很多人不知道人生体验也是有利息的。<\/p>/);
  assert.match(renderedCurrentBatch[1], /<blockquote>[\s\S]*?<p>当时地球还年轻，我们诞生在荒凉的大海里。/);
  assert.match(renderedCurrentBatch[2], /<blockquote>[\s\S]*?<a href="https:\/\/www\.biblegateway\.com\/passage\//);
  assert.match(renderedCurrentBatch[2], /<footer><cite><a [^>]+>《约伯记》<\/a><\/cite> 5:7<\/footer>/);
  assert.match(renderedCurrentBatch[3], /<strong>蒸馏更好的模型<\/strong>/);
  assert.match(renderedCurrentBatch[4], /奖学金科研竞赛绩点入党社团活动了<br>/);
  assert.match(renderedCurrentBatch[5], /<blockquote>[\s\S]*?<p>海永远无法被看完。/);

  const renderedLatestBatch = [
    markdown.render(markdownBody(thirtyFifth)),
    markdown.render(markdownBody(thirtySixth)),
    markdown.render(markdownBody(thirtySeventh)),
    markdown.render(markdownBody(thirtyEighth)),
    markdown.render(markdownBody(thirtyNinth)),
    markdown.render(markdownBody(fortieth)),
    markdown.render(markdownBody(fortyFirst))
  ];
  assert.match(renderedLatestBatch[0], /<blockquote>[\s\S]*?<p>桂花的香，是忽然来的。/);
  assert.match(renderedLatestBatch[1], /<blockquote>[\s\S]*?<p>我大抵是害怕了。<\/p>[\s\S]*?<p>照学校的规规条条把头发剪了/);
  assert.match(renderedLatestBatch[2], /<blockquote class="excerpt-quotation" lang="en">[\s\S]*?<p>Do you hear the people sing\?<br>\s*Singing the song of angry men<br>/);
  assert.match(renderedLatestBatch[2], /<footer>Herbert Kretzmer \(English lyrics\), Claude-Michel Schönberg \(music\); “<cite>/);
  assert.match(renderedLatestBatch[3], /<blockquote class="excerpt-quotation" lang="en">[\s\S]*?<p>Hating pop music doesn’t make you deep\.<\/p>/);
  assert.match(renderedLatestBatch[4], /<blockquote>[\s\S]*?<p>2020 年，光大证券保荐业务部门负责人/);
  assert.match(renderedLatestBatch[4], /<footer>tombkeeper，<cite><a href="https:\/\/www\.sina\.cn\/news\/detail\/5347753652653895\.html">新浪新闻<\/a><\/cite>/);
  assert.match(renderedLatestBatch[5], /<div class="info custom-block">[\s\S]*?明显错别字已保留原写法/);
  assert.match(renderedLatestBatch[5], /是在（实在）处理不好那么多番茄/);
  assert.match(renderedLatestBatch[5], /把我（把握）不好火候/);
  assert.match(renderedLatestBatch[5], /流子（路子）处理羊肉/);
  assert.match(renderedLatestBatch[5], /潮水（焯水）/);
  assert.match(renderedLatestBatch[5], /<footer>她不想死也想去巴黎，<cite><a href="https:\/\/weibo\.com\/7709681873\/RjuN2qDLP">微博<\/a><\/cite>，2026 年 9 月 24 日 00:17<\/footer>/);
  assert.doesNotMatch(fortieth, /utm_source=/);
  assert.match(renderedLatestBatch[6], /<h1[^>]*>2026-10-04-01\s*<a class="header-anchor"/);
  assert.match(renderedLatestBatch[6], /<blockquote>[\s\S]*?<p>从中国访问回来金正日爷爷全然不顾身体的疲惫/);
  assert.doesNotMatch(renderedLatestBatch[6], /<footer>|<cite>/);
  assert.doesNotMatch(renderedLatestBatch[6], /<a\s(?!class="header-anchor")/);

  assert.match(
    styles,
    /\.vp-doc \.excerpt-entry--markdown > p\s*\{[^}]*margin:\s*18px 0;[^}]*font-size:\s*var\(--site-body-size\);[^}]*line-height:\s*1\.82;[^}]*\}/
  );
  assert.match(
    styles,
    /\.vp-doc \.excerpt-entry--quotation > blockquote\s*\{[^}]*border:\s*0;[^}]*margin:\s*0;[^}]*padding:\s*0;[^}]*\}/
  );
});

test("renders Markdown inside preserved special excerpt containers", () => {
  const renderedByName = new Map();

  for (const [name, language, source] of specialMigratedExcerpts) {
    assert.match(
      source,
      /<article class="excerpt-entry excerpt-entry--markdown excerpt-entry--parallel"[^>]*aria-label="Excerpt">/,
      name + " should use the Markdown parallel excerpt shell"
    );
    assert.doesNotMatch(source, /<p>/, name + " should not keep handwritten paragraph HTML");
    assert.match(source, /<figure class="excerpt-source">/);
    assert.match(source, new RegExp(`<blockquote lang="${language}">`));
    assert.match(source, /<figcaption\b[^>]*>/);
    assert.match(source, /<div class="excerpt-renderings(?: excerpt-renderings--single)?"[^>]*>/);
    assert.match(source, /<div class="excerpt-rendering">/);

    const rendered = markdown.render(markdownBody(source));
    renderedByName.set(name, rendered);

    assert.match(
      rendered,
      /<figure class="excerpt-source">[\s\S]*?<blockquote\b[^>]*>[\s\S]*?<p>/,
      name + " should render Markdown paragraphs inside the preserved source blockquote"
    );
    assert.match(
      rendered,
      /<div class="excerpt-rendering">[\s\S]*?<blockquote>[\s\S]*?<p>/,
      name + " should render Markdown paragraphs inside the preserved translation container"
    );
    assert.doesNotMatch(rendered, /<figcaption\b[^>]*>\s*<p>/);
    assert.doesNotMatch(rendered, /<p><cite>/);
  }

  assert.equal((renderedByName.get("2026-07-17-03.md").match(/<br>/g) ?? []).length, 1);
  assert.equal((renderedByName.get("2026-08-24-03.md").match(/<br>/g) ?? []).length, 8);
});

test("keeps every excerpt in its own Markdown page", () => {
  for (const { source: page, name } of excerptSources) {
    assert.doesNotMatch(page, /excerpt-entry__heading|aria-labelledby=/m);
    assert.ok(page.includes(`title: Excerpt ${name.slice(0, -3)}`));
    assert.match(page, /aria-label="Excerpt"/);
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
  assert.doesNotMatch(fourth, /<h2>/);
  assert.match(fourth, /Mi campaña con el Che/);
  assert.match(fourth, /第 43—44 页/);
  assert.doesNotMatch(fourth, /^next: false$/m);
  assert.match(fifth, /其实大家多少都在炒股。/);
  assert.match(fifth, /城市发展 ETF/);
  assert.match(fifth, /也没法设止损。/);
  assert.match(fifth, /谁都逃不过这场资产轮盘/);
  assert.match(fifth, /只是有些仓位叫投资，有些仓位叫人生。/);
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
    /<footer>章北海，出自刘慈欣<cite>《三体Ⅱ：黑暗森林》<\/cite><\/footer>/
  );
  assert.match(tenth, /不要听任何从小到大没有换过生活地点的长辈的话。/);
  assert.match(eleventh, /Take your fastest ship and brightest crew/);
  assert.match(eleventh, /chasing the escaping sun\./);
  assert.match(
    eleventh,
    /<footer>Film <cite><a href="https:\/\/www\.odysseymovie\.com\/">The Odyssey<\/a><\/cite><\/footer>/
  );
  assert.match(twelfth, /预计到2020年，国际上微电子技术水平将发展到14纳米/);
  assert.match(twelfth, /核心技术是买不到的，必须靠我们自己/);
  assert.match(
    twelfth,
    /<footer>江泽民，<cite>《努力把握微电子、软件和计算机产业的技术主动权》<\/cite>，2006 年 12 月 10 日；后收入<cite>《论中国信息技术产业发展》<\/cite><\/footer>/
  );
  assert.match(thirteenth, /Even if model capabilities were frozen at today’s level/);
  assert.match(thirteenth, /we would expect major changes to occur in the world\./);
  assert.match(
    thirteenth,
    /<footer>Anthropic Institute, <cite><a href="https:\/\/www\.anthropic\.com\/institute\/recursive-self-improvement">When AI builds itself<\/a><\/cite>, 2026<\/footer>/
  );
  assert.match(fourteenth, /没有恶意的人被恶意砸中的时候，第一反应不是反击，而是想不通。/);
  assert.match(fourteenth, /你不必反复纠结他们为什么那样，因为你不是那样的人。/);
  assert.match(fifteenth, /我十分怀念在大学里学习的时光/);
  assert.match(sixteenth, /多和健谈的人一起吃麦当劳/);
  assert.match(sixteenth, /<footer>麦当劳中国<\/footer>/);
  assert.doesNotMatch(sixteenth, /<footer>[^<]*[—–-]/);
  assert.match(nineteenth, /<blockquote lang="de">/);
  assert.match(nineteenth, /Und verloren sei uns der Tag, wo nicht Ein Mal getanzt wurde!/);
  assert.doesNotMatch(nineteenth, /<h2>/);
  assert.match(nineteenth, /每一个不曾起舞的日子都是对生命的辜负。/);
  assert.match(
    nineteenth,
    /<figcaption lang="de">Friedrich Nietzsche, <cite>Also sprach Zarathustra<\/cite>, Dritter Teil, „<a [^>]+>Von alten und neuen Tafeln<\/a>“, § 23<\/figcaption>/
  );
  assert.match(
    nineteenth,
    /<cite>弗里德里希·尼采《查拉图斯特拉如是说》，第三部〈论旧榜与新榜〉第 23 节<\/cite>/
  );
  assert.match(styles, /\.excerpt-renderings\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
});

test("preserves the Tim Cook report and formats its source as an excerpt attribution", () => {
  assert.match(twentieth, /<blockquote class="excerpt-quotation" lang="en">/);
  assert.match(
    twentieth,
    /\*\*“When we work on making our devices accessible by the blind,” he said, “I don't consider the bloody ROI\.”\*\*/
  );
  assert.doesNotMatch(twentieth, /<p>|<strong>/);
  const renderedTimCook = markdown.render(markdownBody(twentieth));
  const paragraphs = [...renderedTimCook.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((match) => match[1]);
  assert.equal(paragraphs.length, 6);
  assert.match(paragraphs[0], /^That shareholder proposal was rejected by Apple's shareholders, receiving just 2\.95 percent of the vote\./);
  assert.match(paragraphs[1], /Apple plans on having 100 percent of its power come from green sources/);
  assert.match(paragraphs[2], /commit right then and there to doing only those things that were profitable\./);
  assert.match(paragraphs[3], /a return on investment \(ROI\) was not the primary consideration on such issues\./);
  assert.equal(
    paragraphs[4],
    '<strong>“When we work on making our devices accessible by the blind,” he said, “I don\'t consider the bloody ROI.”</strong> He said that the same thing about environmental issues, worker safety, and other areas where Apple is a leader.'
  );
  assert.match(paragraphs[5], /the usual metered and controlled way he speaks\.$/);
  assert.match(
    twentieth,
    /<footer>Bryan Chaffin, <cite><a href="https:\/\/www\.macobserver\.com\/news\/tim-cook-rejects-ncppr-politics\/">“Tim Cook Soundly Rejects Politics of the NCPPR, Suggests Group Sell Apple's Stock”<\/a><\/cite>, <cite>The Mac Observer<\/cite>, February 28, 2014\.<\/footer>/
  );
  assert.doesNotMatch(twentieth, /报道背景：Apple Inc\. 2014 年度股东大会问答环节。/);
  assert.doesNotMatch(twentieth, /ROI 并非所有决策的首要标准。/);
  assert.doesNotMatch(twentieth, /utm_source=|&#x20;|\*\*出处\*\*/);
});

test("keeps every excerpt attribution free of leading dashes", () => {
  assert.match(index, /excerpt-attribution-rule:[^\n]*must not begin with a dash/);

  const attributionPattern = /<(footer|figcaption|cite)\b[^>]*>([\s\S]*?)<\/\1>/g;
  const leadingDashPattern = /^(?:—|–|-|&mdash;|&ndash;|&#8212;|&#x2014;)/i;

  for (const { name, source } of excerptSources) {
    for (const match of source.matchAll(attributionPattern)) {
      const [, element, body] = match;
      const visibleText = body.replace(/<[^>]+>/g, "").trimStart();
      assert.doesNotMatch(
        visibleText,
        leadingDashPattern,
        `${name} 的 <${element}> 出处不得以破折号开头`
      );
    }
  }
});

test("renders simple excerpts as standard body copy without an accent rail", () => {
  assert.match(
    styles,
    /\.excerpt-entry\s*\{[^}]*max-width:\s*none;[^}]*border-inline-start:\s*0;[^}]*padding-inline-start:\s*0;[^}]*\}/
  );
  assert.match(styles, /\.vp-doc blockquote:not\(\.excerpt-quotation\) p/);
  assert.match(
    styles,
    /\.vp-doc \.excerpt-entry > \.excerpt-quotation p\s*\{[^}]*margin:\s*18px 0;[^}]*font-size:\s*var\(--site-body-size\);[^}]*line-height:\s*1\.82;[^}]*\}/
  );
  assert.match(
    styles,
    /\.vp-doc \.excerpt-entry > \.excerpt-quotation footer\s*\{[^}]*text-align:\s*right;[^}]*\}/
  );
  assert.match(
    styles,
    /@media \(max-width: 767px\)\s*\{\s*:root\s*\{[^}]*--site-body-size:\s*17px;/
  );
});

test("renders translations across the full excerpt width", () => {
  assert.match(
    eighteenth,
    /class="excerpt-renderings excerpt-renderings--single" aria-label="中文翻译"/
  );
  assert.match(
    nineteenth,
    /class="excerpt-renderings excerpt-renderings--single" aria-label="中文表达"/
  );
  assert.match(
    styles,
    /\.excerpt-renderings\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);[^}]*\}/
  );
  assert.match(
    styles,
    /\.vp-doc \.excerpt-source figcaption\s*\{[^}]*text-align:\s*right;[^}]*\}/
  );
  assert.match(
    styles,
    /\.vp-doc \.excerpt-rendering cite\s*\{[^}]*text-align:\s*right;[^}]*\}/
  );
});

test("wires 偶拾 into the top-level Library area without a left sidebar", () => {
  assert.doesNotMatch(config, /"\/excerpts\/": \[/);
  assert.match(
    config,
    /text: "Library",[\s\S]*?\^\/\(\?:library\|notes\|prompt-collection\|excerpts\)/
  );
  assert.match(layout, /relativePath\.startsWith\("excerpts\/"\)/);
  assert.match(styles, /data-page-kind="excerpt"/);
});
