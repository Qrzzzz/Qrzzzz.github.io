// Compose the sweep in viewport space; the loop keeps its own uniform scale.
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const subtract = (a, b) => [a[0] - b[0], a[1] - b[1]];
const multiply = (a, n) => [a[0] * n, a[1] * n];

export function gestureSegments(width, height, mobile = width <= 680) {
  const scale = mobile ? clamp(width / 390, .85, 1.12) : clamp(Math.min(width / 1000, height / 620), .78, 1.3);
  const center = mobile ? [width * .24, height - 105 * scale] : [width * .35, height * .66];
  const tilt = mobile ? .15 : .18;
  const c = mobile ? 18 : 33, a = mobile ? 55 : 90, b = mobile ? 34 : 46;
  const rotate = ([x, y]) => [(x * Math.cos(tilt) - y * Math.sin(tilt)) * scale, (x * Math.sin(tilt) + y * Math.cos(tilt)) * scale];
  const position = t => add(center, rotate([c * t - a * Math.sin(t), b * (1 - Math.cos(t))]));
  const tangent = t => rotate([c - a * Math.cos(t), b * Math.sin(t)]);
  // A prolate loop crosses itself with distinct tangents, instead of touching a circle.
  const loop = [];
  for (let i = 0; i < 8; i++) {
    const t0 = -Math.PI + i * Math.PI / 4, t1 = t0 + Math.PI / 4;
    const start = position(t0), end = position(t1), step = (t1 - t0) / 3;
    loop.push([start, add(start, multiply(tangent(t0), step)), subtract(end, multiply(tangent(t1), step)), end]);
  }
  const first = loop[0], last = loop.at(-1);
  // Mirror the first two handles to carry tangent and curvature into the loop.
  const entryEndHandle = subtract(multiply(first[0], 2), first[1]);
  const entryStartHandle = add(subtract(first[2], multiply(first[1], 4)), multiply(first[0], 4));
  const shoulder = mobile ? [22 * scale, height * .66] : [width * .14, height * .52];
  const shoulderHandle = subtract(shoulder, multiply(subtract(entryStartHandle, shoulder), .6));
  const exitStartHandle = subtract(multiply(last[3], 2), last[2]);
  const exitEndHandle = add(subtract(last[1], multiply(last[2], 4)), multiply(last[3], 4));
  const tail = mobile ? [width * .65, height - 30 * scale] : [width * .68, height * .87];
  return [
    [mobile ? [-30 * scale, height * .15] : [-width * .06, height * .12],
      mobile ? [-5 * scale, height * .33] : [-width * .01, height * .24], shoulderHandle, shoulder],
    [shoulder, entryStartHandle, entryEndHandle, first[0]],
    ...loop,
    [last[3], exitStartHandle, exitEndHandle, tail],
    [tail, add(tail, multiply(subtract(tail, exitEndHandle), .65)),
      mobile ? [width * .95, height - 74 * scale] : [width * .95, height * .85],
      mobile ? [width + 50 * scale, height - 90 * scale] : [width * 1.08, height * .78]]
  ];
}

export const DESKTOP_GESTURE = gestureSegments(1000, 620, false);
export const MOBILE_GESTURE = gestureSegments(390, 575, true);

export function gesturePath(segments) {
  const xy = p => p.map(value => Number(value.toFixed(2))).join(' ');
  return 'M' + xy(segments[0][0]) + ' ' + segments.map(s => 'C' + s.slice(1).map(xy).join(' ')).join(' ');
}

export function sampleGesture(width, height, mobile = width <= 680) {
  const segments = gestureSegments(width, height, mobile);
  const points = [];
  let distance = 0;
  segments.forEach((s, segment) => {
    for (let step = segment ? 1 : 0; step <= 48; step++) {
      const t = step / 48, u = 1 - t;
      const weights = [u ** 3, 3 * u * u * t, 3 * u * t * t, t ** 3];
      const x = s.reduce((sum, p, i) => sum + p[0] * weights[i], 0);
      const y = s.reduce((sum, p, i) => sum + p[1] * weights[i], 0);
      const previous = points.at(-1);
      if (previous) distance += Math.hypot(x - previous.x, y - previous.y);
      points.push({ x, y, distance });
    }
  });
  return points;
}

