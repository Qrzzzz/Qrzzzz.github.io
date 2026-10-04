// Reading position is a document y coordinate, never an ink-length budget.
export const READING_RAIL_TIP_RATIO = .88;

export const READING_RAIL_MOTIFS = [
  { id: 'loose-loop', weight: 4, kind: 'single', c: [[0,25,-.8,28,-.8,56],[-.8,90,.85,93,.85,58],[.85,30,-.6,35,-.6,76],[-.6,111,0,129,0,180]] },
  { id: 'long-loop', weight: 4, kind: 'single', c: [[0,20,-.5,37,-.5,66],[-.5,130,.52,138,.52,77],[.52,40,-.45,42,-.45,97],[-.45,140,0,149,0,180]] },
  { id: 'slanted-loop', weight: 4, kind: 'single', c: [[0,25,-.92,28,-.78,56],[-.63,86,.92,113,.92,73],[.92,37,-.55,27,-.55,59],[-.55,93,0,126,0,180]] },
  { id: 'teardrop-loop', weight: 4, kind: 'single', c: [[0,25,.86,40,.88,74],[.93,113,-.91,114,-.88,77],[-.84,46,-.24,43,.31,60],[.83,77,0,127,0,180]] },
  { id: 'hairpin-loop', weight: 4, kind: 'single', c: [[0,26,-.76,25,-.76,71],[-.76,120,.74,113,.74,76],[.74,39,.24,49,.24,86],[.24,121,0,136,0,180]] },
  { id: 'flat-loop', weight: 4, kind: 'single', c: [[0,32,-.95,49,-.95,73],[-.95,96,.95,98,.95,74],[.95,53,-.55,54,-.55,89],[-.55,122,0,130,0,180]] },
  { id: 'double-loop', weight: 3, kind: 'double', c: [[0,16,-.88,17,-.88,42],[-.88,70,.6,73,.6,43],[.6,22,-.35,26,-.35,67],[-.35,91,.85,85,.85,113],[.85,146,-.7,142,-.7,112],[-.7,89,0,126,0,180]] },
  { id: 'offset-double', weight: 3, kind: 'double', c: [[0,22,-.95,18,-.95,47],[-.95,80,.24,77,.24,46],[.24,24,-.58,47,-.28,86],[.1,105,.93,81,.93,118],[.93,150,-.18,148,-.18,120],[-.18,99,0,140,0,180]] },
  { id: 'figure-eight', weight: 2, kind: 'double', c: [[0,24,-.86,24,-.86,48],[-.86,83,.85,73,.85,49],[.85,19,-.45,54,0,90],[.45,124,-.86,110,-.86,133],[-.86,160,.86,161,.86,132],[.86,99,0,151,0,180]] },
  { id: 'butterfly', weight: 2, kind: 'double', c: [[0,27,-.95,25,-.95,62],[-.95,103,.83,71,.83,54],[.83,28,-.45,67,0,94],[.45,121,.92,112,.92,133],[.92,166,-.9,149,-.9,118],[-.9,96,0,141,0,180]] },
  { id: 'inward-coil', weight: 2, kind: 'coil', c: [[0,21,-.91,21,-.91,68],[-.91,117,.91,120,.91,71],[.91,32,-.46,32,-.46,75],[-.46,106,.43,106,.43,77],[.43,54,-.04,61,-.04,94],[-.04,119,0,143,0,180]] },
  { id: 'open-turn', weight: 4, kind: 'single', c: [[0,24,-.95,26,-.95,65],[-.95,104,.82,104,.82,66],[.82,40,-.17,47,-.17,78],[-.17,108,.65,105,.65,134],[.65,159,0,155,0,180]] }
];

const clamp = value => Math.max(0, Math.min(1, value));
const mix = (a, b, t) => a + (b - a) * t;
const pointMix = (a, b, t) => a.map((value, i) => mix(value, b[i], t));
const format = point => point.map(value => Number(value.toFixed(3))).join(' ');
const commands = segments => segments.map(segment => ` C${segment.slice(1).map(format).join(' ')}`).join('');

function randomFor(seed) {
  let value = 2166136261;
  for (const character of String(seed)) value = Math.imul(value ^ character.charCodeAt(0), 16777619);
  return () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
}

function pickMotif(random, recent) {
  const candidates = READING_RAIL_MOTIFS.filter(motif => !recent.includes(motif.id));
  let choice = random() * candidates.reduce((total, motif) => total + motif.weight, 0);
  for (const motif of candidates) {
    choice -= motif.weight;
    if (choice < 0) return motif;
  }
  return candidates.at(-1);
}

// A shared handle on each side of a join gives C1 continuity in every pose.
function segmentsFor(points, handles) {
  return points.slice(1).map((point, index) => [
    points[index],
    points[index].map((value, axis) => value + handles[index][axis]),
    point.map((value, axis) => value - handles[index + 1][axis]),
    point
  ]);
}

function boundedHandle(point, vector, width, height) {
  const length = Math.hypot(...vector);
  if (!length) return [0, 0];
  const direction = vector.map(value => value / length);
  let room = length;
  if (Math.abs(direction[0]) > 1e-9) room = Math.min(room, (width / 2 - 2 - Math.abs(point[0])) / Math.abs(direction[0]));
  if (Math.abs(direction[1]) > 1e-9) room = Math.min(room, Math.min(point[1], height - point[1]) / Math.abs(direction[1]));
  return direction.map(value => value * Math.max(0, room));
}

