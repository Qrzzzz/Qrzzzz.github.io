import assert from "node:assert/strict";
import test from "node:test";

import {
  CLICK_SPARK_THEME_COLORS,
  FINE_POINTER_QUERY,
  MAX_ACTIVE_SPARKS,
  MAX_DEVICE_PIXEL_RATIO,
  REDUCED_MOTION_QUERY,
  SPARK_COUNT,
  SPARK_DURATION_MS,
  createClickSparkRuntime
} from "../docs/.vitepress/theme/clickSparkRuntime.mjs";

class MockMediaQuery {
  constructor(media, matches) {
    this.media = media;
    this.matches = matches;
    this.listeners = new Set();
  }

  addEventListener(type, listener) {
    assert.equal(type, "change");
    this.listeners.add(listener);
  }

  removeEventListener(type, listener) {
    assert.equal(type, "change");
    this.listeners.delete(listener);
  }

  setMatches(matches) {
    if (matches === this.matches) return;
    this.matches = matches;
    this.emit();
  }

  emit() {
    const event = { matches: this.matches, media: this.media };
    for (const listener of [...this.listeners]) listener(event);
  }
}

function createMockContext() {
  let currentPath = [];

  return {
    clearRectCalls: [],
    setTransformCalls: [],
    strokes: [],
    globalAlpha: 1,
    strokeStyle: "",
    lineWidth: 1,
    lineCap: "butt",
    shadowBlur: 0,
    shadowColor: "",
    clearRect(...values) {
      this.clearRectCalls.push(values);
    },
    setTransform(...values) {
      this.setTransformCalls.push(values);
    },
    save() {},
    restore() {},
    beginPath() {
      currentPath = [];
    },
    moveTo(x, y) {
      currentPath.push([x, y]);
    },
    lineTo(x, y) {
      currentPath.push([x, y]);
    },
    stroke() {
      this.strokes.push({
        color: this.strokeStyle,
        alpha: this.globalAlpha,
        lineWidth: this.lineWidth,
        shadowBlur: this.shadowBlur,
        path: currentPath.map((point) => [...point])
      });
    }
  };
}

function createMockCanvas() {
  const context = createMockContext();
  const widthAssignments = [];
  const heightAssignments = [];
  let width = 300;
  let height = 150;
  let getContextCalls = 0;

  return {
    context,
    widthAssignments,
    heightAssignments,
    style: { width: "", height: "" },
    get width() {
      return width;
    },
    set width(value) {
      width = value;
      widthAssignments.push(value);
    },
    get height() {
      return height;
    },
    set height(value) {
      height = value;
      heightAssignments.push(value);
    },
    getContext(kind) {
      assert.equal(kind, "2d");
      getContextCalls += 1;
      return context;
    },
    getContextCallCount() {
      return getContextCalls;
    }
  };
}

function createHarness({
  reducedMotion = false,
  finePointer = true,
  width = 390,
  height = 844,
  devicePixelRatio = 1,
  palette = CLICK_SPARK_THEME_COLORS.light
} = {}) {
  const canvas = createMockCanvas();
  const mediaQueries = new Map([
    [REDUCED_MOTION_QUERY, new MockMediaQuery(REDUCED_MOTION_QUERY, reducedMotion)],
    [FINE_POINTER_QUERY, new MockMediaQuery(FINE_POINTER_QUERY, finePointer)]
  ]);
  const listeners = new Map();
  const animationFrames = new Map();
  const canceledFrames = [];
  let nextAnimationFrame = 1;
  let clock = 100;
  let activePalette = [...palette];

  const targetWindow = {
    innerWidth: width,
    innerHeight: height,
    devicePixelRatio,
    performance: {
      now: () => clock
    },
    matchMedia(query) {
      const mediaQuery = mediaQueries.get(query);
      assert.ok(mediaQuery, `unexpected media query: ${query}`);
      return mediaQuery;
    },
    getComputedStyle() {
      return {
        getPropertyValue(name) {
          if (name === "--click-spark-primary") return activePalette[0];
          if (name === "--click-spark-secondary") return activePalette[1];
          return "";
        }
      };
    },
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    requestAnimationFrame(callback) {
      const id = nextAnimationFrame;
      nextAnimationFrame += 1;
      animationFrames.set(id, callback);
      return id;
    },
    cancelAnimationFrame(id) {
      canceledFrames.push(id);
      animationFrames.delete(id);
    }
  };

  function dispatch(type, event = {}) {
    for (const listener of [...(listeners.get(type) ?? [])]) listener(event);
  }

  function pointer(overrides = {}) {
    dispatch("pointerdown", {
      button: 0,
      isPrimary: true,
      pointerType: "mouse",
      clientX: 120,
      clientY: 240,
      ...overrides
    });
  }

  function runNextFrame(timestamp = clock) {
    const next = animationFrames.entries().next();
    assert.equal(next.done, false, "an animation frame should be pending");
    const [id, callback] = next.value;
    animationFrames.delete(id);
    clock = timestamp;
    callback(timestamp);
  }

  const runtime = createClickSparkRuntime({ canvas, window: targetWindow });

  return {
    canvas,
    canceledFrames,
    mediaQueries,
    runtime,
    targetWindow,
    animationFrameCount: () => animationFrames.size,
    dispatch,
    listenerCount: (type) => listeners.get(type)?.size ?? 0,
    pointer,
    runNextFrame,
    setPalette: (nextPalette) => {
      activePalette = [...nextPalette];
    }
  };
}

