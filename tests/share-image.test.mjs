import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  SHARE_IMAGE_FORMAT,
  createShareImageFilename,
  normalizeShareText
} from "../docs/.vitepress/theme/shareImageRuntime.mjs";

const layout = readFileSync("docs/.vitepress/theme/Layout.vue", "utf8");
const component = readFileSync("docs/.vitepress/theme/ShareImage.vue", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

test("normalizes article text without leaking layout whitespace", () => {
  assert.equal(normalizeShareText("  一段\n\n  自动提取的\t文字  "), "一段 自动提取的 文字");
  assert.equal(normalizeShareText("这是一个需要截断的长句，后面还有内容", 10), "这是一个需要截断的…");
});

test("uses one fixed 3:4 share image format and a stable filename", () => {
  assert.equal(Object.isFrozen(SHARE_IMAGE_FORMAT), true);
  assert.deepEqual(SHARE_IMAGE_FORMAT, {
    id: "portrait-3x4",
    label: "竖版 3:4",
    width: 540,
    height: 720,
    scale: 2,
    maxTitleLength: 56,
    maxExcerptLength: 160
  });
  assert.deepEqual(
    [SHARE_IMAGE_FORMAT.width * SHARE_IMAGE_FORMAT.scale, SHARE_IMAGE_FORMAT.height * SHARE_IMAGE_FORMAT.scale],
    [1080, 1440]
  );
  assert.equal(
    createShareImageFilename('直到大厦崩塌：关于“赢”的谎言'),
    "直到大厦崩塌-关于“赢”的谎言-3x4.png"
  );
});

test("mounts a direct, non-customizable share image download on article and excerpt pages", () => {
  assert.match(layout, /import ShareImage from "\.\/ShareImage\.vue"/);
  assert.match(layout, /pageKind\.value === "article" \|\| pageKind\.value === "excerpt"/);
  assert.match(layout, /!relativePath\.endsWith\("index\.md"\)/);
  assert.match(layout, /#doc-footer-before/);
  assert.match(layout, /<ShareImage/);

  assert.match(component, /@click="downloadImage"/);
  assert.match(component, /:disabled="rendering"/);
  assert.match(component, /:aria-busy="rendering"/);
  assert.match(component, /shareExcerpt\.value = resolveExcerpt\(\)/);
  assert.match(component, /frontmatter\.value\.description/);
  assert.match(component, /\.vp-doc > p:not\(\.lead\)/);
  assert.match(component, /await import\("modern-screenshot"\)/);
  assert.match(component, /await import\("qrcode"\)/);
  assert.match(component, /toDataURL\(pageHref\.value/);
  assert.match(component, /errorCorrectionLevel:\s*"M"/);
  assert.match(component, /margin:\s*4/);
  assert.match(component, /document\.fonts\?\.ready/);
  assert.match(component, /width:\s*SHARE_IMAGE_FORMAT\.width/);
  assert.match(component, /height:\s*SHARE_IMAGE_FORMAT\.height/);
  assert.match(component, /scale:\s*SHARE_IMAGE_FORMAT\.scale/);
  assert.match(component, /backgroundColor:\s*"#f5f1e8"/);
  assert.match(component, /font:\s*false/);
  assert.match(component, /URL\.createObjectURL/);
  assert.match(component, /link\[rel="canonical"\]/);
  assert.match(component, /class="share-image-card__qr"/);
  assert.match(component, /ref="qrImage"/);
  assert.match(component, /扫码阅读/);
  assert.match(component, /class="share-image-render-host" aria-hidden="true" inert/);
  assert.match(component, /生成分享图/);

  assert.doesNotMatch(component, /role="dialog"|aria-modal="true"|share-image-backdrop/);
  assert.doesNotMatch(component, /固定生成 3:4 竖幅 PNG|SHARE \/ 分享/);
  assert.doesNotMatch(component, /share-image-entry__copy|share-image-entry__eyebrow/);
  assert.doesNotMatch(component, /<input|<textarea|<fieldset|v-model/);
  assert.doesNotMatch(component, /ClipboardItem|selectedArticleText|rememberSelection/);
  assert.doesNotMatch(component, /cardTheme|data-theme|SHARE_IMAGE_FORMATS/);
  assert.equal(packageJson.dependencies["modern-screenshot"], "^4.7.0");
  assert.equal(packageJson.dependencies.qrcode, "^1.5.4");
});
