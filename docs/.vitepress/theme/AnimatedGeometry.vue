<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

type Point = {
  x: number;
  y: number;
};

const vertexCount = 9;
const seed = [0.18, -0.12, 0.09, -0.2, 0.14, -0.06, 0.22, -0.16, 0.04];
const ringSize = [
  [276, 194],
  [184, 126],
  [92, 62]
] as const;

function makeRings(time: number) {
  return ringSize.map(([radiusX, radiusY], ringIndex) => {
    const centerX = 360 + Math.sin(time * (0.17 + ringIndex * 0.025) + ringIndex) * 10;
    const centerY = 250 + Math.cos(time * (0.13 + ringIndex * 0.02) + ringIndex) * 8;

    return Array.from({ length: vertexCount }, (_, index): Point => {
      const phase = index * 0.83 + ringIndex * 1.7;
      const angle =
        -Math.PI / 2 +
        (index / vertexCount) * Math.PI * 2 +
        seed[index] * (0.36 - ringIndex * 0.06) +
        Math.sin(time * (0.16 + ringIndex * 0.025) + phase) * 0.055;
      const pulse =
        1 +
        seed[(index + ringIndex * 2) % vertexCount] * 0.34 +
        Math.sin(time * (0.21 + index * 0.006) + phase) * (0.075 + ringIndex * 0.012);

      return {
        x: centerX + Math.cos(angle) * radiusX * pulse,
        y: centerY + Math.sin(angle) * radiusY * pulse
      };
    });
  });
}

function pointsAttribute(points: Point[]) {
  const closed = [...points, points[0]];
  return closed.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
}

const rings = ref(makeRings(0));
let animationFrame = 0;
let reduceMotionQuery: MediaQueryList | undefined;
let lastDraw = 0;

function draw(timestamp: number) {
  if (timestamp - lastDraw >= 40) {
    rings.value = makeRings(timestamp / 1000);
    lastDraw = timestamp;
  }
  animationFrame = window.requestAnimationFrame(draw);
}

function stopAnimation() {
  if (!animationFrame) return;
  window.cancelAnimationFrame(animationFrame);
  animationFrame = 0;
}

function syncMotionPreference() {
  stopAnimation();
  if (reduceMotionQuery?.matches) {
    rings.value = makeRings(0);
    return;
  }
  animationFrame = window.requestAnimationFrame(draw);
}

function syncVisibility() {
  if (document.hidden) stopAnimation();
  else syncMotionPreference();
}

onMounted(() => {
  reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  reduceMotionQuery.addEventListener("change", syncMotionPreference);
  document.addEventListener("visibilitychange", syncVisibility);
  syncMotionPreference();
});

onBeforeUnmount(() => {
  stopAnimation();
  reduceMotionQuery?.removeEventListener("change", syncMotionPreference);
  document.removeEventListener("visibilitychange", syncVisibility);
});
</script>

<template>
  <div class="animated-geometry">
    <svg viewBox="0 0 720 500" role="presentation" focusable="false">
      <g class="geometry-orbits">
        <ellipse cx="360" cy="250" rx="304" ry="214" />
        <ellipse cx="360" cy="250" rx="138" ry="222" transform="rotate(58 360 250)" />
      </g>

      <g class="geometry-spokes">
        <line
          v-for="(_, index) in rings[0]"
          :key="`spoke-${index}`"
          :x1="rings[0][index].x"
          :y1="rings[0][index].y"
          :x2="rings[2][index].x"
          :y2="rings[2][index].y"
        />
      </g>

      <g class="geometry-rings">
        <polyline
          v-for="(ring, index) in rings"
          :key="`ring-${index}`"
          :class="`geometry-ring geometry-ring-${index + 1}`"
          :points="pointsAttribute(ring)"
        />
      </g>

      <g class="geometry-nodes">
        <circle
          v-for="(point, index) in rings[0]"
          :key="`node-${index}`"
          :cx="point.x"
          :cy="point.y"
          :r="index % 3 === 0 ? 4.5 : 2.5"
        />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.animated-geometry {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  color: var(--site-text);
}

.animated-geometry::before,
.animated-geometry::after {
  position: absolute;
  z-index: 1;
  width: 7px;
  height: 7px;
  border-color: currentColor;
  content: "";
  opacity: 0.55;
}

.animated-geometry::before {
  top: 18px;
  left: 18px;
  border-top: 1px solid;
  border-left: 1px solid;
}

.animated-geometry::after {
  right: 18px;
  bottom: 18px;
  border-right: 1px solid;
  border-bottom: 1px solid;
}

svg {
  display: block;
  width: 100%;
  height: 100%;
}

ellipse,
line,
polyline,
circle {
  vector-effect: non-scaling-stroke;
}

ellipse,
line,
polyline {
  fill: none;
  stroke: currentColor;
}

.geometry-orbits {
  opacity: 0.16;
}

.geometry-orbits ellipse {
  stroke-width: 1px;
  stroke-dasharray: 2 9;
}

.geometry-spokes {
  opacity: 0.22;
}

.geometry-spokes line {
  stroke-width: 1px;
}

.geometry-ring {
  stroke-linecap: round;
  stroke-linejoin: round;
}

.geometry-ring-1 {
  opacity: 0.86;
  stroke-width: 1.35px;
}

.geometry-ring-2 {
  opacity: 0.62;
  stroke-width: 1.1px;
}

.geometry-ring-3 {
  opacity: 0.92;
  stroke-width: 1.5px;
}

.geometry-nodes {
  fill: var(--site-canvas);
  stroke: currentColor;
  stroke-width: 1px;
}

@media (max-width: 767px) {
  .animated-geometry::before,
  .animated-geometry::after {
    display: none;
  }
}
</style>
