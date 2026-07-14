<script setup lang="ts">
import { Color, Mesh, Program, Renderer, Triangle } from "ogl";
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useData } from "vitepress";
import { createHomeStrandsRuntime } from "./homeStrandsRuntime.mjs";

const MAX_COLORS = 3;
const MAX_STRANDS = 3;

const vertexShader = `#version 300 es
in vec2 position;

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// Adapted from Vue Bits' Strands fragment shader.
// Copyright (c) 2025 David Haz. See THIRD_PARTY_NOTICES.md.
const fragmentShader = `#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColors[${MAX_COLORS}];
uniform int uColorCount;

out vec4 fragColor;

const float PI = 3.14159265;

vec3 samplePalette(float value) {
  float scaled = fract(value) * float(uColorCount);
  int index = int(floor(scaled));
  int nextIndex = index + 1;
  if (nextIndex >= uColorCount) nextIndex = 0;
  return mix(uColors[index], uColors[nextIndex], fract(scaled));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  uv /= 1.22;

  float envelope = pow(max(cos(uv.x * PI * 0.48), 0.0), 2.6);
  vec3 color = vec3(0.0);

  for (int i = 0; i < ${MAX_STRANDS}; i++) {
    float strand = float(i);
    float phase = strand * 1.42;
    float frequency = 1.85 + strand * 0.32;
    float pace = 0.74 + strand * 0.31;
    float time = uTime * 0.22;
    float wave = sin(uv.x * frequency + time * pace + phase) * 0.62
      + sin(uv.x * frequency * 1.13 - time * pace * 0.72 + phase * 1.6) * 0.38;
    float center = wave * 0.082 * envelope;
    float distanceToStrand = abs(uv.y - center);
    float thickness = 0.018 * (0.42 + envelope);
    float glow = thickness / (distanceToStrand + thickness * 0.52);
    glow *= glow;

    float palettePosition = strand / float(${MAX_STRANDS}) + uv.x * 0.22 + uTime * 0.012;
    color += samplePalette(palettePosition) * glow * envelope;
  }

  color = 1.0 - exp(-color * 1.34);
  float luminance = max(max(color.r, color.g), color.b);
  float alpha = clamp(luminance, 0.0, 1.0) * 0.34;
  fragColor = vec4(color * alpha, alpha);
}
`;

type StrandsScene = {
  resize: () => void;
  render: (timestamp: number) => void;
  setPalette: (colors: string[]) => void;
  destroy: () => void;
};

const container = ref<HTMLDivElement | null>(null);
const { isDark } = useData();
let runtime: ReturnType<typeof createHomeStrandsRuntime> | undefined;

function paletteFromTokens(element: HTMLElement) {
  const styles = window.getComputedStyle(element);
  const colors = [1, 2, 3]
    .map((index) => styles.getPropertyValue(`--site-strands-${index}`).trim())
    .filter(Boolean);
  return colors.length ? colors : ["#d92d16", "#ff8068", "#b8b6ae"];
}

function buildPalette(colors: string[]) {
  const source = colors.length ? colors : ["#ffffff"];
  return Array.from({ length: MAX_COLORS }, (_, index) => {
    const color = new Color(source[index] ?? source[source.length - 1]);
    return [color.r, color.g, color.b];
  });
}

function createScene({
  container: target,
  palette
}: {
  container: HTMLDivElement;
  palette: string[];
}): StrandsScene {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
  const renderer = new Renderer({
    alpha: true,
    antialias: false,
    dpr,
    depth: false,
    powerPreference: "low-power",
    premultipliedAlpha: true,
    webgl: 2
  });
  const gl = renderer.gl;

  if (!renderer.isWebgl2) {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    throw new Error("HomeStrands requires WebGL 2.");
  }

  gl.clearColor(0, 0, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  const geometry = new Triangle(gl);
  if (geometry.attributes.uv) delete geometry.attributes.uv;
  const program = new Program(gl, {
    vertex: vertexShader,
    fragment: fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: [1, 1] },
      uColors: { value: buildPalette(palette) },
      uColorCount: { value: Math.min(Math.max(palette.length, 1), MAX_COLORS) }
    }
  });
  const mesh = new Mesh(gl, { geometry, program });
  const canvas = gl.canvas;
  canvas.setAttribute("aria-hidden", "true");
  target.appendChild(canvas);

  let lastRender = 0;

  function resize() {
    const width = Math.max(1, target.clientWidth);
    const height = Math.max(1, target.clientHeight);
    renderer.setSize(width, height);
    program.uniforms.uResolution.value = [width * dpr, height * dpr];
  }

  function setPalette(colors: string[]) {
    program.uniforms.uColors.value = buildPalette(colors);
    program.uniforms.uColorCount.value = Math.min(Math.max(colors.length, 1), MAX_COLORS);
  }

  function render(timestamp: number) {
    if (timestamp - lastRender < 32) return;
    lastRender = timestamp;
    program.uniforms.uTime.value = timestamp * 0.001;
    renderer.render({ scene: mesh });
  }

  function destroy() {
    if (canvas.parentNode === target) target.removeChild(canvas);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }

  return { resize, render, setPalette, destroy };
}

function syncPalette() {
  const element = container.value;
  if (!element) return;
  runtime?.setPalette(paletteFromTokens(element));
}

onMounted(() => {
  const element = container.value;
  if (!element) return;
  runtime = createHomeStrandsRuntime({
    container: element,
    window,
    document,
    palette: paletteFromTokens(element),
    createScene
  });
  runtime.mount();
});

watch(isDark, () => nextTick(syncPalette), { flush: "post" });

onBeforeUnmount(() => {
  runtime?.destroy();
  runtime = undefined;
});
</script>

<template>
  <div ref="container" class="home-strands-visual" aria-hidden="true" />
</template>

<style scoped>
.home-strands-visual {
  position: absolute;
  z-index: 0;
  right: -7%;
  bottom: -8px;
  width: min(76%, 900px);
  height: 230px;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
  mask-image: linear-gradient(90deg, transparent 0%, black 19%, black 88%, transparent 100%);
}

.home-strands-visual::before {
  position: absolute;
  inset: 25% 4% 17% 18%;
  background:
    radial-gradient(ellipse at 34% 54%, color-mix(in srgb, var(--site-strands-1) 22%, transparent), transparent 58%),
    radial-gradient(ellipse at 68% 48%, color-mix(in srgb, var(--site-strands-2) 18%, transparent), transparent 61%);
  content: "";
  filter: blur(18px);
  opacity: 0.72;
}

.home-strands-visual[data-strands-mode="webgl"]::before {
  opacity: 0.18;
}

.home-strands-visual :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

@media (max-width: 959px) {
  .home-strands-visual {
    right: -11%;
    bottom: 0;
    width: 72%;
    height: 190px;
  }
}

@media (max-width: 767px), (prefers-reduced-motion: reduce) {
  .home-strands-visual {
    right: -18%;
    bottom: 8px;
    width: 82%;
    height: 150px;
    opacity: 0.58;
  }
}
</style>
