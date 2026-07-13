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

test("uses a circular root view transition when the browser supports it", async () => {
  let updates = 0;
  let animationOptions;
  const documentObject = {
    startViewTransition(callback) {
      return { ready: Promise.resolve(callback()) };
    },
    documentElement: {
      animate(_frames, options) {
        animationOptions = options;
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

  assert.equal(
    await runThemeTransition({
      documentObject,
      windowObject,
      origin,
      update: () => {
        updates += 1;
      }
    }),
    true
  );
  assert.equal(updates, 1);
  assert.equal(animationOptions.pseudoElement, "::view-transition-new(root)");
});

test("mounts direct animated theme and GitHub actions in the top bar", () => {
  const layout = readFileSync("docs/.vitepress/theme/Layout.vue", "utf8");
  const component = readFileSync("docs/.vitepress/theme/NavActions.vue", "utf8");
  const search = readFileSync("docs/.vitepress/theme/InlineSearch.vue", "utf8");
  const siteStyles = readFileSync("docs/.vitepress/theme/styles/site.css", "utf8");

  assert.match(layout, /#nav-bar-content-after/);
  assert.match(layout, /<NavActions\s*\/>/);
  assert.match(component, /@click="toggleTheme"/);
  assert.match(component, /aria-pressed/);
  assert.match(component, /https:\/\/github\.com\/Qrzzzz/);
  assert.match(component, /theme-toggle__sun/);
  assert.match(component, /theme-toggle__moon/);
  assert.doesNotMatch(component, /<select|<details/);
  assert.match(siteStyles, /\.VPNavBarTitle \.title\s*\{[^}]*height:\s*44px[^}]*font-size:\s*22px/s);
  assert.match(siteStyles, /\.VPNavBarMenu\s*\{[^}]*border:\s*0[^}]*background:\s*transparent/s);
  assert.match(siteStyles, /\.VPNavBar \.VPNavBarMenuLink::after\s*\{[^}]*transform:\s*scaleX\(0\)/s);
  assert.match(component, /\.theme-toggle,\s*\.nav-github\s*\{[^}]*border:\s*0[^}]*background:\s*transparent/s);
  assert.match(search, /\.inline-search-trigger,\s*\.inline-search-form\s*\{[^}]*border:\s*0[^}]*background:\s*transparent/s);
});