test("initially disabled preferences retain only media-query listeners", () => {
  for (const preferences of [
    { reducedMotion: true, finePointer: true },
    { reducedMotion: false, finePointer: false },
    { reducedMotion: true, finePointer: false }
  ]) {
    const harness = createHarness(preferences);
    harness.runtime.mount();
    harness.runtime.mount();

    assert.equal(harness.runtime.isEnabled(), false);
    assert.equal(harness.canvas.getContextCallCount(), 0);
    assert.deepEqual(harness.canvas.widthAssignments, [1]);
    assert.deepEqual(harness.canvas.heightAssignments, [1]);
    assert.equal(harness.canvas.style.width, "1px");
    assert.equal(harness.canvas.style.height, "1px");
    assert.equal(harness.listenerCount("pointerdown"), 0);
    assert.equal(harness.listenerCount("resize"), 0);
    assert.equal(harness.animationFrameCount(), 0);
    assert.equal(harness.mediaQueries.get(REDUCED_MOTION_QUERY).listeners.size, 1);
    assert.equal(harness.mediaQueries.get(FINE_POINTER_QUERY).listeners.size, 1);

    harness.runtime.destroy();
  }
});

test("enables once, caps DPR, and resizes only while active", () => {
  const harness = createHarness({ devicePixelRatio: 3 });
  harness.runtime.mount();

  assert.equal(harness.runtime.isEnabled(), true);
  assert.equal(harness.canvas.getContextCallCount(), 1);
  assert.equal(harness.canvas.width, 390 * MAX_DEVICE_PIXEL_RATIO);
  assert.equal(harness.canvas.height, 844 * MAX_DEVICE_PIXEL_RATIO);
  assert.deepEqual(harness.canvas.context.setTransformCalls.at(-1), [2, 0, 0, 2, 0, 0]);
  assert.equal(harness.canvas.context.lineCap, "round");
  assert.equal(harness.listenerCount("pointerdown"), 1);
  assert.equal(harness.listenerCount("resize"), 1);

  harness.mediaQueries.get(FINE_POINTER_QUERY).emit();
  assert.equal(harness.canvas.getContextCallCount(), 1, "repeated enable must be idempotent");
  assert.equal(harness.listenerCount("pointerdown"), 1);

  harness.targetWindow.innerWidth = 768;
  harness.targetWindow.innerHeight = 1024;
  harness.targetWindow.devicePixelRatio = 1.5;
  harness.dispatch("resize");
  assert.equal(harness.canvas.width, 1152);
  assert.equal(harness.canvas.height, 1536);
  assert.deepEqual(harness.canvas.context.setTransformCalls.at(-1), [1.5, 0, 0, 1.5, 0, 0]);

  harness.runtime.destroy();
});

test("guards pointer input, clamps coordinates, and resolves both theme palettes", () => {
  const harness = createHarness();
  harness.runtime.mount();

  harness.pointer({ button: 1 });
  harness.pointer({ isPrimary: false });
  harness.pointer({ pointerType: "touch" });
  assert.equal(harness.animationFrameCount(), 0);

  harness.pointer({ clientX: -20, clientY: 2000 });
  assert.equal(harness.animationFrameCount(), 1);
  harness.runNextFrame();

  assert.equal(harness.canvas.context.strokes.length, SPARK_COUNT);
  assert.deepEqual(
    new Set(harness.canvas.context.strokes.map((stroke) => stroke.color)),
    new Set(CLICK_SPARK_THEME_COLORS.light)
  );
  assert.deepEqual(harness.canvas.context.strokes[0].path[0], [0, 844]);
  assert.ok(harness.canvas.context.strokes.every((stroke) => stroke.shadowBlur === 3));

  harness.runNextFrame(100 + SPARK_DURATION_MS);
  harness.setPalette(CLICK_SPARK_THEME_COLORS.dark);
  const darkStart = harness.canvas.context.strokes.length;
  harness.pointer();
  harness.runNextFrame(100 + SPARK_DURATION_MS);
  const darkStrokes = harness.canvas.context.strokes.slice(darkStart);
  assert.equal(darkStrokes.length, SPARK_COUNT);
  assert.deepEqual(
    new Set(darkStrokes.map((stroke) => stroke.color)),
    new Set(CLICK_SPARK_THEME_COLORS.dark)
  );

  harness.runtime.destroy();
});

