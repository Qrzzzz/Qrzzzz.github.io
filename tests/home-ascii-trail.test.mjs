import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  HOME_ASCII_TRAIL_POINTER_QUERY,
  HOME_ASCII_TRAIL_REDUCED_MOTION_QUERY,
  asciiDirectionGlyph,
  asciiTrailGlyph,
  createHomeAsciiTrailRuntime
} from "../docs/.vitepress/theme/homeAsciiTrailRuntime.mjs";

const layoutSource = readFileSync(
  new URL("../docs/.vitepress/theme/Layout.vue", import.meta.url),
  "utf8"
);
const componentSource = readFileSync(
  new URL("../docs/.vitepress/theme/HomeAsciiTrail.vue", import.meta.url),
  "utf8"
);
const siteStyles = readFileSync(
  new URL("../docs/.vitepress/theme/styles/site.css", import.meta.url),
  "utf8"
);

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

function createHarness({ finePointer = true, reducedMotion = false } = {}) {
  const context = {
    clearCount: 0,
    draws: [],
    fillStyle: "",
    font: "",
    globalAlpha: 1,
    textAlign: "",
    textBaseline: "",
    clearRect() {
      this.clearCount += 1;
    },
    fillText(glyph, x, y) {
      this.draws.push({ glyph, x, y, alpha: this.globalAlpha });
    },
    setTransform() {}
  };
  const canvas = {
    dataset: {},
    height: 0,
    width: 0,
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 360, height: 240 };
    },
    getContext() {
      return context;
    }
  };
  const document = new FakeEventTarget();
  document.hidden = false;
  const window = new FakeEventTarget();
  window.devicePixelRatio = 2;
  window.innerHeight = 240;
  window.innerWidth = 360;
  const queries = new Map([
    [
      HOME_ASCII_TRAIL_POINTER_QUERY,
      Object.assign(new FakeEventTarget(), { matches: finePointer })
    ],
    [
      HOME_ASCII_TRAIL_REDUCED_MOTION_QUERY,
      Object.assign(new FakeEventTarget(), { matches: reducedMotion })
    ]
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

  const runtime = createHomeAsciiTrailRuntime({
    canvas,
    context,
    document,
    window,
    color: "#123456"
  });

  return {
    canvas,
    context,
    document,
    frames,
    queries,
    runtime,
    window,
    runFrame(timestamp = 16) {
      const entry = frames.entries().next().value;
      assert.ok(entry, "an animation frame should be scheduled");
      frames.delete(entry[0]);
      entry[1](timestamp);
    }
  };
}

test("glyphs encode pointer direction and field strength", () => {
  assert.equal(asciiDirectionGlyph(8, 2), ">");
  assert.equal(asciiDirectionGlyph(-8, 2), "<");
  assert.equal(asciiDirectionGlyph(1, -8), "^");
  assert.equal(asciiDirectionGlyph(1, 8), "v");
  assert.equal(asciiTrailGlyph(0.8, ">"), "o");
  assert.equal(asciiTrailGlyph(0.5, "<"), "<");
  assert.equal(asciiTrailGlyph(0.1, ">"), "-");
});

test("pointer movement deposits a demand-driven fading field", () => {
  const harness = createHarness();
  harness.runtime.mount();

  assert.equal(harness.canvas.dataset.asciiTrailState, "idle");
  assert.equal(harness.canvas.width, 720);
  assert.equal(harness.canvas.height, 480);
  assert.equal(harness.frames.size, 0);

  harness.window.dispatch("pointermove", {
    clientX: 180,
    clientY: 120,
    pointerType: "mouse"
  });
  assert.equal(harness.canvas.dataset.asciiTrailState, "running");
  assert.ok(harness.runtime.getState().activeCells > 0);
  assert.ok(
    harness.runtime.getState().activeCells < 80,
    "the pointer field should remain compact"
  );
  assert.equal(harness.frames.size, 1);

  harness.runFrame();
  const glyphs = new Set(harness.context.draws.map((draw) => draw.glyph));
  assert.ok(glyphs.has("o"));
  assert.ok(glyphs.has(">"));
  assert.ok(glyphs.has("-"));
  const peakAlpha = Math.max(...harness.context.draws.map((draw) => draw.alpha));
  assert.ok(peakAlpha >= 0.4, "the pointer core should respond clearly");
  assert.ok(peakAlpha <= 0.62, "the canvas should keep a restrained peak opacity");

  let timestamp = 32;
  while (harness.frames.size && timestamp < 3000) {
    harness.runFrame(timestamp);
    timestamp += 32;
  }
  assert.equal(harness.frames.size, 0);
  assert.equal(harness.runtime.getState().activeCells, 0);
  assert.equal(harness.canvas.dataset.asciiTrailState, "idle");
  assert.ok(timestamp < 1800, "the trail should clear promptly after pointer movement");
});

test("touch, coarse pointers, reduced motion, and hidden pages stay inactive", () => {
  const reduced = createHarness({ reducedMotion: true });
  reduced.runtime.mount();
  assert.equal(reduced.canvas.dataset.asciiTrailState, "disabled");
  assert.equal(reduced.window.listeners.get("pointermove")?.size ?? 0, 0);

  const coarse = createHarness({ finePointer: false });
  coarse.runtime.mount();
  assert.equal(coarse.canvas.dataset.asciiTrailState, "disabled");

  const active = createHarness();
  active.runtime.mount();
  active.window.dispatch("pointermove", {
    clientX: 120,
    clientY: 90,
    pointerType: "touch"
  });
  assert.equal(active.runtime.getState().activeCells, 0);

  active.window.dispatch("pointermove", {
    clientX: 120,
    clientY: 90,
    pointerType: "mouse"
  });
  assert.equal(active.frames.size, 1);
  active.document.hidden = true;
  active.document.dispatch("visibilitychange");
  assert.equal(active.frames.size, 0);
  assert.equal(active.runtime.getState().activeCells, 0);
});

test("the trail mounts above Grainient and only on the homepage", () => {
  const grainientIndex = layoutSource.indexOf("<HomeGrainient");
  const trailIndex = layoutSource.indexOf("<HomeAsciiTrail");
  const defaultLayoutIndex = layoutSource.indexOf("<Layout>");

  assert.ok(grainientIndex > 0);
  assert.ok(trailIndex > grainientIndex);
  assert.ok(defaultLayoutIndex > trailIndex);
  assert.match(
    layoutSource,
    /<HomeAsciiTrail v-if="clientReady && pageKind === 'home'" \/>/
  );
  assert.match(componentSource, /class="home-ascii-trail"/);
  assert.match(componentSource, /aria-hidden="true"/);
  assert.match(componentSource, /position:\s*fixed/);
  assert.match(componentSource, /z-index:\s*1/);
  assert.match(componentSource, /pointer-events:\s*none/);
  assert.match(componentSource, /prefers-reduced-motion:\s*reduce/);
  assert.match(
    siteStyles,
    /\.site-layout\[data-page-kind="home"\] > \.Layout\s*\{[\s\S]*?z-index:\s*2/
  );
});
