import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync("docs/.vitepress/theme/styles/fonts.css", "utf8");
const quoteCodepoints = [0x2018, 0x2019, 0x201c, 0x201d];

function rangeContains(rangeText, codepoint) {
  return rangeText.split(",").some((part) => {
    const match = part.trim().match(/^U\+([0-9A-F]+)(?:-([0-9A-F]+))?$/i);
    if (!match) return false;
    const start = Number.parseInt(match[1], 16);
    const end = Number.parseInt(match[2] ?? match[1], 16);
    return codepoint >= start && codepoint <= end;
  });
}

test("lets proportional fallback fonts render typographic quotation marks", () => {
  const faces = [...css.matchAll(/@font-face \{[^}]+font-family: "(Site Han (?:Sans|Serif))";[^}]+unicode-range: ([^;]+);[^}]+\}/g)];

  assert.ok(faces.length > 0, "expected generated Site Han font faces");

  for (const [, family, ranges] of faces) {
    for (const codepoint of quoteCodepoints) {
      assert.equal(
        rangeContains(ranges, codepoint),
        false,
        `${family} must not claim U+${codepoint.toString(16).toUpperCase()}`
      );
    }
  }
});
