import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  SHARE_IMAGE_FORMATS,
  createShareImageFilename,
  getShareImageFormat,
  normalizeShareText
} from "../docs/.vitepress/theme/shareImageRuntime.mjs";

const layout = readFileSync("docs/.vitepress/theme/Layout.vue", "utf8");
const component = readFileSync("docs/.vitepress/theme/ShareImage.vue", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

test("normalizes selected article text without leaking layout whitespace", () => {
  assert.equal(normalizeShareText("  一段\n\n  选中的\t文字  "), "一段 选中的 文字");
  assert.equal(normalizeShareText("这是一个需要截断的长句，后面还有内容", 10), "这是一个需要截断的…");
});

test("uses stable social image dimensions and safe filenames", () => {
  assert.deepEqual(
    Object.fromEntries(
      Object.values(SHARE_IMAGE_FORMATS).map((format) => [
        format.id,
        [format.width * format.scale, format.height * format.scale]
      ])
    ),
    {
      portrait: [1080, 1350],
      square: [1080, 1080],
      wide: [1200, 630]
    }
  );
  assert.equal(getShareImageFormat("missing"), SHARE_IMAGE_FORMATS.portrait);
  assert.equal(
    createShareImageFilename('直到大厦崩塌：关于“赢”的谎言', "portrait"),
    "直到大厦崩塌-关于“赢”的谎言-portrait.png"
  );
});

test("mounts the local-only share image studio on article and excerpt pages", () => {
  assert.match(layout, /import ShareImage from "\.\/ShareImage\.vue"/);
  assert.match(layout, /pageKind\.value === "article" \|\| pageKind\.value === "excerpt"/);
  assert.match(layout, /!relativePath\.endsWith\("index\.md"\)/);
  assert.match(layout, /#doc-footer-before/);
  assert.match(layout, /<ShareImage/);
  assert.match(component, /await import\("modern-screenshot"\)/);
  assert.match(component, /document\.fonts\?\.ready/);
  assert.match(component, /width:\s*format\.width/);
  assert.match(component, /height:\s*format\.height/);
  assert.match(component, /scale:\s*format\.scale/);
  assert.match(component, /font:\s*false/);
  assert.match(component, /new ClipboardItem/);
  assert.match(component, /URL\.createObjectURL/);
  assert.match(component, /backgroundElement\.inert = true/);
  assert.match(component, /window\.addEventListener\("keydown", handleDialogKeydown\)/);
  assert.match(component, /window\.removeEventListener\("keydown", handleDialogKeydown\)/);
  assert.match(component, /share-image-dialog-open \.target-cursor/);
  assert.match(component, /role="dialog"/);
  assert.match(component, /aria-modal="true"/);
  assert.match(component, /@pointerdown="rememberSelection"/);
  assert.match(component, /link\[rel="canonical"\]/);
  assert.doesNotMatch(component, /share-image-card__grid/);
  assert.doesNotMatch(component, /background-size:\s*(?:20px 20px|28px 28px)/);
  assert.equal(packageJson.dependencies["modern-screenshot"], "^4.7.0");
});
