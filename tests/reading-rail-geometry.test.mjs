import assert from 'node:assert/strict';
import test from 'node:test';
import { createReadingRailPlan, readingRailPath, readingRailKnotSegments, readingRailKnotProgress, READING_RAIL_MOTIFS } from '../docs/.vitepress/theme/readingRailGeometry.mjs';

const options = { height: 500000, width: 64, viewportHeight: 900, safeTop: 96, seed: 'geometry-fixtures' };
const plan = createReadingRailPlan(options);
const fixtures = READING_RAIL_MOTIFS.map(motif => plan.knots.find(knot => knot.id === motif.id));
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} differs from ${b}`);

function sample(segments) {
  const points = [];
  for (const segment of segments) {
    for (let step = points.length ? 1 : 0; step <= 60; step++) {
      const t = step / 60, u = 1 - t, weights = [u ** 3, 3 * u * u * t, 3 * u * t * t, t ** 3];
      points.push([0, 1].map(axis => segment.reduce((sum, point, i) => sum + point[axis] * weights[i], 0)));
    }
  }
  return points;
}

function hasCrossing(points) {
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  for (let i = 1; i < points.length; i++) {
    for (let j = i + 2; j < points.length; j++) {
      const a = points[i - 1], b = points[i], c = points[j - 1], d = points[j];
      if (cross(a, b, c) * cross(a, b, d) < -1e-10 && cross(c, d, a) * cross(c, d, b) < -1e-10) return true;
    }
  }
  return false;
}

test('twelve independent motifs form real loops and retain distinct geometry', () => {
  assert.equal(READING_RAIL_MOTIFS.length, 12);
  assert.ok(fixtures.every(Boolean));
  const shapes = new Set();
  for (const knot of fixtures) {
    const segments = readingRailKnotSegments(knot, 1);
    const local = segments.map(segment => segment.map(point => [point[0], point[1] - knot.start]));
    shapes.add(JSON.stringify(local));
    if (knot.id !== 'open-turn') assert.ok(hasCrossing(sample(segments)), `${knot.id} must contain a loop`);
    assert.equal(hasCrossing(sample(readingRailKnotSegments(knot, 0))), false);
  }
  assert.equal(shapes.size, 12);
});

test('all intermediate poses fit the rail and preserve shared tangents and endpoints', () => {
  for (const width of [32, 64]) {
    const p = createReadingRailPlan({ ...options, width });
    for (const id of READING_RAIL_MOTIFS.map(motif => motif.id)) {
      const knot = p.knots.find(item => item.id === id);
      for (let step = 0; step <= 40; step++) {
        const segments = readingRailKnotSegments(knot, step / 40);
        close(segments[0][0][0], width / 2); close(segments[0][0][1], knot.start);
        close(segments.at(-1)[3][0], width / 2); close(segments.at(-1)[3][1], knot.end);
        for (const point of segments.flat()) {
          assert.ok(Number.isFinite(point[0] + point[1]));
          assert.ok(point[0] >= 2 - 1e-8 && point[0] <= width - 2 + 1e-8);
          assert.ok(point[1] >= knot.start - 1e-8 && point[1] <= knot.end + 1e-8);
        }
        for (let i = 1; i < segments.length; i++) {
          const before = segments[i - 1], after = segments[i];
          for (const axis of [0, 1]) {
            close(before[3][axis], after[0][axis]);
            close(before[3][axis] - before[2][axis], after[1][axis] - after[0][axis]);
          }
          if (step / 40 > .12) assert.ok(Math.hypot(after[1][0] - after[0][0], after[1][1] - after[0][1]) > 1e-6, `${id} lost its tangent during visible growth`);
        }
      }
    }
  }
});

test('topology changes below a pixel before rounded loops grow visibly', () => {
  for (const knot of fixtures) {
    const collapsed = readingRailKnotSegments(knot, .12);
    assert.ok(collapsed.flat().every(point => Math.abs(point[0] - knot.width / 2) < .5));
    if (knot.id !== 'open-turn') {
      for (const progress of [.25, .5, .75, 1]) assert.ok(hasCrossing(sample(readingRailKnotSegments(knot, progress))), `${knot.id} must grow an existing loop at ${progress}`);
    }
  }
});

test('loops deform only behind the reading front and reverse before clipping reaches them', () => {
  for (const knot of fixtures) {
    const start = knot.end + knot.lead;
    assert.equal(readingRailKnotProgress(knot, knot.start), 0);
    assert.equal(readingRailKnotProgress(knot, knot.end), 0);
    assert.equal(readingRailKnotProgress(knot, start), 0);
    assert.equal(readingRailKnotProgress(knot, start + knot.formation), 1);
    for (let step = 1; step <= 20; step++) {
      const reading = start + knot.formation * step / 20;
      const progress = readingRailKnotProgress(knot, reading);
      const segments = readingRailKnotSegments(knot, progress);
      assert.ok(segments.flat().every(point => point[1] <= reading - knot.lead + 1e-8));
      assert.equal(readingRailKnotProgress(knot, reading), progress);
    }
  }
  const first = fixtures[0], position = first.end + first.lead + first.formation * .4;
  const before = readingRailPath(plan, position);
  readingRailPath(plan, options.height);
  assert.equal(readingRailPath(plan, position), before);
  assert.doesNotMatch(before, /NaN|Infinity/);
});

test('seeded sparse selection stays stable across content growth and rail widths', () => {
  const shorter = createReadingRailPlan({ ...options, height: 20000 });
  const narrower = createReadingRailPlan({ ...options, width: 32 });
  assert.deepEqual(shorter.knots.map(knot => [knot.id, knot.start]), plan.knots.slice(0, shorter.knots.length).map(knot => [knot.id, knot.start]));
  assert.deepEqual(narrower.knots.map(knot => [knot.id, knot.start]), plan.knots.map(knot => [knot.id, knot.start]));
  assert.notEqual(createReadingRailPlan({ ...options, seed: 'another-article' }).knots[0].start, plan.knots[0].start);
  assert.ok(plan.knots[0].start >= 1000 && plan.knots[0].start <= 1600);
  for (let i = 1; i < plan.knots.length; i++) {
    const gap = plan.knots[i].start - plan.knots[i - 1].start;
    assert.ok(gap >= 1600 - 1e-8 && gap <= 2400 + 1e-8);
    assert.notEqual(plan.knots[i].id, plan.knots[i - 1].id);
    if (i > 1) assert.notEqual(plan.knots[i].id, plan.knots[i - 2].id);
  }
});

test('viewport space and article tail leave time to finish without rushing', () => {
  assert.equal(createReadingRailPlan({ ...options, height: 1000 }).knots.length, 0);
  assert.equal(createReadingRailPlan({ ...options, viewportHeight: 500 }).knots.length, 0);
  for (const viewportHeight of [600, 720, 900, 1200]) {
    const p = createReadingRailPlan({ ...options, height: 18000, viewportHeight });
    for (const knot of p.knots) {
      assert.ok(knot.formation >= 240);
      assert.ok(.88 * viewportHeight - knot.height - knot.lead - knot.formation >= options.safeTop + 16 - 1e-8);
      assert.ok(knot.end + knot.lead + knot.formation + 160 <= p.height);
    }
  }
});
