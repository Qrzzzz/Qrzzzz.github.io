import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const custom = readFileSync("docs/.vitepress/theme/custom.css", "utf8");
const emphasis = readFileSync("docs/.vitepress/theme/styles/emphasis.css", "utf8");
const excerpt = readFileSync("docs/excerpts/2026-09-04-01.md", "utf8");

function ruleBody(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return emphasis.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? "";
}

function markerRuleBody() {
  return emphasis.match(
    /\.vp-doc \.text-emphasis,\s*\.vp-doc \.excerpt-entry strong\s*\{([\s\S]*?)\}/
  )?.[1] ?? "";
}

test("loads the marker treatment after the core content styles", () => {
  const imports = [...custom.matchAll(/@import\s+"([^"]+)";/g)].map((match) => match[1]);
  const contentIndex = imports.indexOf("./styles/content.css");
  const emphasisIndex = imports.indexOf("./styles/emphasis.css");

  assert.ok(contentIndex >= 0, "content stylesheet import is missing");
  assert.ok(emphasisIndex > contentIndex, "marker stylesheet must override content.css");
});

test("keeps marker color independent from the active theme accent", () => {
  assert.match(emphasis, /--site-marker-fill:\s*rgba\(/);
  assert.match(emphasis, /\.dark\s*\{[\s\S]*--site-marker-fill:/);
  assert.doesNotMatch(
    emphasis.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? "",
    /--site-accent/
  );
});

test("paints markdown and excerpt emphasis while retaining inline geometry", () => {
  const strong = ruleBody(".vp-doc strong");
  const marker = markerRuleBody();

  assert.match(strong, /background:\s*none/);
  assert.match(strong, /color:\s*var\(--site-text\)/);
  assert.match(strong, /font-weight:\s*750/);

  assert.ok(marker, "shared marker rule is missing");
  assert.match(marker, /display:\s*inline/);
  assert.match(marker, /padding-inline:\s*0\.16em/);
  assert.doesNotMatch(marker, /margin-inline/);
  assert.match(marker, /var\(--site-marker-fill\)/);
  assert.match(marker, /box-decoration-break:\s*clone/);
  assert.match(marker, /-webkit-box-decoration-break:\s*clone/);
});

test("opts hand-authored excerpt strong into the marker without widening global strong", () => {
  assert.match(
    excerpt,
    /<article class="excerpt-entry"[\s\S]*<strong>“When we work on making our devices accessible by the blind,” he said, “I don't consider the bloody ROI\.”<\/strong>/
  );
  assert.match(
    emphasis,
    /\.vp-doc \.text-emphasis,\s*\.vp-doc \.excerpt-entry strong\s*\{/
  );
  assert.doesNotMatch(
    ruleBody(".vp-doc strong"),
    /site-marker-(?:fill|edge)/
  );
});

test("falls back cleanly in forced-colors mode", () => {
  const forcedColors = emphasis.match(
    /@media\s*\(forced-colors:\s*active\)\s*\{([\s\S]*)\}\s*$/
  )?.[1] ?? "";

  assert.match(forcedColors, /color:\s*CanvasText/);
  assert.match(forcedColors, /\.vp-doc \.excerpt-entry strong/);
  assert.match(forcedColors, /background:\s*none/);
});
