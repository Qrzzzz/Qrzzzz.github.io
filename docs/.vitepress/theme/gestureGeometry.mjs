// A single continuous gesture, composed for each viewport rather than cropped.
export const DESKTOP_GESTURE = [
  [[-25, 160], [158, 23], [356, 16], [424, 114]],
  [[424, 114], [519.2, 251.2], [233, 433], [100, 363]],
  [[100, 363], [-33, 293], [100, 178], [240, 197]],
  [[240, 197], [380, 216], [469, 367], [630, 440]],
  [[630, 440], [791, 513], [869, 483], [1030, 589]]
];
export const MOBILE_GESTURE = [
  [[-32, 113], [122, 17], [355, 46], [285, 220]],
  [[285, 220], [250, 307], [63, 357], [47, 279]],
  [[47, 279], [31, 201], [115, 173], [184, 214]],
  [[184, 214], [253, 255], [236, 410], [312, 457]],
  [[312, 457], [388, 504], [414, 508], [440, 575]]
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

export function nearestPoint(points, x, y) {
  let nearest, distance = Infinity;
  for (const point of points) {
    const d = Math.hypot(point.x - x, point.y - y);
    if (d < distance) { nearest = point; distance = d; }
  }
  return { point: nearest, distance };
}

export function limitPull(x, y, limit) {
  // Smooth resistance at the edge; no hard stop or spring overshoot.
  const length = Math.hypot(x, y);
  const ratio = length ? Math.tanh(length / limit) * limit / length : 0;
  return { x: x * ratio, y: y * ratio };
}

export function deformGesture(points, center, x, y, radius) {
  return points.map(p => {
    const influence = Math.exp(-(((p.distance - center) / radius) ** 2));
    // Anchor both offscreen ends, so the whole line never drifts.
    const t = Math.min(1, p.distance / 140, (points.at(-1).distance - p.distance) / 140);
    const edge = t * t * (3 - 2 * t);
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
  // The first loop recalls the home. Long, quiet turns follow the document.
  const h = Math.max(360, height), w = width;
  // Narrow margins get an open wave, not a horizontally crushed loop.
  if (w < 60) {
    let path = `M${w * .5} -12`;
    for (let y = -12; y < h; y += 640) {
      path += ` C${w * .9} ${y + 105} ${w * .9} ${y + 215} ${w * .5} ${y + 320} C${w * .1} ${y + 425} ${w * .1} ${y + 535} ${w * .5} ${y + 640}`;
    }
    return path;
  }
  let path = `M${w * .18} -12 C${w * 1.12} 65 ${w * .88} 235 ${w * .4} 214 C${w * -.22} 187 ${w * .09} 83 ${w * .5} 145 C${w * .83} 210 ${w * .68} 340 ${w * .48} 420`;
  for (let y = 420; y < h + 500; y += 920) {
    path += ` C${w * -.08} ${y + 140} ${w * .94} ${y + 285} ${w * .54} ${y + 460} C${w * .12} ${y + 610} ${w * .84} ${y + 780} ${w * .48} ${y + 920}`;
  }
  return path;
}