export function projectOnGesture(points, x, y) {
  let best = null;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const vx = b.x - a.x, vy = b.y - a.y;
    const lengthSquared = vx * vx + vy * vy;
    const t = lengthSquared
      ? Math.max(0, Math.min(1, ((x - a.x) * vx + (y - a.y) * vy) / lengthSquared))
      : 0;
    const px = a.x + vx * t, py = a.y + vy * t;
    const distance = Math.hypot(px - x, py - y);
    if (!best || distance < best.distance) {
      best = {
        point: { x: px, y: py },
        distance,
        arcLength: a.distance + (b.distance - a.distance) * t,
        segment: i - 1,
        t
      };
    }
  }
  return best ?? { point: points[0], distance: Infinity, arcLength: points[0]?.distance ?? 0, segment: 0, t: 0 };
}

export function limitPull(x, y, limit) {
  // Keep the first half of the pull 1:1, then compress only the excess.
  // This removes the "rubber wall" feeling close to the grab point while
  // still giving large throws a finite, smooth travel.
  const length = Math.hypot(x, y);
  if (!length) return { x: 0, y: 0 };
  const knee = limit * .54;
  if (length <= knee) return { x, y };
  const room = limit - knee;
  const easedLength = knee + room * (1 - Math.exp(-(length - knee) / room));
  const ratio = easedLength / length;
  return { x: x * ratio, y: y * ratio };
}

function smootherstep01(value) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function deformationKernel(distance, radius) {
  return 1 - smootherstep01(distance / radius);
}

export function deformGesture(points, center, x, y, radius) {
  const total = points.at(-1)?.distance ?? 0;
  const localRadius = radius;
  const broadRadius = radius * 2.3;
  return points.map(p => {
    const ds = Math.abs(p.distance - center);
    // A narrow field keeps the grabbed material responsive while a broader field
    // carries some motion into the surrounding stroke, avoiding a visible "bump".
    const influence = .4 * deformationKernel(ds, localRadius) + .6 * deformationKernel(ds, broadRadius);
    // The only true constraints live at the off-canvas ends of the authored gesture.
    // Their fade is intentionally broad so no fixed point is perceptible in the viewport.
    const edgeDistance = Math.min(p.distance, total - p.distance);
    const edge = smootherstep01(edgeDistance / Math.max(220, radius * 1.6));
    return { x: p.x + x * influence * edge, y: p.y + y * influence * edge };
  });
}

export function pointsPath(points) {
  if (!points.length) return '';
  points = points.filter((_, i) => i % 4 === 0 || i === points.length - 1);
  const xy = p => [p.x.toFixed(2), p.y.toFixed(2)].join(' ');
  let path = `M${xy(points[0])}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const before = points[Math.max(0, i - 2)], after = points[Math.min(points.length - 1, i + 1)];
    path += ` C${xy({ x: a.x + (b.x - before.x) / 6, y: a.y + (b.y - before.y) / 6 })} ${xy({ x: b.x - (after.x - a.x) / 6, y: b.y - (after.y - a.y) / 6 })} ${xy(b)}`;
  }
  return path;
}

export function readingGesture(height, width) {
  // A monotone vertical wave: clipping at y always corresponds to document y.
  let path = `M${width * .5} 0`;
  for (let y = 0; y < height; y += 960) {
    path += ` C${width * .9} ${y + 160} ${width * .9} ${y + 320} ${width * .5} ${y + 480} C${width * .1} ${y + 640} ${width * .1} ${y + 800} ${width * .5} ${y + 960}`;
  }
  return path;
}
