<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from "vue";

interface Particle {
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  size: number;
  color: string;
  seed: number;
  depth: number;
  delay: number;
}

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

const props = withDefaults(
  defineProps<{
    text: string;
    particleSize?: number;
    density?: number;
    scatter?: number;
    gatherDuration?: number;
    stagger?: number;
    pointerRepel?: number;
    repelRadius?: number;
    idleDrift?: number;
  }>(),
  {
    particleSize: 1.7,
    density: 4,
    scatter: 150,
    gatherDuration: 1450,
    stagger: 360,
    pointerRepel: 34,
    repelRadius: 112,
    idleDrift: 0.5
  }
);

const container = ref<HTMLElement>();
const canvas = ref<HTMLCanvasElement>();
const ready = ref(false);
const lines = props.text.split("\n");

let particles: Particle[] = [];
let animationFrame: number | null = null;
let resizeFrame: number | null = null;
let buildId = 0;
let gathering = false;
let gatherStart = 0;
let reducedMotion = false;
let inView = true;
let pageVisible = true;
let width = 0;
let height = 0;
let resizeObserver: ResizeObserver | undefined;
let intersectionObserver: IntersectionObserver | undefined;
let themeObserver: MutationObserver | undefined;
let reduceMotionQuery: MediaQueryList | undefined;

const pointer = {
  active: false,
  x: 0,
  y: 0,
  smoothX: 0,
  smoothY: 0
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum);

const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);

function parseColor(value: string): RgbColor | null {
  const color = value.trim();
  const hex = color.match(/^#([\da-f]{6})$/i)?.[1];
  if (hex) {
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16)
    };
  }

  const rgb = color.match(/^rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)/i);
  return rgb
    ? {
        r: Number(rgb[1]),
        g: Number(rgb[2]),
        b: Number(rgb[3])
      }
    : null;
}

function mixColor(from: RgbColor, to: RgbColor, amount: number) {
  const mix = (start: number, end: number) => Math.round(start + (end - start) * amount);
  return `rgb(${mix(from.r, to.r)}, ${mix(from.g, to.g)}, ${mix(from.b, to.b)})`;
}

async function waitForFont(font: string) {
  if (!("fonts" in document)) return;
  try {
    await document.fonts.load(font);
  } catch {
    // The canvas still has a system-font fallback.
  }
  await document.fonts.ready;
}

function startGather(fromScatter = true) {
  if (!particles.length) return;
  const spread = reducedMotion ? 0 : props.scatter;

  particles.forEach((particle) => {
    if (fromScatter) {
      const angle = particle.seed * Math.PI * 2;
      const distance = spread * (0.35 + particle.depth * 0.75);
      particle.x = particle.targetX + Math.cos(angle) * distance;
      particle.y = particle.targetY + Math.sin(angle) * distance;
    }
    particle.startX = particle.x;
    particle.startY = particle.y;
    particle.delay = reducedMotion ? 0 : particle.seed * props.stagger;
  });

  gatherStart = performance.now();
  gathering = !reducedMotion;
}

function draw(now: number) {
  const context = canvas.value?.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, width, height);

  if (!reducedMotion) {
    context.shadowBlur = props.particleSize * 2.4;
    context.shadowColor = getComputedStyle(container.value!).getPropertyValue("--site-accent").trim();
  }

  pointer.smoothX += (pointer.x - pointer.smoothX) * 0.18;
  pointer.smoothY += (pointer.y - pointer.smoothY) * 0.18;
  let complete = true;

  particles.forEach((particle) => {
    let baseX = particle.targetX;
    let baseY = particle.targetY;
    let progress = 1;

    if (gathering) {
      const local =
        (now - gatherStart - particle.delay) /
        Math.max(1, reducedMotion ? 1 : props.gatherDuration);
      progress = clamp(local, 0, 1);
      const eased = easeOutCubic(progress);
      baseX = particle.startX + (particle.targetX - particle.startX) * eased;
      baseY = particle.startY + (particle.targetY - particle.startY) * eased;
      if (progress < 1) complete = false;
    } else if (!reducedMotion && props.idleDrift > 0) {
      const driftTime = now * 0.001;
      baseX += Math.sin(driftTime * 0.9 + particle.seed * 10) * props.idleDrift * particle.depth;
      baseY += Math.cos(driftTime * 0.74 + particle.depth * 10) * props.idleDrift * particle.depth;
    }

    if (pointer.active && !reducedMotion && props.pointerRepel > 0) {
      const deltaX = baseX - pointer.smoothX;
      const deltaY = baseY - pointer.smoothY;
      const distance = Math.hypot(deltaX, deltaY);
      if (distance > 0 && distance < props.repelRadius) {
        const force = Math.pow(1 - distance / props.repelRadius, 2) * props.pointerRepel;
        baseX += (deltaX / distance) * force;
        baseY += (deltaY / distance) * force;
      }
    }

    const follow = reducedMotion ? 1 : 0.22;
    particle.x += (baseX - particle.x) * follow;
    particle.y += (baseY - particle.y) * follow;
    context.globalAlpha = clamp(0.35 + progress * 0.65, 0, 1);
    context.fillStyle = particle.color;

    if (particle.size <= 2.1) {
      context.fillRect(
        particle.x - particle.size / 2,
        particle.y - particle.size / 2,
        particle.size,
        particle.size
      );
    } else {
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size / 2, 0, Math.PI * 2);
      context.fill();
    }
  });

  context.globalAlpha = 1;
  context.shadowBlur = 0;
  if (gathering && complete) gathering = false;
}

