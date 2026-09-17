import assert from 'node:assert/strict';
import test from 'node:test';
import { sampleGesture, limitPull, deformGesture, pointsPath, readingGesture } from '../docs/.vitepress/theme/gestureGeometry.mjs';
import { createGestureRuntime } from '../docs/.vitepress/theme/gestureRuntime.mjs';

class Events {
  listeners = new Map();
  addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn); }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
  emit(name, event = {}) { this.listeners.get(name)?.forEach(fn => fn(event)); }
  count() { return [...this.listeners.values()].reduce((n, set) => n + set.size, 0); }
}
function harness({ reduced = false, fine = true, width = 1000 } = {}) {
  const frames = new Map(), win = new Events(), doc = new Events(), host = new Events(), hit = new Events();
  const reduceQuery = Object.assign(new Events(), { matches: reduced });
  const fineQuery = Object.assign(new Events(), { matches: fine });
  let next = 0, time = 0, resize, disconnected = false, capture;
  win.matchMedia = query => query.includes('reduced') ? reduceQuery : fineQuery;
  win.requestAnimationFrame = fn => { frames.set(++next, fn); return next; };
  win.cancelAnimationFrame = id => frames.delete(id);
  win.ResizeObserver = class { constructor(fn) { resize = fn; } observe() {} disconnect() { disconnected = true; } };
  host.dataset = {};
  host.getBoundingClientRect = () => ({ width, height: 620, left: 0, top: 0 });
  host.querySelectorAll = () => [];
  const ink = { attributes: {}, setAttribute(key, value) { this.attributes[key] = value; } };
  hit.setAttribute = () => {};
  hit.setPointerCapture = id => capture = id;
  hit.hasPointerCapture = id => id === capture;
  hit.releasePointerCapture = () => capture = undefined;
  const runtime = createGestureRuntime({ host, hit, ink, svg: { setAttribute() {} }, window: win, document: doc });
  function advance(count = 1) {
    for (let i = 0; i < count; i++) {
      time += 16;
      const current = [...frames.values()]; frames.clear(); current.forEach(fn => fn(time));
    }
  }
  const anchor = sampleGesture(width, 620)[90];
  const pointer = (x = anchor.x, y = anchor.y, extra = {}) => ({ clientX: x, clientY: y, pointerId: 1, isPrimary: true, button: 0, pointerType: 'mouse', ...extra });
  return { frames, win, doc, host, hit, ink, reduceQuery, fineQuery, runtime, advance, pointer, anchor,
    resize: () => resize(), disconnected: () => disconnected, capture: () => capture };
}

test('gesture sampling stays continuous on narrow, desktop and ultrawide screens', () => {
  for (const width of [320, 390, 680, 681, 1440, 2560]) {
    const points = sampleGesture(width, 700);
    assert.equal(points.length, 241);
    assert.ok(points.every((p, i) => Number.isFinite(p.x + p.y) && (!i || p.distance > points[i - 1].distance)));
    const deformed = deformGesture(points, points[100].distance, 80, -60, 160);
    assert.deepEqual(deformed[0], { x: points[0].x, y: points[0].y });
    assert.deepEqual(deformed.at(-1), { x: points.at(-1).x, y: points.at(-1).y });
    assert.ok(deformed.every((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y) <= 100.001));
    assert.doesNotMatch(pointsPath(deformed), /NaN|Infinity/);
  }
  const pull = limitPull(9000, 12000, 76);
  assert.ok(Math.hypot(pull.x, pull.y) <= 76.001);
  assert.deepEqual(limitPull(0, 0, 76), { x: 0, y: 0 });
  assert.doesNotMatch(readingGesture(35000, 22), /NaN|Infinity/);
});

test('motion rests without frames, pulls only the captured pointer and returns exactly', () => {
  const h = harness(), original = h.ink.attributes.d;
  assert.equal(h.frames.size, 0);
  h.hit.emit('pointerdown', h.pointer());
  assert.equal(h.capture(), 1);
  h.host.emit('pointermove', h.pointer(h.anchor.x + 300, h.anchor.y - 80, { pointerId: 2 }));
  assert.equal(h.frames.size, 0);
  h.host.emit('pointermove', h.pointer(h.anchor.x + 300, h.anchor.y - 80));
  h.advance(20);
  assert.notEqual(h.ink.attributes.d, original);
  h.hit.emit('pointerup', h.pointer());
  h.advance(100);
  assert.equal(h.ink.attributes.d, original);
  assert.equal(h.frames.size, 0);
  assert.equal(h.host.dataset.gestureState, 'idle');
  assert.equal(h.capture(), undefined);
  h.runtime.destroy();
});

test('touch scroll stays native away from the line; cancellation releases a drag', () => {
  const h = harness({ fine: false, width: 390 }), original = h.ink.attributes.d;
  h.host.emit('pointermove', h.pointer(140, 200, { pointerType: 'touch' }));
  assert.equal(h.frames.size, 0);
  h.hit.emit('pointerdown', h.pointer(undefined, undefined, { pointerType: 'touch' }));
  h.host.emit('pointermove', h.pointer(h.anchor.x + 100, h.anchor.y + 100, { pointerType: 'touch' }));
  h.advance(15);
  assert.notEqual(h.ink.attributes.d, original);
  h.hit.emit('pointercancel', h.pointer(undefined, undefined, { pointerType: 'touch' }));
  h.advance(100);
  assert.equal(h.ink.attributes.d, original);
  assert.equal(h.capture(), undefined);
  h.runtime.destroy();
});

test('resize, reduced motion, hidden pages and unmount cancel pending work', () => {
  const h = harness();
  const start = () => { h.hit.emit('pointerdown', h.pointer()); h.host.emit('pointermove', h.pointer(h.anchor.x + 60, h.anchor.y)); };
  start(); h.resize();
  assert.equal(h.frames.size, 0); assert.equal(h.capture(), undefined);
  start(); h.reduceQuery.matches = true; h.reduceQuery.emit('change');
  assert.equal(h.frames.size, 0); assert.equal(h.capture(), undefined);
  start(); assert.equal(h.capture(), undefined);
  h.reduceQuery.matches = false; start(); h.doc.hidden = true; h.doc.emit('visibilitychange');
  assert.equal(h.frames.size, 0);
  h.runtime.destroy();
  assert.equal(h.disconnected(), true);
  for (const target of [h.win, h.doc, h.host, h.hit, h.reduceQuery, h.fineQuery]) assert.equal(target.count(), 0);
});
