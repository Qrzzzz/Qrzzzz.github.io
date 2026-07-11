import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sparkSource = readFileSync(
  path.join(repositoryRoot, "docs/.vitepress/theme/ClickSpark.vue"),
  "utf8"
);
const layoutSource = readFileSync(
  path.join(repositoryRoot, "docs/.vitepress/theme/Layout.vue"),
  "utf8"
);

test("mounts a bounded, accessible click spark effect", () => {
  assert.match(layoutSource, /<ClickSpark\s*\/>/);
  assert.match(sparkSource, /const sparkCount = 14/);
  assert.match(sparkSource, /const duration = 520/);
  assert.match(sparkSource, /sparks\.length > 84/);
  assert.match(sparkSource, /pointer-events: none|class="click-spark-canvas"/);
  assert.match(sparkSource, /aria-hidden="true"/);
});

test("disables click sparks for reduced motion and coarse pointers", () => {
  assert.match(sparkSource, /prefers-reduced-motion: reduce/);
  assert.match(sparkSource, /\(hover: hover\) and \(pointer: fine\)/);
  assert.match(sparkSource, /motionQuery\?\.matches/);
  assert.match(sparkSource, /!finePointerQuery\?\.matches/);
  assert.match(sparkSource, /removeEventListener\("pointerdown", handlePointerDown\)/);
});