function render(now: number) {
  animationFrame = null;
  draw(now);
  if (inView && pageVisible && !reducedMotion) ensureRenderLoop();
}

function ensureRenderLoop() {
  if (animationFrame === null && inView && pageVisible && !reducedMotion) {
    animationFrame = window.requestAnimationFrame(render);
  }
}

async function sampleText() {
  const element = container.value;
  const targetCanvas = canvas.value;
  if (!element || !targetCanvas) return;
  const context = targetCanvas.getContext("2d");
  if (!context) return;

  const currentBuild = ++buildId;
  const rect = element.getBoundingClientRect();
  width = Math.floor(rect.width);
  height = Math.floor(rect.height);
  if (width <= 0 || height <= 0) return;

  const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  targetCanvas.width = Math.max(1, Math.floor(width * devicePixelRatio));
  targetCanvas.height = Math.max(1, Math.floor(height * devicePixelRatio));
  targetCanvas.style.width = "100%";
  targetCanvas.style.height = "100%";
  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

  const computed = window.getComputedStyle(element);
  const fontFamily = computed.fontFamily || "sans-serif";
  const fontWeight = computed.fontWeight || "720";
  let fontSize = Number.parseFloat(computed.fontSize) || 96;
  let font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  await waitForFont(font);
  if (currentBuild !== buildId) return;

  const offscreen = document.createElement("canvas");
  const offscreenContext = offscreen.getContext("2d", { willReadFrequently: true });
  if (!offscreenContext) return;
  offscreenContext.font = font;

  const maxTextWidth = width * 0.94;
  let measuredWidths = lines.map((line) => offscreenContext.measureText(line || " ").width);
  const widestLine = Math.max(...measuredWidths, 1);
  if (widestLine > maxTextWidth) {
    fontSize = Math.max(18, fontSize * (maxTextWidth / widestLine));
    font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    await waitForFont(font);
    if (currentBuild !== buildId) return;
    offscreenContext.font = font;
    measuredWidths = lines.map((line) => offscreenContext.measureText(line || " ").width);
  }

  const lineHeight = fontSize * 0.9;
  const padding = Math.max(12, Math.ceil(fontSize * 0.09));
  const textWidth = Math.ceil(Math.max(...measuredWidths, 1));
  const textHeight = Math.ceil(fontSize + lineHeight * Math.max(0, lines.length - 1));
  offscreen.width = textWidth + padding * 2;
  offscreen.height = textHeight + padding * 2;
  offscreenContext.clearRect(0, 0, offscreen.width, offscreen.height);
  offscreenContext.font = font;
  offscreenContext.textAlign = "left";
  offscreenContext.textBaseline = "alphabetic";
  offscreenContext.fillStyle = "#ffffff";

  lines.forEach((line, index) => {
    offscreenContext.fillText(line || " ", padding, padding + fontSize * 0.79 + index * lineHeight);
  });

  const imageData = offscreenContext.getImageData(0, 0, offscreen.width, offscreen.height);
  const targets: Array<{ x: number; y: number; alpha: number }> = [];
  const step = Math.max(2, Math.floor(props.density));
  const originX = 0;
  const originY = height / 2 - offscreen.height / 2;

  for (let y = 0; y < offscreen.height; y += step) {
    for (let x = 0; x < offscreen.width; x += step) {
      const alpha = imageData.data[(y * offscreen.width + x) * 4 + 3];
      if (alpha > 40) targets.push({ x: originX + x, y: originY + y, alpha: alpha / 255 });
    }
  }

  const maxParticles = Math.max(900, Math.min(4800, Math.floor((width * height) / 80)));
  const stride = Math.max(1, Math.ceil(targets.length / maxParticles));
  const selected = targets.filter((_, index) => index % stride === 0);
  const baseColor = parseColor(computed.color) ?? { r: 242, g: 240, b: 234 };
  const accentColor =
    parseColor(computed.getPropertyValue("--site-accent")) ?? { r: 0, g: 230, b: 176 };

  particles = selected.map((target, index) => {
    const seed = ((index * 9301 + 49297) % 233280) / 233280;
    const depth = 0.45 + (((index * 233 + 97) % 1000) / 1000) * 0.9;
    const blend = clamp(target.x / Math.max(1, textWidth) + (seed - 0.5) * 0.22, 0, 1);
    const angle = seed * Math.PI * 2;
    const distance = (reducedMotion ? 0 : props.scatter) * (0.35 + depth * 0.75);
    const startX = target.x + Math.cos(angle) * distance;
    const startY = target.y + Math.sin(angle) * distance;
    return {
      x: reducedMotion ? target.x : startX,
      y: reducedMotion ? target.y : startY,
      startX,
      startY,
      targetX: target.x,
      targetY: target.y,
      size: Math.max(0.7, props.particleSize * (0.74 + target.alpha * 0.46)),
      color: mixColor(baseColor, accentColor, blend),
      seed,
      depth,
      delay: seed * props.stagger
    };
  });

  pointer.x = width / 2;
  pointer.y = height / 2;
  pointer.smoothX = pointer.x;
  pointer.smoothY = pointer.y;
  startGather(false);
  ready.value = true;

  if (reducedMotion) draw(performance.now());
  else ensureRenderLoop();
}