function createPoses(motif, width, height, mirror, amplitude) {
  const targetPoints = [[0, 0], ...motif.c.map(c => [c[4] * width * .41 * amplitude * mirror, c[5] * height / 180])];
  const count = motif.c.length;
  const cap = height * .1;
  const targetHandles = targetPoints.map((point, i) => {
    if (i === 0 || i === count) return [0, cap];
    const before = motif.c[i - 1], after = motif.c[i];
    const vector = [(after[0] - before[2]) * width * .41 * amplitude * mirror / 2, (after[1] - before[3]) * height / 360];
    return boundedHandle(point, vector, width, height);
  });
  const sourcePoints = targetPoints.map((_, i) => [0, i * height / count]);
  const sourceHandles = targetPoints.map((_, i) => [0, i === 0 || i === count ? cap : height / count / 3]);
  // A loop must acquire its winding before it grows. Perform that topology change
  // under the stroke's pixel width, then enlarge an already rounded loop instead
  // of introducing a conspicuous cusp halfway through the visible deformation.
  const tiny = .015;
  const collapsedPoints = targetPoints.map((point, i) => i === 0 || i === count ? point : [point[0] * tiny, height / 2 + (point[1] - height / 2) * tiny]);
  const collapsedHandles = targetHandles.map((handle, i) => i === 0 || i === count ? handle : handle.map(value => value * tiny));
  return [segmentsFor(sourcePoints, sourceHandles), segmentsFor(collapsedPoints, collapsedHandles), segmentsFor(targetPoints, targetHandles)];
}

export function readingRailKnotSegments(knot, progress) {
  const t = clamp(progress);
  const smooth = value => { const p = clamp(value); return p * p * p * (p * (p * 6 - 15) + 10); };
  return knot.poses[0].map((segment, i) => segment.map((point, j) => {
    const node = j < 2 ? i : i + 1;
    const delayed = knot.kind === 'double' && node > knot.poses[0].length / 2;
    const grow = (t - .12) / .88;
    const amount = t <= .12 ? smooth(t / .12) : smooth(delayed ? (grow - .08) / .92 : grow);
    const from = knot.poses[t <= .12 ? 0 : 1][i][j], to = knot.poses[t <= .12 ? 1 : 2][i][j];
    return pointMix(from, to, amount).map((value, axis) => value + (axis === 0 ? knot.width / 2 : knot.start));
  }));
}

export function readingRailKnotProgress(knot, position) {
  const t = clamp((position - knot.end - knot.lead) / knot.formation);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function wave(from, to, width, firstHandle, lastHandle, sign) {
  const length = to - from;
  if (length <= 0) return '';
  const count = Math.max(1, Math.round(length / 720)), span = length / count;
  const center = width / 2;
  let path = '';
  for (let i = 0; i < count; i++) {
    const y = from + span * i, handle = span / 6;
    const points = [[center, y], [center + width * .25 * sign, y + span / 2], [center, y + span]];
    path += commands(segmentsFor(points, [[0, i === 0 ? Math.min(firstHandle ?? handle, span / 3) : handle], [0, handle], [0, i === count - 1 ? Math.min(lastHandle ?? handle, span / 3) : handle]]));
    sign *= -1;
  }
  return path;
}

export function createReadingRailPlan({ height, width, viewportHeight, safeTop = 96, seed = '' }) {
  const random = randomFor(seed), recent = [], knots = [], parts = [];
  const budget = READING_RAIL_TIP_RATIO * viewportHeight - safeTop - 16;
  let start = 1000 + random() * 600;
  while (start < height) {
    const motif = pickMotif(random, recent);
    recent.push(motif.id); if (recent.length > 2) recent.shift();
    const desiredHeight = (motif.kind === 'single' ? 140 : 180) + random() * 40;
    const desiredFormation = (motif.kind === 'single' ? 320 : 380) + random() * 60;
    const mirror = random() < .5 ? -1 : 1, amplitude = .9 + random() * .1;
    const minimumHeight = motif.kind === 'single' ? 104 : 144;
    const minimumFormation = motif.kind === 'single' ? 240 : motif.kind === 'coil' ? 320 : 300;
    const lead = 64;
    const knotHeight = Math.min(desiredHeight, budget - lead - minimumFormation);
    const formation = Math.min(desiredFormation, budget - lead - knotHeight);
    const end = start + knotHeight;
    if (knotHeight >= minimumHeight && formation >= minimumFormation && end + lead + formation + 160 <= height) {
      const knot = { id: motif.id, kind: motif.kind, start, end, height: knotHeight, width, lead, formation, poses: createPoses(motif, width, knotHeight, mirror, amplitude) };
      knots.push(knot);
    }
    start += 1600 + random() * 800;
  }
  let from = 0, previousHandle, sign = 1;
  for (const knot of knots) {
    parts.push(wave(from, knot.start, width, previousHandle, knot.height * .1, sign));
    parts.push({ knot, flat: commands(readingRailKnotSegments(knot, 0)), complete: commands(readingRailKnotSegments(knot, 1)) });
    from = knot.end; previousHandle = knot.height * .1; sign *= -1;
  }
  parts.push(wave(from, height, width, previousHandle, undefined, sign));
  return { height, width, knots, parts, cachedKey: '', cachedPath: '' };
}

export function readingRailPath(plan, position) {
  const progresses = plan.knots.map(knot => readingRailKnotProgress(knot, position));
  const key = progresses.map(value => value.toFixed(6)).join(',');
  if (plan.cachedPath && key === plan.cachedKey) return plan.cachedPath;
  let index = 0;
  plan.cachedPath = `M${plan.width / 2} 0` + plan.parts.map(part => {
    if (typeof part === 'string') return part;
    const progress = progresses[index++];
    return progress === 0 ? part.flat : progress === 1 ? part.complete : commands(readingRailKnotSegments(part.knot, progress));
  }).join('');
  plan.cachedKey = key;
  return plan.cachedPath;
}
