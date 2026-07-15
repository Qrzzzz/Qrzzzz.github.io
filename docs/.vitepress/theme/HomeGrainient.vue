<script setup lang="ts">
import { Color, Mesh, Program, Renderer, Triangle } from "ogl";
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useData } from "vitepress";
import { createHomeGrainientRuntime } from "./homeGrainientRuntime.mjs";

const vertexShader = `#version 300 es
in vec2 position;

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// Adapted from Vue Bits' Grainient fragment shader.
// Copyright (c) 2025 David Haz. See THIRD_PARTY_NOTICES.md.
const fragmentShader = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;

out vec4 fragColor;

#define S(a,b,t) smoothstep(a,b,t)

mat2 rotate2d(float angle) {
  float sine = sin(angle);
  float cosine = cos(angle);
  return mat2(cosine, -sine, sine, cosine);
}

vec2 hash(vec2 point) {
  point = vec2(
    dot(point, vec2(2127.1, 81.17)),
    dot(point, vec2(1269.5, 283.37))
  );
  return fract(sin(point) * 43758.5453);
}

float noise(vec2 point) {
  vec2 cell = floor(point);
  vec2 local = fract(point);
  vec2 curve = local * local * (3.0 - 2.0 * local);
  float value = mix(
    mix(
      dot(-1.0 + 2.0 * hash(cell), local),
      dot(-1.0 + 2.0 * hash(cell + vec2(1.0, 0.0)), local - vec2(1.0, 0.0)),
      curve.x
    ),
    mix(
      dot(-1.0 + 2.0 * hash(cell + vec2(0.0, 1.0)), local - vec2(0.0, 1.0)),
      dot(-1.0 + 2.0 * hash(cell + vec2(1.0)), local - vec2(1.0)),
      curve.x
    ),
    curve.y
  );
  return 0.5 + 0.5 * value;
}

void main() {
  const float timeSpeed = 0.12;
  const float warpStrength = 0.45;
  const float warpFrequency = 3.5;
  const float warpSpeed = 0.9;
  const float warpAmplitude = 50.0;
  const float blendAngle = -18.0;
  const float blendSoftness = 0.22;
  const float rotationAmount = 180.0;
  const float noiseScale = 1.6;
  const float grainAmount = 0.035;
  const float grainScale = 2.0;
  const float contrast = 1.08;
  const float gamma = 1.0;
  const float saturation = 0.82;
  const float zoom = 0.92;

  float time = uTime * timeSpeed;
  vec2 uv = gl_FragCoord.xy / uResolution;
  float aspect = uResolution.x / uResolution.y;
  vec2 field = uv - 0.5;
  field /= zoom;

  float degree = noise(vec2(time * 0.1, field.x * field.y) * noiseScale);
  field.y /= aspect;
  field *= rotate2d(radians((degree - 0.5) * rotationAmount + 180.0));
  field.y *= aspect;

  float amplitude = warpAmplitude / warpStrength;
  float warpTime = time * warpSpeed;
  field.x += sin(field.y * warpFrequency + warpTime) / amplitude;
  field.y += sin(field.x * (warpFrequency * 1.5) + warpTime) / (amplitude * 0.5);

  float softness = max(blendSoftness, 0.0);
  float blendX = (field * rotate2d(radians(blendAngle))).x;
  float edge0 = -0.3 - softness;
  float edge1 = 0.2 + softness;
  float vertical0 = 0.5 + softness;
  float vertical1 = -0.3 - softness;
  vec3 layer1 = mix(uColor3, uColor2, S(edge0, edge1, blendX));
  vec3 layer2 = mix(uColor2, uColor1, S(edge0, edge1, blendX));
  vec3 color = mix(layer1, layer2, S(vertical0, vertical1, field.y));

  vec2 grainUv = uv * grainScale;
  float grain = fract(sin(dot(grainUv, vec2(12.9898, 78.233))) * 43758.5453);
  color += (grain - 0.5) * grainAmount;

  color = (color - 0.5) * contrast + 0.5;
  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(luminance), color, saturation);
  color = pow(max(color, 0.0), vec3(1.0 / gamma));
  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

type GrainientScene = {
  resize: () => void;
  render: (timestamp: number) => void;
  setPalette: (colors: string[]) => void;
  destroy: () => void;
};

const container = ref<HTMLDivElement | null>(null);
const { isDark } = useData();
let runtime: ReturnType<typeof createHomeGrainientRuntime> | undefined;

function paletteFromTokens(element: HTMLElement) {
  const styles = window.getComputedStyle(element);
  const colors = ["--site-surface", "--site-accent", "--site-canvas"]
    .map((token) => styles.getPropertyValue(token).trim())
    .filter(Boolean);
  return colors.length === 3 ? colors : ["#fcfbf7", "#d92d16", "#f5f4ef"];
}

function colorValue(value: string) {
  const color = new Color(value);
  return [color.r, color.g, color.b];
}

function createScene({
  container: target,
  palette
}: {
  container: HTMLDivElement;
  palette: string[];
}): GrainientScene {
  const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
  const renderer = new Renderer({
    alpha: true,
    antialias: false,
    dpr,
    depth: false,
    powerPreference: "low-power",
    webgl: 2
  });
  const gl = renderer.gl;

  if (!renderer.isWebgl2) {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    throw new Error("HomeGrainient requires WebGL 2.");
  }

  const geometry = new Triangle(gl);
  if (geometry.attributes.uv) delete geometry.attributes.uv;
  const source = palette.length === 3 ? palette : ["#fcfbf7", "#d92d16", "#f5f4ef"];
  const program = new Program(gl, {
    vertex: vertexShader,
    fragment: fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: [1, 1] },
      uColor1: { value: colorValue(source[0]) },
      uColor2: { value: colorValue(source[1]) },
      uColor3: { value: colorValue(source[2]) }
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
    if (colors.length !== 3) return;
    program.uniforms.uColor1.value = colorValue(colors[0]);
    program.uniforms.uColor2.value = colorValue(colors[1]);
    program.uniforms.uColor3.value = colorValue(colors[2]);
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
  runtime = createHomeGrainientRuntime({
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
  <div ref="container" class="home-grainient-visual" aria-hidden="true" />
</template>

<style scoped>
.home-grainient-visual {
  position: absolute;
  z-index: 0;
  inset: 0;
  overflow: hidden;
  opacity: 0.48;
  pointer-events: none;
  user-select: none;
  -webkit-mask-image: radial-gradient(ellipse 82% 88% at 76% 43%, #000 18%, rgba(0, 0, 0, 0.88) 58%, transparent 100%);
  mask-image: radial-gradient(ellipse 82% 88% at 76% 43%, #000 18%, rgba(0, 0, 0, 0.88) 58%, transparent 100%);
}

.dark .home-grainient-visual {
  opacity: 0.42;
}

.home-grainient-visual::before {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 78% 36%, color-mix(in srgb, var(--site-accent) 54%, transparent), transparent 58%),
    linear-gradient(138deg, var(--site-surface), var(--site-canvas) 74%);
  content: "";
}

.home-grainient-visual[data-grainient-mode="webgl"]::before {
  display: none;
}

.home-grainient-visual :deep(canvas) {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}

:global(.home-intro > :not(.home-grainient-visual)) {
  position: relative;
  z-index: 1;
}

@media (max-width: 767px) {
  .home-grainient-visual {
    opacity: 0.36;
    -webkit-mask-image: radial-gradient(ellipse 112% 74% at 72% 35%, #000 10%, rgba(0, 0, 0, 0.78) 58%, transparent 100%);
    mask-image: radial-gradient(ellipse 112% 74% at 72% 35%, #000 10%, rgba(0, 0, 0, 0.78) 58%, transparent 100%);
  }

  .dark .home-grainient-visual {
    opacity: 0.32;
  }
}
</style>
