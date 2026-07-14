import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  canAnimateThemeTransition,
  getThemeRevealGeometry,
  runThemeTransition
} from "../docs/.vitepress/theme/themeTransitionRuntime.mjs";

test("centers the theme reveal on the toggle and covers the viewport", () => {
  const geometry = getThemeRevealGeometry(
    { left: 80, top: 20, width: 20, height: 40 },
    { width: 200, height: 100 }
  );

  assert.equal(geometry.x, 90);
  assert.equal(geometry.y, 40);
  assert.equal(geometry.radius, Math.hypot(110, 60));
});

test("uses the pointer as the reveal origin when one is available", () => {
  const geometry = getThemeRevealGeometry(
    { left: 80, top: 20, width: 20, height: 40 },
    { width: 200, height: 100 },
    { x: 150, y: 25 }
  );

  assert.equal(geometry.x, 150);
  assert.equal(geometry.y, 25);
  assert.equal(geometry.radius, Math.hypot(150, 75));
});

test("falls back to an immediate theme update when motion is reduced", async () => {
  let updates = 0;
  const documentObject = {
    startViewTransition() {},
    documentElement: { animate() {} }
  };
  const windowObject = {
    matchMedia: () => ({ matches: true })
  };

  assert.equal(canAnimateThemeTransition(documentObject, windowObject, {}), false);
  assert.equal(
    await runThemeTransition({
      documentObject,
      windowObject,
      origin: {},
      update: () => {
        updates += 1;
      }
    }),
    false
  );
  assert.equal(updates, 1);
});

test("runs dark and light circular transitions in opposite directions", async () => {
  let updates = 0;
  const animations = [];
  const documentObject = {
    startViewTransition(callback) {
      return { ready: Promise.resolve(callback()) };
    },
    documentElement: {
      animate(frames, options) {
        animations.push({ frames, options });
      }
    }
  };
  const windowObject = {
    innerWidth: 300,
    innerHeight: 180,
    matchMedia: () => ({ matches: false })
  };
  const origin = {
    getBoundingClientRect: () => ({ left: 250, top: 18, width: 42, height: 42 })
  };

  for (const targetIsDark of [true, false]) {
    assert.equal(
      await runThemeTransition({
        documentObject,
        windowObject,
        origin,
        point: { x: 270, y: 39 },
        targetIsDark,
        update: () => {
          updates += 1;
        }
      }),
      true
    );
  }

  assert.equal(updates, 2);
  assert.equal(animations[0].options.pseudoElement, "::view-transition-old(root)");
  assert.equal(animations[0].options.duration, 300);
  assert.equal(animations[0].options.easing, "ease-in");
  assert.match(animations[0].frames.clipPath[0], /^circle\([^0]/);
  assert.match(animations[0].frames.clipPath[1], /^circle\(0px/);
  assert.equal(animations[1].options.pseudoElement, "::view-transition-new(root)");
  assert.match(animations[1].frames.clipPath[0], /^circle\(0px/);
  assert.match(animations[1].frames.clipPath[1], /^circle\([^0]/);
});

test("mounts direct animated theme and GitHub actions in the top bar", () => {
  const layout = readFileSync("docs/.vitepress/theme/Layout.vue", "utf8");
  const component = readFileSync("docs/.vitepress/theme/NavActions.vue", "utf8");
  const search = readFileSync("docs/.vitepress/theme/InlineSearch.vue", "utf8");
  const siteStyles = readFileSync("docs/.vitepress/theme/styles/site.css", "utf8");

  assert.match(layout, /#nav-bar-content-after/);
  assert.match(layout, /<NavActions\s*\/>/);
  assert.match(component, /@click="toggleTheme"/);
  assert.match(component, /targetIsDark/);
  assert.match(component, /event\.detail > 0/);
  assert.match(component, /role="switch"/);
  assert.match(component, /:aria-checked="isDark"/);
  assert.match(component, /https:\/\/github\.com\/Qrzzzz/);
  assert.doesNotMatch(component, /<span>GitHub<\/span>/);
  assert.match(component, /theme-toggle__track/);
  assert.match(component, /theme-toggle__thumb/);
  assert.match(component, /theme-toggle__sun/);
  assert.match(component, /theme-toggle__moon/);
  assert.doesNotMatch(component, /<select|<details/);
  assert.match(siteStyles, /\.VPNavBarTitle \.title\s*\{[^}]*height:\s*44px[^}]*font-size:\s*22px/s);
  assert.match(siteStyles, /\.VPNavBarMenu\s*\{[^}]*border:\s*0[^}]*background:\s*transparent/s);
  assert.match(siteStyles, /\.VPNavBar \.VPNavBarMenuLink::after\s*\{[^}]*transform:\s*scaleX\(0\)/s);
  assert.match(component, /\.theme-toggle,\s*\.nav-github\s*\{[^}]*border:\s*0[^}]*background:\s*transparent/s);
  assert.match(component, /\.theme-toggle\s*\{[^}]*width:\s*44px[^}]*border-radius:\s*999px/s);
  assert.match(component, /\.theme-toggle__track\s*\{[^}]*width:\s*40px[^}]*height:\s*22px/s);
  assert.match(component, /\.theme-toggle__thumb\s*\{[^}]*width:\s*18px[^}]*height:\s*18px/s);
  assert.match(component, /\.theme-toggle\.is-dark \.theme-toggle__thumb\s*\{[^}]*translateX\(18px\)/s);
  assert.match(siteStyles, /\.dark::view-transition-new\(root\)[^{]*\{\s*z-index:\s*1/s);
  assert.match(siteStyles, /\.dark::view-transition-old\(root\)[^{]*\{\s*z-index:\s*9999/s);
  assert.match(search, /\.inline-search-trigger,\s*\.inline-search-form\s*\{[^}]*border:\s*0[^}]*background:\s*transparent/s);
});
