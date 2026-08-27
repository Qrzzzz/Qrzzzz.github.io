import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("renders the homepage name as accessible single-line particle text", () => {
  const home = readFileSync("docs/.vitepress/theme/HomeContent.vue", "utf8");
  const particleText = readFileSync("docs/.vitepress/theme/ParticleText.vue", "utf8");
  const siteStyles = readFileSync("docs/.vitepress/theme/styles/site.css", "utf8");

  assert.match(home, /import ParticleText from "\.\/ParticleText\.vue"/);
  assert.match(home, /aria-label="Cherry Chu"/);
  assert.match(home, /<ParticleText text="Cherry Chu"\s*\/>/);
  assert.doesNotMatch(home, /Projects I build, documentation I maintain/);
  assert.doesNotMatch(home, /home-intro-copy|home-deck/);
  assert.match(home, /<\/h1>\s*<nav class="home-actions"/s);
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
  assert.match(siteStyles, /\.home-intro\s*\{[^}]*display:\s*flex[^}]*flex:\s*1[^}]*align-items:\s*flex-start[^}]*justify-content:\s*center/s);
  assert.doesNotMatch(siteStyles, /\.home-byline(?:\s|[>{.:#])/);
  assert.match(siteStyles, /\.home-page\s*\{[^}]*width:\s*min\(100%, var\(--site-max\)\)/s);
  assert.match(siteStyles, /\.home-title\s*\{[^}]*width:\s*100%[^}]*height:\s*clamp\(160px, 15vw, 250px\)[^}]*font-size:\s*clamp\(104px, 11vw, 180px\)/s);
  assert.match(siteStyles, /\.home-actions\s*\{[^}]*align-items:\s*center[^}]*margin-top:\s*clamp\(14px, 2\.4vh, 22px\)[^}]*margin-left:\s*clamp\(6px, 0\.8vw, 14px\)/s);
  assert.doesNotMatch(siteStyles, /\.home-intro-copy(?:\s|[>{.:#])|\.home-deck(?:\s|[>{.:#])/);
  assert.doesNotMatch(siteStyles, /\.home-author(?:\s|[>{.:#])/);
});
