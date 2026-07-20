import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  FINE_POINTER_QUERY,
  FREE_CORNER_OFFSETS,
  READING_CORNER_OFFSETS,
  READING_CURSOR_SELECTOR,
  REDUCED_MOTION_QUERY,
  TARGET_CURSOR_SELECTOR,
  createTargetCursorRuntime,
  normalizeCornerRotation,
  resolveReadingRegion,
  resolveCursorTarget,
  targetCornerOffsets
} from "../docs/.vitepress/theme/targetCursorRuntime.mjs";

const cursorComponent = readFileSync(
  new URL("../docs/.vitepress/theme/TargetCursor.vue", import.meta.url),
  "utf8"
);

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
    "[tabindex]:not([tabindex='-1']):not(pre)",
    "[data-cursor-target]"
  ]) {
    assert.match(TARGET_CURSOR_SELECTOR, new RegExp(contract.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("reading selector covers the VitePress article column and explicit reading regions", () => {
  assert.match(READING_CURSOR_SELECTOR, /\.VPDoc \.content-container/);
  assert.match(READING_CURSOR_SELECTOR, /\[data-cursor-reading\]/);
});

test("keeps keyboard-scrollable code blocks in reading mode", () => {
  assert.match(
    TARGET_CURSOR_SELECTOR,
    /\[tabindex\]:not\(\[tabindex='-1'\]\):not\(pre\)/
  );

  const readingRegion = {
    nodeType: 1,
    parentElement: null,
    hasAttribute: () => false,
    matches: (selector) => selector === READING_CURSOR_SELECTOR
  };
  const codeBlock = {
    nodeType: 1,
    parentElement: readingRegion,
    hasAttribute: () => false,
    matches: () => false
  };

  assert.equal(resolveCursorTarget(codeBlock), null);
  assert.equal(resolveReadingRegion(codeBlock), readingRegion);
});

test("renders the restrained translucent reading line and its reduced-motion fallback", () => {
  assert.match(cursorComponent, /data-target-cursor-reading-line/);
  assert.match(
    cursorComponent,
    /\.target-cursor__reading-line\s*\{[\s\S]*?width:\s*6px;[\s\S]*?height:\s*28px;[\s\S]*?background:\s*var\(--target-cursor-reading-color\)/s
  );
  assert.match(
    cursorComponent,
    /\.target-cursor\.is-reading \.target-cursor__reading-line\s*\{[\s\S]*?opacity:\s*0\.78/s
  );
  assert.match(cursorComponent, /@media \(prefers-reduced-motion: reduce\)/);
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
  assert.deepEqual(READING_CORNER_OFFSETS.map(({ x, y }) => ({ x, y })), [
    { x: -6, y: -14 },
    { x: -6, y: -14 },
    { x: -6, y: 2 },
    { x: -6, y: 2 }
  ]);
});

test("normalizes four equivalent corner orientations to the nearest quarter turn", () => {
  for (const [rotation, expected] of [
    [0, 0],
    [44, 44],
    [46, -44],
    [89, -1],
    [91, 1],
    [174, -6],
    [180, 0],
    [269, -1],
    [270, 0],
    [359, -1],
    [-46, 44]
  ]) {
    assert.equal(normalizeCornerRotation(rotation), expected);
  }
});

test("target and reading resolution select the nearest matching ancestor and ignore the cursor itself", () => {
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
  assert.equal(resolveReadingRegion(child, "article"), target);
  assert.equal(resolveReadingRegion(cursorChild, "article"), null);
});

test("rebases free four-corner rotation before the corners frame a target", () => {
  const harness = createHarness();
  const target = {
    nodeType: 1,
    parentElement: null,
    isConnected: true,
    hasAttribute: () => false,
    matches: (selector) => selector === TARGET_CURSOR_SELECTOR,
    getBoundingClientRect: () => ({ left: 80, top: 40, right: 200, bottom: 84 })
  };
  const readRotation = () =>
    Number(harness.cursor.style.transform.match(/rotate\(([-+0-9.e]+)deg\)/)?.[1] ?? 0);
  const runtime = createTargetCursorRuntime({
    cursor: harness.cursor,
    window: harness.window,
    document: harness.document
  });

  runtime.mount();
  for (let index = 1; index <= 60; index += 1) {
    harness.runFrame(index * 16);
  }
  const freeRotation = readRotation();
  assert.ok(freeRotation > 160 && freeRotation < 180);

  harness.document.hoveredElement = target;
  harness.window.dispatch("pointermove", {
    clientX: 120,
    clientY: 60,
    pointerType: "mouse",
    target
  });
  harness.runFrame(61 * 16);
  const firstTargetRotation = readRotation();
  assert.ok(Math.abs(firstTargetRotation) <= 45);

  for (let index = 62; index <= 70; index += 1) {
    harness.runFrame(index * 16);
  }
  assert.ok(Math.abs(readRotation()) < Math.abs(firstTargetRotation));

  runtime.destroy();
});

test("runtime enables only for fine pointers, morphs between reading and targeting, presses, and cleans up", () => {
  const harness = createHarness();
  const readingRegion = {
    nodeType: 1,
    parentElement: null,
    isConnected: true,
    hasAttribute: () => false,
    matches: (selector) => selector === READING_CURSOR_SELECTOR
  };
  const target = {
    nodeType: 1,
    parentElement: null,
    isConnected: true,
    hasAttribute: () => false,
    matches: (selector) => selector === TARGET_CURSOR_SELECTOR,
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

  harness.document.hoveredElement = readingRegion;
  harness.window.dispatch("pointermove", {
    clientX: 120,
    clientY: 60,
    pointerType: "mouse",
    target: readingRegion
  });
  harness.runFrame(32);
  assert.equal(runtime.getState().activeReadingRegion, readingRegion);
  assert.equal(runtime.getState().activeTarget, null);
  assert.equal(harness.cursor.classList.contains("is-reading"), true);

  harness.document.hoveredElement = target;
  harness.window.dispatch("pointermove", {
    clientX: 120,
    clientY: 60,
    pointerType: "mouse",
    target
  });
  harness.runFrame(48);
  assert.equal(runtime.getState().activeTarget, target);
  assert.equal(runtime.getState().activeReadingRegion, null);
  assert.equal(harness.cursor.classList.contains("is-targeting"), true);
  assert.equal(harness.cursor.classList.contains("is-reading"), false);
  assert.equal(harness.cursor.style.opacity, "1");
  assert.match(harness.corners[0].style.transform, /^translate3d\(/);

  target.isConnected = false;
  harness.runFrame(64);
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
