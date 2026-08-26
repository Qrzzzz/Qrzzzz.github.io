import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("renders the homepage name as accessible multiline particle text", () => {
  const home = readFileSync("docs/.vitepress/theme/HomeContent.vue", "utf8");
  const particleText = readFileSync("docs/.vitepress/theme/ParticleText.vue", "utf8");
  const siteStyles = readFileSync("docs/.vitepress/theme/styles/site.css", "utf8");

  assert.match(home, /import ParticleText from "\.\/ParticleText\.vue"/);
  assert.match(home, /aria-label="Cherry Chu"/);
  assert.match(home, /<ParticleText text="Cherry&#10;Chu"\s*\/>/);
  assert.doesNotMatch(home, /TextType|I make tools/);
  assert.doesNotMatch(home, /home-byline|Works &amp; writing/);
  assert.doesNotMatch(home, /home-author|About the author|About this site|Find me on GitHub/);
  assert.match(particleText, /props\.text\.split\("\\n"\)/);
  assert.match(particleText, /prefers-reduced-motion: reduce/);
  assert.match(particleText, /reducedMotion = event\.matches/);
  assert.match(particleText, /IntersectionObserver/);
  assert.match(particleText, /visibilitychange/);
  assert.match(particleText, /pointerRepel/);
  assert.match(particleText, /pointerRepel:\s*58/);
  assert.match(particleText, /repelRadius:\s*132/);
  assert.match(particleText, /element\.addEventListener\("pointermove", handlePointerMove\)/);
  assert.match(particleText, /class="particle-text__fallback" aria-hidden="true"/);
  assert.match(siteStyles, /\.home-intro\s*\{[^}]*flex:\s*1[^}]*align-content:\s*center/s);
  assert.doesNotMatch(siteStyles, /\.home-byline(?:\s|[>{.:#])/);
  assert.match(siteStyles, /\.home-page\s*\{[^}]*width:\s*min\(100%, 1564px\)/s);
  assert.match(siteStyles, /\.home-title\s*\{[^}]*grid-column:\s*1 \/ 8[^}]*height:\s*clamp\(320px, 27vw, 440px\)[^}]*font-size:\s*clamp\(120px, 14\.5vw, 220px\)/s);
  assert.doesNotMatch(siteStyles, /\.home-author(?:\s|[>{.:#])/);
});
