import assert from "node:assert/strict";
import test from "node:test";
import {
  isSearchShortcut,
  moveSearchSelection,
  resolveSearchTargetIndex
} from "../docs/.vitepress/theme/inlineSearchRuntime.mjs";

test("recognizes search shortcuts without hijacking typed slashes", () => {
  assert.equal(isSearchShortcut({ key: "k", ctrlKey: true }), true);
  assert.equal(isSearchShortcut({ key: "K", metaKey: true }), true);
  assert.equal(isSearchShortcut({ key: "/" }, false), true);
  assert.equal(isSearchShortcut({ key: "/" }, true), false);
});

test("cycles inline search selection and defaults Enter to the first result", () => {
  assert.equal(moveSearchSelection(-1, 3, 1), 0);
  assert.equal(moveSearchSelection(2, 3, 1), 0);
  assert.equal(moveSearchSelection(0, 3, -1), 2);
  assert.equal(moveSearchSelection(0, 0, 1), -1);
  assert.equal(resolveSearchTargetIndex(-1, 3), 0);
  assert.equal(resolveSearchTargetIndex(2, 3), 2);
  assert.equal(resolveSearchTargetIndex(0, 0), -1);
});
