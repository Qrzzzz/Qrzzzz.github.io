// A single continuous gesture, composed for each viewport rather than cropped.
export const DESKTOP_GESTURE = [
  [[-262.9, 338.1], [-179.18, 275.44], [-89.05, 207.95], [-25, 160]],
  [[-25, 160], [158, 23], [356, 16], [424, 114]],
  [[424, 114], [519.2, 251.2], [233, 433], [100, 363]],
  [[100, 363], [-33, 293], [100, 178], [240, 197]],
  [[240, 197], [380, 216], [469, 367], [630, 440]],
  [[630, 440], [791, 513], [869, 483], [1030, 589]],
  [[1030, 589], [1086.35, 626.1], [1190.65, 694.8], [1287.6, 758.6]]
];
export const MOBILE_GESTURE = [
  [[-247.6, 247.4], [-171.14, 199.73], [-85.9, 146.6], [-32, 113]],
  [[-32, 113], [122, 17], [355, 46], [285, 220]],
  [[285, 220], [250, 307], [63, 357], [47, 279]],
  [[47, 279], [31, 201], [115, 173], [184, 214]],
  [[184, 214], [253, 255], [236, 410], [312, 457]],
  [[312, 457], [388, 504], [414, 508], [440, 575]],
  [[440, 575], [449.1, 598.45], [485.5, 692.25], [505, 742.5]]
];

export function gesturePath(segments) {
  return `M${segments[0][0].join(' ')} ` + segments.map(s => `C${s.slice(1).flat().join(' ')}`).join(' ');
}

export function sampleGesture(width, height, mobile = width <= 680) {
  const segments = mobile ? MOBILE_GESTURE : DESKTOP_GESTURE;
  const scaleX = width / (mobile ? 390 : 1000);
  const scaleY = height / (mobile ? 575 : 620);
  const points = [];
  let distance = 0;
  segments.forEach((s, segment) => {
    for (let step = segment ? 1 : 0; step <= 48; step++) {
      const t = step / 48, u = 1 - t;
      const weights = [u ** 3, 3 * u * u * t, 3 * u * t * t, t ** 3];
      const x = s.reduce((sum, p, i) => sum + p[0] * weights[i], 0) * scaleX;
      const y = s.reduce((sum, p, i) => sum + p[1] * weights[i], 0) * scaleY;
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
  // Smooth resistance at the edge; no hard stop or spring overshoot.
  const length = Math.hypot(x, y);
  const ratio = length ? Math.tanh(length / limit) * limit / length : 0;
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
  const localRadius = radius * .72;
  const broadRadius = radius * 2.45;
  return points.map(p => {
    const ds = Math.abs(p.distance - center);
    // A narrow field keeps the grabbed material responsive while a broader field
    // carries some motion into the surrounding stroke, avoiding a visible "bump".
    const influence = .76 * deformationKernel(ds, localRadius) + .24 * deformationKernel(ds, broadRadius);
    // The only true constraints live at the off-canvas ends of the authored gesture.
    // Their fade is intentionally broad so no fixed point is perceptible in the viewport.
    const edgeDistance = Math.min(p.distance, total - p.distance);
    const edge = smootherstep01(edgeDistance / Math.max(220, radius * 1.6));
    return { x: p.x + x * influence * edge, y: p.y + y * influence * edge };
  });
}

export function pointsPath(points) {
  if (!points.length) return '';
  const xy = p => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
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
