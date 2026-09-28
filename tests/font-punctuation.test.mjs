import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync("docs/.vitepress/theme/styles/fonts.css", "utf8");
const tokens = readFileSync("docs/.vitepress/theme/styles/tokens.css", "utf8");
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

test("routes typographic quotation marks through the proportional punctuation face", () => {
  const hanFaces = [...css.matchAll(/@font-face \{[^}]+font-family: "(Site Han (?:Sans|Serif))";[^}]+unicode-range: ([^;]+);[^}]+\}/g)];
  const punctuationFaces = [...css.matchAll(/@font-face \{[^}]+font-family: "Site Proportional Punctuation";[^}]+unicode-range: ([^;]+);[^}]+\}/g)];

  assert.ok(hanFaces.length > 0, "expected generated Site Han font faces");
  assert.equal(punctuationFaces.length, 2, "expected normal and italic punctuation faces");

  for (const [, family, ranges] of hanFaces) {
    for (const codepoint of quoteCodepoints) {
      assert.equal(
        rangeContains(ranges, codepoint),
        false,
        `${family} must not claim U+${codepoint.toString(16).toUpperCase()}`
      );
    }
  }

  for (const [, ranges] of punctuationFaces) {
    for (const codepoint of quoteCodepoints) {
      assert.equal(
        rangeContains(ranges, codepoint),
        true,
        `punctuation face must claim U+${codepoint.toString(16).toUpperCase()}`
      );
    }
  }

  assert.match(
    tokens,
    /--site-font-sans:\s*"Site Proportional Punctuation",\s*"Site Han Sans",\s*sans-serif;/
  );
  assert.match(
    tokens,
    /--site-font-reading:\s*"Site Proportional Punctuation",\s*"Newsreader",\s*"Site Han Serif",\s*serif;/
  );
});