function queueSample() {
  if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = null;
    void sampleText();
  });
}

function handlePointerMove(event: PointerEvent) {
  const rect = canvas.value?.getBoundingClientRect();
  if (!rect) return;
  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;
  pointer.active = true;
  ensureRenderLoop();
}

function handlePointerLeave() {
  pointer.active = false;
}

function handleVisibilityChange() {
  pageVisible = !document.hidden;
  if (pageVisible) ensureRenderLoop();
  else if (animationFrame !== null) {
    window.cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
}

function handleReducedMotionChange(event: MediaQueryListEvent) {
  reducedMotion = event.matches;
  queueSample();
}

onMounted(async () => {
  await nextTick();
  const element = container.value;
  const targetCanvas = canvas.value;
  if (!element || !targetCanvas) return;

  reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotion = reduceMotionQuery.matches;
  pageVisible = !document.hidden;

  reduceMotionQuery.addEventListener("change", handleReducedMotionChange);
  targetCanvas.addEventListener("pointerenter", handlePointerMove);
  targetCanvas.addEventListener("pointermove", handlePointerMove);
  targetCanvas.addEventListener("pointerleave", handlePointerLeave);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  resizeObserver = new ResizeObserver(queueSample);
  resizeObserver.observe(element);
  intersectionObserver = new IntersectionObserver(([entry]) => {
    inView = entry?.isIntersecting ?? true;
    if (inView) ensureRenderLoop();
  });
  intersectionObserver.observe(element);
  themeObserver = new MutationObserver(queueSample);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  await sampleText();
});

onBeforeUnmount(() => {
  buildId += 1;
  resizeObserver?.disconnect();
  intersectionObserver?.disconnect();
  themeObserver?.disconnect();
  reduceMotionQuery?.removeEventListener("change", handleReducedMotionChange);
  canvas.value?.removeEventListener("pointerenter", handlePointerMove);
  canvas.value?.removeEventListener("pointermove", handlePointerMove);
  canvas.value?.removeEventListener("pointerleave", handlePointerLeave);
  document.removeEventListener("visibilitychange", handleVisibilityChange);
  if (animationFrame !== null) window.cancelAnimationFrame(animationFrame);
  if (resizeFrame !== null) window.cancelAnimationFrame(resizeFrame);
});
</script>

<template>
  <span ref="container" class="particle-text" :class="{ 'is-ready': ready }">
    <canvas ref="canvas" class="particle-text__canvas" aria-hidden="true" />
    <span class="particle-text__fallback" aria-hidden="true">
      <span v-for="line in lines" :key="line">{{ line }}</span>
    </span>
  </span>
</template>

<style scoped>
.particle-text {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  color: inherit;
}

.particle-text__canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  touch-action: pan-y;
}

.particle-text__fallback {
  display: flex;
  height: 100%;
  flex-direction: column;
  justify-content: center;
  line-height: 0.9;
  transition: opacity 120ms ease;
}

.particle-text.is-ready .particle-text__fallback {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .particle-text__fallback {
    transition: none;
  }
}
</style>
