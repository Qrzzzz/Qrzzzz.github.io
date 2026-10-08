// A single continuous gesture, composed for each viewport rather than cropped.
export const DESKTOP_GESTURE = [
  [[8, -120], [8, -80], [8, -40], [8, 0]],
  [[8, 0], [8, 40], [12, 100], [28, 160]],
  [[28, 160], [44, 220], [60, 280], [100, 340]],
  [[100, 340], [140, 400], [180, 440], [240, 470]],
  [[240, 470], [300, 500], [320, 510], [360, 530]],
  [[360, 530], [420, 560], [440, 490], [380, 460]],
  [[380, 460], [320, 430], [300, 500], [360, 530]],
  [[360, 530], [420, 560], [440, 550], [480, 558]],
  [[480, 558], [580, 578], [780, 600], [900, 580]],
  [[900, 580], [1020, 560], [1080, 548], [1200, 528]]
];
export const MOBILE_GESTURE = [
  [[7, -60], [7, -40], [7, -20], [7, 0]],
  [[7, 0], [7, 20], [8, 120], [9, 160]],
  [[9, 160], [10, 200], [10, 280], [12, 320]],
  [[12, 320], [14, 360], [15, 420], [25, 460]],
  [[25, 460], [35, 500], [50, 530], [90, 545]],
  [[90, 545], [130, 560], [150, 555], [170, 560]],
  [[170, 560], [198, 567], [218, 555], [190, 548]],
  [[190, 548], [162, 541], [142, 553], [170, 560]],
  [[170, 560], [198, 567], [235, 570], [285, 564]],
  [[285, 564], [335, 558], [395, 545], [445, 539]]
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