test("keeps ten 360ms rays and no more than sixty active sparks", () => {
  assert.equal(SPARK_COUNT, 10);
  assert.equal(SPARK_DURATION_MS, 360);
  assert.equal(MAX_ACTIVE_SPARKS, 60);
  assert.equal(MAX_DEVICE_PIXEL_RATIO, 2);

  const harness = createHarness();
  harness.runtime.mount();

  for (let click = 0; click < 7; click += 1) harness.pointer();
  assert.equal(harness.animationFrameCount(), 1, "clicks should share one RAF loop");
  harness.runNextFrame(100);
  assert.equal(harness.canvas.context.strokes.length, MAX_ACTIVE_SPARKS);

  harness.canvas.context.strokes.splice(0);
  harness.runNextFrame(100 + SPARK_DURATION_MS - 1);
  assert.equal(harness.canvas.context.strokes.length, MAX_ACTIVE_SPARKS);

  harness.canvas.context.strokes.splice(0);
  harness.runNextFrame(100 + SPARK_DURATION_MS);
  assert.equal(harness.canvas.context.strokes.length, 0);
  assert.equal(harness.animationFrameCount(), 0);

  harness.runtime.destroy();
});

test("preference changes stop and restart cleanly, and destroy is final", () => {
  const harness = createHarness({ reducedMotion: true, devicePixelRatio: 2 });
  const motionQuery = harness.mediaQueries.get(REDUCED_MOTION_QUERY);
  const finePointerQuery = harness.mediaQueries.get(FINE_POINTER_QUERY);
  harness.runtime.mount();

  motionQuery.setMatches(false);
  assert.equal(harness.runtime.isEnabled(), true);
  assert.equal(harness.canvas.getContextCallCount(), 1);
  assert.equal(harness.listenerCount("pointerdown"), 1);

  harness.pointer();
  assert.equal(harness.animationFrameCount(), 1);
  finePointerQuery.setMatches(false);
  assert.equal(harness.runtime.isEnabled(), false);
  assert.equal(harness.animationFrameCount(), 0);
  assert.equal(harness.canceledFrames.length, 1);
  assert.equal(harness.listenerCount("pointerdown"), 0);
  assert.equal(harness.listenerCount("resize"), 0);
  assert.equal(harness.canvas.width, 1);
  assert.equal(harness.canvas.height, 1);

  finePointerQuery.emit();
  assert.equal(harness.canvas.getContextCallCount(), 1, "repeated disable must be idempotent");
  finePointerQuery.setMatches(true);
  assert.equal(harness.runtime.isEnabled(), true);
  assert.equal(harness.canvas.getContextCallCount(), 2);
  assert.equal(harness.listenerCount("pointerdown"), 1);

  const strokesBeforeRestart = harness.canvas.context.strokes.length;
  harness.pointer();
  harness.runNextFrame();
  assert.equal(
    harness.canvas.context.strokes.length - strokesBeforeRestart,
    SPARK_COUNT,
    "sparks from the disabled session must not return"
  );

  harness.runtime.destroy();
  harness.runtime.destroy();
  assert.equal(harness.runtime.isEnabled(), false);
  assert.equal(harness.animationFrameCount(), 0);
  assert.equal(harness.listenerCount("pointerdown"), 0);
  assert.equal(harness.listenerCount("resize"), 0);
  assert.equal(motionQuery.listeners.size, 0);
  assert.equal(finePointerQuery.listeners.size, 0);
  assert.equal(harness.canvas.width, 1);
  assert.equal(harness.canvas.height, 1);

  const contextCallsAfterDestroy = harness.canvas.getContextCallCount();
  motionQuery.setMatches(true);
  motionQuery.setMatches(false);
  harness.pointer();
  assert.equal(harness.canvas.getContextCallCount(), contextCallsAfterDestroy);
  assert.equal(harness.animationFrameCount(), 0);
});
