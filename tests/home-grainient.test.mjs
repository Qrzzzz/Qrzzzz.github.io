import assert from "node:assert/strict";
import test from "node:test";

import {
  HOME_GRAINIENT_REDUCED_MOTION_QUERY,
  HOME_GRAINIENT_RENDER_QUERY,
  createHomeGrainientRuntime
} from "../docs/.vitepress/theme/homeGrainientRuntime.mjs";

class FakeEventTarget {
  listeners = new Map();

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type, event = {}) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

function createHarness({ reducedMotion = false, render = true, failScene = false } = {}) {
  const container = { dataset: {} };
  const document = new FakeEventTarget();
  document.hidden = false;
  const window = new FakeEventTarget();
  const queries = new Map([
    [
      HOME_GRAINIENT_REDUCED_MOTION_QUERY,
      Object.assign(new FakeEventTarget(), { matches: reducedMotion })
    ],
    [HOME_GRAINIENT_RENDER_QUERY, Object.assign(new FakeEventTarget(), { matches: render })]
  ]);
  window.matchMedia = (query) => queries.get(query);

  let nextFrame = 1;
  const frames = new Map();
  window.requestAnimationFrame = (callback) => {
    const id = nextFrame++;
    frames.set(id, callback);
    return id;
  };
  window.cancelAnimationFrame = (id) => frames.delete(id);

  const intersections = [];
  window.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback;
      intersections.push(this);
    }
    observe() {}
    disconnect() {}
  };
  const resizes = [];
  window.ResizeObserver = class {
    constructor(callback) {
      this.callback = callback;
      resizes.push(this);
    }
    observe() {}
    disconnect() {}
  };

  const scenes = [];
  const createScene = () => {
    if (failScene) throw new Error("WebGL unavailable");
    const scene = {
      palettes: [],
      renders: [],
      resizeCount: 0,
      destroyed: false,
      setPalette(colors) {
        this.palettes.push(colors);
      },
      resize() {
        this.resizeCount += 1;
      },
      render(timestamp) {
        this.renders.push(timestamp);
      },
      destroy() {
        this.destroyed = true;
      }
    };
    scenes.push(scene);
    return scene;
  };

  const runtime = createHomeGrainientRuntime({
    container,
    window,
    document,
    createScene,
    palette: ["#111111", "#222222", "#333333"]
  });

  return {
    container,
    document,
    frames,
    intersections,
    queries,
    resizes,
    runtime,
    scenes,
    runFrame(timestamp = 16) {
      const entry = frames.entries().next().value;
      assert.ok(entry, "an animation frame should be scheduled");
      frames.delete(entry[0]);
      entry[1](timestamp);
    }
  };
}

test("runtime animates only while visible and the page is active", () => {
  const harness = createHarness();
  harness.runtime.mount();

  assert.equal(harness.container.dataset.grainientMode, "webgl");
  assert.equal(harness.scenes.length, 1);
  assert.equal(harness.scenes[0].resizeCount, 1);
  assert.equal(harness.frames.size, 1);

  harness.runFrame(32);
  assert.deepEqual(harness.scenes[0].renders, [32]);
  assert.equal(harness.frames.size, 1);

  harness.intersections[0].callback([{ isIntersecting: false }]);
  assert.equal(harness.frames.size, 0);
  harness.intersections[0].callback([{ isIntersecting: true }]);
  assert.equal(harness.frames.size, 1);

  harness.document.hidden = true;
  harness.document.dispatch("visibilitychange");
  assert.equal(harness.frames.size, 0);
  harness.document.hidden = false;
  harness.document.dispatch("visibilitychange");
  assert.equal(harness.frames.size, 1);

  harness.runtime.destroy();
  assert.equal(harness.frames.size, 0);
  assert.equal(harness.scenes[0].destroyed, true);
});

test("reduced motion and unsupported widths use the static fallback", () => {
  const harness = createHarness({ reducedMotion: true });
  harness.runtime.mount();
  assert.equal(harness.runtime.getState().hasScene, false);
  assert.equal(harness.container.dataset.grainientMode, "fallback");

  const reducedMotion = harness.queries.get(HOME_GRAINIENT_REDUCED_MOTION_QUERY);
  reducedMotion.matches = false;
  reducedMotion.dispatch("change");
  assert.equal(harness.runtime.getState().hasScene, true);

  const render = harness.queries.get(HOME_GRAINIENT_RENDER_QUERY);
  render.matches = false;
  render.dispatch("change");
  assert.equal(harness.runtime.getState().hasScene, false);
  assert.equal(harness.scenes[0].destroyed, true);
  assert.equal(harness.container.dataset.grainientMode, "fallback");
});

test("palette and resize updates reach the active scene", () => {
  const harness = createHarness();
  harness.runtime.mount();
  const nextPalette = ["#abcdef", "#123456", "#fedcba"];
  harness.runtime.setPalette(nextPalette);
  harness.resizes[0].callback();

  assert.deepEqual(harness.scenes[0].palettes.at(-1), nextPalette);
  assert.equal(harness.scenes[0].resizeCount, 2);
});

test("WebGL failures remain a non-animated fallback", () => {
  const harness = createHarness({ failScene: true });
  assert.doesNotThrow(() => harness.runtime.mount());
  assert.equal(harness.runtime.getState().hasScene, false);
  assert.equal(harness.container.dataset.grainientMode, "fallback");
  assert.equal(harness.frames.size, 0);
});
