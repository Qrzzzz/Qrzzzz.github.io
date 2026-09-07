import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const custom = readFileSync("docs/.vitepress/theme/custom.css", "utf8");
const emphasis = readFileSync("docs/.vitepress/theme/styles/emphasis.css", "utf8");

function ruleBody(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return emphasis.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? "";
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
  assert.match(emphasis, /--site-marker-edge:\s*rgba\(/);
  assert.match(emphasis, /\.dark\s*\{[\s\S]*--site-marker-fill:[\s\S]*--site-marker-edge:/);
  assert.doesNotMatch(
    emphasis.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? "",
    /--site-accent/
  );
});

test("paints markdown emphasis without changing semantic strong layout", () => {
  const strong = ruleBody(".vp-doc strong");
  const marker = ruleBody(".vp-doc .text-emphasis");

  assert.match(strong, /background:\s*none/);
  assert.match(strong, /color:\s*var\(--site-text\)/);
  assert.match(strong, /font-weight:\s*750/);

  assert.match(marker, /display:\s*inline/);
  assert.match(marker, /margin-inline:\s*-0\.03em/);
  assert.match(marker, /padding-inline:\s*0\.06em/);
  assert.match(marker, /var\(--site-marker-fill\)/);
  assert.match(marker, /var\(--site-marker-edge\)/);
  assert.match(marker, /box-decoration-break:\s*clone/);
  assert.match(marker, /-webkit-box-decoration-break:\s*clone/);
});

test("falls back cleanly in forced-colors mode", () => {
  const forcedColors = emphasis.match(
    /@media\s*\(forced-colors:\s*active\)\s*\{([\s\S]*)\}\s*$/
  )?.[1] ?? "";

  assert.match(forcedColors, /color:\s*CanvasText/);
  assert.match(forcedColors, /background:\s*none/);
});
