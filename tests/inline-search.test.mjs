import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

test("mounts an accessible inline search instead of the VitePress modal trigger", () => {
  const layout = readFileSync("docs/.vitepress/theme/Layout.vue", "utf8");
  const component = readFileSync("docs/.vitepress/theme/InlineSearch.vue", "utf8");
  const siteStyles = readFileSync("docs/.vitepress/theme/styles/site.css", "utf8");

  assert.match(layout, /<InlineSearch\s*\/>/);
  assert.match(component, /role="combobox"/);
  assert.match(component, /aria-autocomplete="list"/);
  assert.match(component, /role="listbox"/);
  assert.match(component, /stopImmediatePropagation\(\)/);
  assert.match(siteStyles, /\.VPNavBarSearch\s*\{\s*display:\s*none;/s);
});

test("keeps the staggered menu restrained and theme-aware", () => {
  const component = readFileSync("docs/.vitepress/theme/StaggeredMenu.vue", "utf8");
  const tokens = readFileSync("docs/.vitepress/theme/styles/tokens.css", "utf8");

  assert.match(component, /startViewTransition/);
  assert.match(component, /var\(--site-menu-prelayer\)/);
  assert.match(component, /font-size:\s*clamp\(26px,\s*2\.5vw,\s*34px\)/);
  assert.match(tokens, /::view-transition-old\(root\)/);
  assert.match(tokens, /--site-menu-prelayer:/);
});
