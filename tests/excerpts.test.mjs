import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
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
const twelfth = readFileSync("docs/excerpts/2026-08-16-01.md", "utf8");
const thirteenth = readFileSync("docs/excerpts/2026-08-17-01.md", "utf8");
const fourteenth = readFileSync("docs/excerpts/2026-08-21-01.md", "utf8");
const fifteenth = readFileSync("docs/excerpts/2026-08-21-02.md", "utf8");
const sixteenth = readFileSync("docs/excerpts/2026-08-24-01.md", "utf8");
const seventeenth = readFileSync("docs/excerpts/2026-08-24-02.md", "utf8");
const eighteenth = readFileSync("docs/excerpts/2026-08-24-03.md", "utf8");
const nineteenth = readFileSync("docs/excerpts/2026-08-25-01.md", "utf8");
const twentieth = readFileSync("docs/excerpts/2026-09-04-01.md", "utf8");

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
  twentieth
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
  assert.match(fifth, /其实大家多少都在炒股。/);
  assert.match(fifth, /城市发展 ETF/);
  assert.match(fifth, /也没法设止损。<\/p>/);
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
  assert.match(eleventh, /<footer>Film <cite>The Odyssey<\/cite><\/footer>/);
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
    /<footer>Anthropic Institute, <cite>When AI builds itself<\/cite>, 2026<\/footer>/
  );
  assert.match(fourteenth, /没有恶意的人被恶意砸中的时候，第一反应不是反击，而是想不通。/);
  assert.match(fourteenth, /你不必反复纠结他们为什么那样，因为你不是那样的人。/);
  assert.match(fifteenth, /我十分怀念在大学里学习的时光/);
  assert.match(sixteenth, /多和健谈的人一起吃麦当劳/);
  assert.match(sixteenth, /<footer>麦当劳中国<\/footer>/);
  assert.doesNotMatch(sixteenth, /<footer>[^<]*[—–-]/);
  assert.match(nineteenth, /<blockquote lang="de">/);
  assert.match(nineteenth, /Und verloren sei uns der Tag, wo nicht Ein Mal getanzt wurde!/);
  assert.match(nineteenth, /<h2>流传意译<\/h2>/);
  assert.match(nineteenth, /每一个不曾起舞的日子都是对生命的辜负。/);
  assert.match(
    nineteenth,
    /<figcaption lang="de">Friedrich Nietzsche, <cite>Also sprach Zarathustra<\/cite>, Dritter Teil, „<a [^>]+>Von alten und neuen Tafeln<\/a>“, § 23<\/figcaption>/
  );
  assert.match(
    nineteenth,
    /<cite>弗里德里希·尼采《查拉图斯特拉如是说》，第三部〈论旧榜与新榜〉第 23 节<\/cite>/
  );
  assert.match(styles, /\.vp-doc \.excerpt-entry__heading\s*\{[\s\S]*?clip-path: inset\(50%\)/);
  assert.match(styles, /\.excerpt-renderings\s*\{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});

test("preserves the Tim Cook report and formats its source as an excerpt attribution", () => {
  assert.match(twentieth, /<blockquote class="excerpt-quotation" lang="en">/);
  const paragraphs = [...twentieth.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((match) => match[1]);
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
    /<footer>Bryan Chaffin, <cite><a href="https:\/\/www\.macobserver\.com\/news\/tim-cook-rejects-ncppr-politics\/">“Tim Cook Soundly Rejects Politics of the NCPPR, Suggests Group Sell Apple's Stock”<\/a><\/cite>, <cite>The Mac Observer<\/cite>, February 28, 2014\./
  );
  assert.match(twentieth, /<span lang="zh-CN">报道背景：Apple Inc\. 2014 年度股东大会问答环节。/);
  assert.match(twentieth, /ROI 并非所有决策的首要标准。<\/span><\/footer>/);
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
    /\.vp-doc \.excerpt-entry > \.excerpt-quotation p\s*\{[^}]*margin:\s*18px 0;[^}]*font-size:\s*17px;[^}]*line-height:\s*1\.82;[^}]*\}/
  );
  assert.match(
    styles,
    /\.vp-doc \.excerpt-entry > \.excerpt-quotation footer\s*\{[^}]*text-align:\s*right;[^}]*\}/
  );
  assert.match(
    styles,
    /@media \(max-width: 767px\)[\s\S]*?\.vp-doc \.excerpt-entry > \.excerpt-quotation p\s*\{[^}]*font-size:\s*16px;[^}]*\}/
  );
});

test("renders a single translation across the full excerpt width", () => {
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
    /\.excerpt-renderings--single\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);[^}]*\}/
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
