import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  canAnimateThemeTransition,
  runThemeTransition
} from "../docs/.vitepress/theme/themeTransitionRuntime.mjs";

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

test("cross-fades the old and new theme snapshots", async () => {
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
  assert.equal(
    await runThemeTransition({
      documentObject,
      windowObject,
      origin: {},
      update: () => {
        updates += 1;
      }
    }),
    true
  );

  assert.equal(updates, 1);
  assert.equal(animations.length, 2);
  assert.equal(animations[0].options.pseudoElement, "::view-transition-old(root)");
  assert.equal(animations[0].options.duration, 320);
  assert.deepEqual(animations[0].frames.opacity, [1, 0]);
  assert.equal(animations[1].options.pseudoElement, "::view-transition-new(root)");
  assert.deepEqual(animations[1].frames.opacity, [0, 1]);
});

test("uses CSS fade classes when view transitions are unavailable", async () => {
  let updates = 0;
  const classNames = new Set();
  const classChanges = [];
  const delays = [];
  const documentObject = {
    documentElement: {
      classList: {
        add(name) {
          classNames.add(name);
          classChanges.push(`add:${name}`);
        },
        remove(name) {
          classNames.delete(name);
          classChanges.push(`remove:${name}`);
        }
      }
    }
  };
  const windowObject = {
    matchMedia: () => ({ matches: false }),
    setTimeout(callback, delay) {
      delays.push(delay);
      callback();
      return delays.length;
    }
  };

  assert.equal(canAnimateThemeTransition(documentObject, windowObject, {}), true);
  assert.equal(
    await runThemeTransition({
      documentObject,
      windowObject,
      origin: {},
      update: () => {
        updates += 1;
      }
    }),
    true
  );

  assert.equal(updates, 1);
  assert.deepEqual(delays, [144, 176]);
  assert.deepEqual(classChanges, [
    "add:theme-fade-out",
    "remove:theme-fade-out",
    "add:theme-fade-in",
    "remove:theme-fade-in"
  ]);
  assert.equal(classNames.size, 0);
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
  assert.match(component, /transform 420ms cubic-bezier\(0\.34, 1\.56, 0\.64, 1\)/);
  assert.match(component, /@keyframes theme-toggle-spring/);
  assert.match(component, /\.theme-toggle\.is-dark \.theme-toggle__thumb\s*\{[^}]*translateX\(18px\)/s);
  assert.match(siteStyles, /::view-transition-new\(root\)\s*\{\s*z-index:\s*2/s);
  assert.match(siteStyles, /html\.theme-fade-out body\s*\{[^}]*theme-page-fade-out 144ms/s);
  assert.match(siteStyles, /html\.theme-fade-in body\s*\{[^}]*theme-page-fade-in 176ms/s);
  assert.match(search, /\.inline-search-trigger,\s*\.inline-search-form\s*\{[^}]*border:\s*0[^}]*background:\s*transparent/s);
});
