import assert from "node:assert/strict";
import test from "node:test";

import {
  FINE_POINTER_QUERY,
  FREE_CORNER_OFFSETS,
  REDUCED_MOTION_QUERY,
  TARGET_CURSOR_SELECTOR,
  createTargetCursorRuntime,
  resolveCursorTarget,
  targetCornerOffsets
} from "../docs/.vitepress/theme/targetCursorRuntime.mjs";

class FakeClassList {
  values = new Set();

  add(...names) {
    names.forEach((name) => this.values.add(name));
  }

  remove(...names) {
    names.forEach((name) => this.values.delete(name));
  }

  toggle(name, force) {
    if (force) this.values.add(name);
    else this.values.delete(name);
  }

  contains(name) {
    return this.values.has(name);
  }
}

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

function createHarness() {
  const corners = Array.from({ length: 4 }, () => ({ style: {} }));
  const dot = { style: {} };
  const cursor = {
    style: {},
    classList: new FakeClassList(),
    querySelectorAll: () => corners,
    querySelector: () => dot
  };
  const rootClasses = new FakeClassList();
  const document = new FakeEventTarget();
  document.documentElement = { classList: rootClasses };
  document.elementFromPoint = () => document.hoveredElement;

  const window = new FakeEventTarget();
  window.innerWidth = 1200;
  window.innerHeight = 800;
  const queries = new Map([
    [FINE_POINTER_QUERY, Object.assign(new FakeEventTarget(), { matches: true })],
    [REDUCED_MOTION_QUERY, Object.assign(new FakeEventTarget(), { matches: false })]
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

  return {
    corners,
    cursor,
    document,
    queries,
    rootClasses,
    window,
    runFrame(time = 16) {
      const entry = frames.entries().next().value;
      assert.ok(entry, "an animation frame should be scheduled");
      frames.delete(entry[0]);
      entry[1](time);
    }
  };
}

test("interactive selector covers native, ARIA, editor, and explicit controls", () => {
  for (const contract of [
    "a[href]",
    "button",
    "input",
    "select",
    "textarea",
    "summary",
    "label[for]",
    "[contenteditable='true']",
    "[role='button']",
    "[role='option']",
    "[role='switch']",
    "[tabindex]:not([tabindex='-1'])",
    "[data-cursor-target]"
  ]) {
    assert.match(TARGET_CURSOR_SELECTOR, new RegExp(contract.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("target geometry frames the outside edge of a control", () => {
  assert.deepEqual(
    targetCornerOffsets({ left: 100, top: 50, right: 220, bottom: 90 }, 140, 70),
    [
      { x: -43, y: -23 },
      { x: 71, y: -23 },
      { x: 71, y: 11 },
      { x: -43, y: 11 }
    ]
  );
  assert.deepEqual(FREE_CORNER_OFFSETS.map(({ x, y }) => ({ x, y })), [
    { x: -18, y: -18 },
    { x: 6, y: -18 },
    { x: 6, y: 6 },
    { x: -18, y: 6 }
  ]);
});

test("target resolution selects the nearest matching ancestor and ignores the cursor itself", () => {
  const target = {
    nodeType: 1,
    parentElement: null,
    hasAttribute: () => false,
    matches: () => true
  };
  const child = {
    nodeType: 1,
    parentElement: target,
    hasAttribute: () => false,
    matches: () => false
  };
  const cursorChild = {
    nodeType: 1,
    parentElement: target,
    hasAttribute: (name) => name === "data-target-cursor",
    matches: () => false
  };

  assert.equal(resolveCursorTarget(child), target);
  assert.equal(resolveCursorTarget(cursorChild), null);
});

test("runtime enables only for fine pointers, targets controls, presses, and cleans up", () => {
  const harness = createHarness();
  const target = {
    nodeType: 1,
    parentElement: null,
    isConnected: true,
    hasAttribute: () => false,
    matches: () => true,
    getBoundingClientRect: () => ({ left: 80, top: 40, right: 200, bottom: 84 })
  };
  harness.document.hoveredElement = target;
  const runtime = createTargetCursorRuntime({
    cursor: harness.cursor,
    window: harness.window,
    document: harness.document
  });

  runtime.mount();
  assert.equal(runtime.getState().enabled, true);
  assert.equal(harness.rootClasses.contains("has-target-cursor"), true);
  assert.doesNotThrow(() => harness.runFrame(), "idle frames must not read a missing target");

  harness.window.dispatch("pointermove", {
    clientX: 120,
    clientY: 60,
    pointerType: "mouse",
    target
  });
  harness.runFrame(32);
  assert.equal(runtime.getState().activeTarget, target);
  assert.equal(harness.cursor.classList.contains("is-targeting"), true);
  assert.equal(harness.cursor.style.opacity, "1");
  assert.match(harness.corners[0].style.transform, /^translate3d\(/);

  target.isConnected = false;
  harness.runFrame(48);
  assert.equal(runtime.getState().activeTarget, null, "removed route controls are released");

  harness.window.dispatch("pointerdown", { button: 0, pointerType: "mouse" });
  assert.equal(runtime.getState().pressed, true);
  assert.equal(harness.cursor.classList.contains("is-pressed"), true);
  harness.window.dispatch("pointerup");
  assert.equal(runtime.getState().pressed, false);

  const finePointer = harness.queries.get(FINE_POINTER_QUERY);
  finePointer.matches = false;
  finePointer.dispatch("change");
  assert.equal(runtime.getState().enabled, false);
  assert.equal(harness.rootClasses.contains("has-target-cursor"), false);

  runtime.destroy();
  assert.equal(harness.window.listeners.get("pointermove")?.size ?? 0, 0);
});
