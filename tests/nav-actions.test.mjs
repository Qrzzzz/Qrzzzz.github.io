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

test("fades the old snapshot over a fully visible new theme", async () => {
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
  assert.equal(animations.length, 1);
  assert.equal(animations[0].options.pseudoElement, "::view-transition-old(root)");
  assert.equal(animations[0].options.duration, 260);
  assert.deepEqual(animations[0].frames.opacity, [1, 0]);
});

test("updates colors without blanking the page when view transitions are unavailable", async () => {
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
  assert.deepEqual(delays, [260]);
  assert.deepEqual(classChanges, [
    "add:theme-is-switching",
    "remove:theme-is-switching"
  ]);
  assert.equal(classNames.size, 0);
});

test("keeps accessible theme, search and external profile actions", () => {
  const layout = readFileSync("docs/.vitepress/theme/Layout.vue", "utf8");
  const component = readFileSync("docs/.vitepress/theme/NavActions.vue", "utf8");
  assert.match(layout, /<NavActions\s*\/>/);
  assert.match(layout, /<InlineSearch\s*\/>/);
  assert.match(component, /role="switch"/);
  assert.match(component, /:aria-checked="isDark"/);
  assert.match(component, /https:\/\/github\.com\/Qrzzzz/);
});
