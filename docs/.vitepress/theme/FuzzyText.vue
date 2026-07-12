<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

type Direction = "horizontal" | "vertical" | "both";

const props = withDefaults(
  defineProps<{
    text: string;
    fontSize?: string | number;
    fontWeight?: number;
    fontFamily?: string;
    color?: string;
    enableHover?: boolean;
    baseIntensity?: number;
    hoverIntensity?: number;
    fuzzRange?: number;
    fps?: number;
    direction?: Direction;
    transitionDuration?: number;
    clickEffect?: boolean;
    glitchMode?: boolean;
    glitchInterval?: number;
    glitchDuration?: number;
    gradient?: string[] | null;
    letterSpacing?: number;
  }>(),
  {
    fontSize: "clamp(7rem, 27vw, 24rem)",
    fontWeight: 900,
    fontFamily: "inherit",
    color: "currentColor",
    enableHover: true,
    baseIntensity: 0.18,
    hoverIntensity: 0.5,
    fuzzRange: 30,
    fps: 60,
    direction: "horizontal",
    transitionDuration: 0,
    clickEffect: false,
    glitchMode: false,
    glitchInterval: 2000,
    glitchDuration: 200,
    gradient: null,
    letterSpacing: 0
  }
);

const canvas = ref<HTMLCanvasElement | null>(null);
let cleanupEffect: (() => void) | undefined;
let resizeObserver: ResizeObserver | undefined;
let themeObserver: MutationObserver | undefined;
let restartTimer: ReturnType<typeof setTimeout> | undefined;
let observedWidth = 0;

function resolvedFontSize(fontSize: string | number) {
  if (typeof fontSize === "number") return fontSize;
  const probe = document.createElement("span");
  probe.style.cssText = `position:fixed;visibility:hidden;font-size:${fontSize}`;
  document.body.appendChild(probe);
  const size = Number.parseFloat(window.getComputedStyle(probe).fontSize);
  probe.remove();
  return size;
}

function queueRestart() {
  if (restartTimer) clearTimeout(restartTimer);
  restartTimer = setTimeout(() => void initialize(), 80);
}

