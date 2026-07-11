<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";

// Adapted from the existing Lyrics Card Generator ClickSpark pattern,
// originally inspired by ReactBits.
type Spark = {
  x: number;
  y: number;
  angle: number;
  startTime: number;
  color: string;
  lengthScale: number;
  lineWidth: number;
};

const canvasElement = ref<HTMLCanvasElement | null>(null);
const sparks: Spark[] = [];

let animationFrame = 0;
let motionQuery: MediaQueryList | undefined;
let finePointerQuery: MediaQueryList | undefined;

function resizeCanvas() {
  const canvas = canvasElement.value;
  if (!canvas) return;

  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(window.innerWidth * ratio));
  canvas.height = Math.max(1, Math.round(window.innerHeight * ratio));
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  canvas.getContext("2d")?.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function clearCanvas() {
  const canvas = canvasElement.value;
  const context = canvas?.getContext("2d");
  if (!canvas || !context) return;

  context.clearRect(0, 0, window.innerWidth, window.innerHeight);
}

function stopAnimation() {
  if (animationFrame) window.cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  sparks.splice(0);
  clearCanvas();
}

function drawSparks(timestamp: number) {
  const canvas = canvasElement.value;
  const context = canvas?.getContext("2d");
  if (!canvas || !context) {
    animationFrame = 0;
    return;
  }

  context.clearRect(0, 0, window.innerWidth, window.innerHeight);

  for (let index = sparks.length - 1; index >= 0; index -= 1) {
    const spark = sparks[index];
    const elapsed = timestamp - spark.startTime;
    const duration = 520;

    if (elapsed >= duration) {
      sparks.splice(index, 1);
      continue;
    }

    const progress = elapsed / duration;
    const eased = progress * (2 - progress);
    const distance = eased * 42 * spark.lengthScale;
    const lineLength = 22 * (1 - eased) * spark.lengthScale;
    const x1 = spark.x + distance * Math.cos(spark.angle);
    const y1 = spark.y + distance * Math.sin(spark.angle);
    const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
    const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

    context.save();
    context.globalAlpha = 1 - progress;
    context.strokeStyle = spark.color;
    context.lineWidth = spark.lineWidth;
    context.shadowBlur = 16;
    context.shadowColor = spark.color;
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
    context.restore();
  }

  animationFrame = sparks.length ? window.requestAnimationFrame(drawSparks) : 0;
}

function handlePointerDown(event: PointerEvent) {
  if (
    event.button !== 0 ||
    !event.isPrimary ||
    motionQuery?.matches ||
    !finePointerQuery?.matches
  ) {
    return;
  }

  const themeColor =
    getComputedStyle(document.documentElement).getPropertyValue("--site-accent").trim() ||
    "#315cf4";
  const now = performance.now();
  const sparkCount = 14;
  const nextSparks = Array.from({ length: sparkCount }, (_, index) => ({
    x: event.clientX,
    y: event.clientY,
    angle: (2 * Math.PI * index) / sparkCount,
    startTime: now,
    color: index % 3 === 0 ? "#ffffff" : themeColor,
    lengthScale: index % 2 === 0 ? 1.2 : 0.82,
    lineWidth: index % 3 === 0 ? 2 : 2.8
  }));

  sparks.push(...nextSparks);
  if (sparks.length > 84) sparks.splice(0, sparks.length - 84);
  if (!animationFrame) animationFrame = window.requestAnimationFrame(drawSparks);
}

function handlePreferenceChange() {
  if (motionQuery?.matches || !finePointerQuery?.matches) stopAnimation();
}

onMounted(() => {
  motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  resizeCanvas();

  window.addEventListener("resize", resizeCanvas, { passive: true });
  window.addEventListener("pointerdown", handlePointerDown, { passive: true });
  motionQuery.addEventListener("change", handlePreferenceChange);
  finePointerQuery.addEventListener("change", handlePreferenceChange);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", resizeCanvas);
  window.removeEventListener("pointerdown", handlePointerDown);
  motionQuery?.removeEventListener("change", handlePreferenceChange);
  finePointerQuery?.removeEventListener("change", handlePreferenceChange);
  stopAnimation();
});
</script>

<template>
  <canvas ref="canvasElement" class="click-spark-canvas" aria-hidden="true" />
</template>