async function initialize() {
  cleanupEffect?.();
  cleanupEffect = undefined;

  const target = canvas.value;
  if (!target) return;

  const context = target.getContext("2d");
  if (!context) return;

  let cancelled = false;
  let animationFrame = 0;
  let glitchTimer: ReturnType<typeof setTimeout> | undefined;
  let glitchEndTimer: ReturnType<typeof setTimeout> | undefined;
  let clickTimer: ReturnType<typeof setTimeout> | undefined;

  const styles = window.getComputedStyle(target);
  const family = props.fontFamily === "inherit" ? styles.fontFamily || "sans-serif" : props.fontFamily;
  const size = resolvedFontSize(props.fontSize);
  const font = `${props.fontWeight} ${size}px ${family}`;

  try {
    await document.fonts.load(font);
  } catch {
    await document.fonts.ready;
  }
  if (cancelled) return;

  const offscreen = document.createElement("canvas");
  const offscreenContext = offscreen.getContext("2d");
  if (!offscreenContext) return;

  offscreenContext.font = font;
  offscreenContext.textBaseline = "alphabetic";

  let totalWidth = 0;
  if (props.letterSpacing) {
    for (const character of props.text) {
      totalWidth += offscreenContext.measureText(character).width + props.letterSpacing;
    }
    totalWidth -= props.letterSpacing;
  } else {
    totalWidth = offscreenContext.measureText(props.text).width;
  }

  const metrics = offscreenContext.measureText(props.text);
  const left = metrics.actualBoundingBoxLeft || 0;
  const right = props.letterSpacing ? totalWidth : metrics.actualBoundingBoxRight || metrics.width;
  const ascent = metrics.actualBoundingBoxAscent || size;
  const descent = metrics.actualBoundingBoxDescent || size * 0.2;
  const textWidth = Math.ceil(props.letterSpacing ? totalWidth : left + right);
  const textHeight = Math.ceil(ascent + descent);
  const buffer = 10;
  const sourceWidth = textWidth + buffer;

  offscreen.width = sourceWidth;
  offscreen.height = textHeight;
  offscreenContext.font = font;
  offscreenContext.textBaseline = "alphabetic";

  const resolvedColor = props.color === "currentColor" ? styles.color : props.color;
  if (props.gradient && props.gradient.length >= 2) {
    const gradient = offscreenContext.createLinearGradient(0, 0, sourceWidth, 0);
    props.gradient.forEach((color, index) => {
      gradient.addColorStop(index / (props.gradient!.length - 1), color);
    });
    offscreenContext.fillStyle = gradient;
  } else {
    offscreenContext.fillStyle = resolvedColor;
  }

  const xOffset = buffer / 2;
  if (props.letterSpacing) {
    let x = xOffset;
    for (const character of props.text) {
      offscreenContext.fillText(character, x, ascent);
      x += offscreenContext.measureText(character).width + props.letterSpacing;
    }
  } else {
    offscreenContext.fillText(props.text, xOffset - left, ascent);
  }

  const margin = props.fuzzRange + 20;
  target.width = sourceWidth + margin * 2;
  target.height = textHeight;
  context.setTransform(1, 0, 0, 1, margin, 0);

  const interactiveLeft = margin + xOffset;
  const interactiveRight = interactiveLeft + textWidth;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let hovering = false;
  let clicking = false;
  let glitching = false;
  let intensity = reduceMotion ? 0 : props.baseIntensity;
  let lastFrame = 0;
  const frameDuration = 1000 / Math.max(1, props.fps);

  function targetIntensity() {
    if (clicking || glitching) return 1;
    if (hovering) return props.hoverIntensity;
    return reduceMotion ? 0 : props.baseIntensity;
  }

  function draw(timestamp = 0) {
    if (cancelled || timestamp - lastFrame < frameDuration) {
      if (!cancelled) animationFrame = window.requestAnimationFrame(draw);
      return;
    }
    lastFrame = timestamp;

    const desired = targetIntensity();
    if (props.transitionDuration > 0) {
      const step = frameDuration / props.transitionDuration;
      intensity += Math.sign(desired - intensity) * Math.min(Math.abs(desired - intensity), step);
    } else {
      intensity = desired;
    }

    context.clearRect(-margin, 0, sourceWidth + margin * 2, textHeight);

    if (props.direction === "vertical") {
      for (let x = 0; x < sourceWidth; x += 1) {
        const offset = Math.floor(intensity * (Math.random() - 0.5) * props.fuzzRange);
        context.drawImage(offscreen, x, 0, 1, textHeight, x, offset, 1, textHeight);
      }
    } else {
      for (let y = 0; y < textHeight; y += 1) {
        const offset = Math.floor(intensity * (Math.random() - 0.5) * props.fuzzRange);
        context.drawImage(offscreen, 0, y, sourceWidth, 1, offset, y, sourceWidth, 1);
      }
      if (props.direction === "both") {
        const snapshot = context.getImageData(0, 0, target.width, textHeight);
        context.save();
        context.setTransform(1, 0, 0, 1, 0, 0);
        context.clearRect(0, 0, target.width, textHeight);
        for (let x = 0; x < snapshot.width; x += 1) {
          const offset = Math.floor(intensity * (Math.random() - 0.5) * props.fuzzRange * 0.5);
          context.putImageData(snapshot, 0, offset, x, 0, 1, textHeight);
        }
        context.restore();
      }
    }

    if (!reduceMotion) animationFrame = window.requestAnimationFrame(draw);
  }

  function pointerInside(clientX: number, clientY: number) {
    const rect = target.getBoundingClientRect();
    const scaleX = target.width / rect.width;
    const scaleY = target.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    return x >= interactiveLeft && x <= interactiveRight && y >= 0 && y <= textHeight;
  }

  function handlePointerMove(event: PointerEvent) {
    if (props.enableHover) hovering = pointerInside(event.clientX, event.clientY);
  }

  function handlePointerLeave() {
    hovering = false;
  }

  function handleClick() {
    if (!props.clickEffect) return;
    clicking = true;
    if (clickTimer) clearTimeout(clickTimer);
    clickTimer = setTimeout(() => (clicking = false), 150);
  }

  function startGlitchLoop() {
    if (!props.glitchMode || cancelled || reduceMotion) return;
    glitchTimer = setTimeout(() => {
      glitching = true;
      glitchEndTimer = setTimeout(() => {
        glitching = false;
        startGlitchLoop();
      }, props.glitchDuration);
    }, props.glitchInterval);
  }

  if (props.enableHover) {
    target.addEventListener("pointermove", handlePointerMove);
    target.addEventListener("pointerleave", handlePointerLeave);
  }
  if (props.clickEffect) target.addEventListener("click", handleClick);

  startGlitchLoop();
  draw();

  cleanupEffect = () => {
    cancelled = true;
    window.cancelAnimationFrame(animationFrame);
    if (glitchTimer) clearTimeout(glitchTimer);
    if (glitchEndTimer) clearTimeout(glitchEndTimer);
    if (clickTimer) clearTimeout(clickTimer);
    target.removeEventListener("pointermove", handlePointerMove);
    target.removeEventListener("pointerleave", handlePointerLeave);
    target.removeEventListener("click", handleClick);
  };
}

onMounted(async () => {
  await nextTick();
  await initialize();

  if (canvas.value) {
    const resizeTarget = canvas.value.parentElement ?? canvas.value;
    observedWidth = resizeTarget.getBoundingClientRect().width;
    resizeObserver = new ResizeObserver(([entry]) => {
      const nextWidth = entry?.contentRect.width ?? 0;
      if (Math.abs(nextWidth - observedWidth) < 1) return;
      observedWidth = nextWidth;
      queueRestart();
    });
    resizeObserver.observe(resizeTarget);
  }

  themeObserver = new MutationObserver(queueRestart);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
});

watch(() => ({ ...props }), queueRestart, { deep: true });

onBeforeUnmount(() => {
  cleanupEffect?.();
  resizeObserver?.disconnect();
  themeObserver?.disconnect();
  if (restartTimer) clearTimeout(restartTimer);
});
</script>

<template>
  <canvas ref="canvas" class="fuzzy-text" aria-hidden="true" />
</template>

<style scoped>
.fuzzy-text {
  display: block;
  max-width: 100%;
  height: auto;
  color: inherit;
}
</style>
