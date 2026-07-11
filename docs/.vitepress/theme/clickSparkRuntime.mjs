export const SPARK_COUNT = 10;
export const SPARK_DURATION_MS = 360;
export const MAX_ACTIVE_SPARKS = 60;
export const MAX_DEVICE_PIXEL_RATIO = 2;

export const CLICK_SPARK_THEME_COLORS = Object.freeze({
  light: Object.freeze(["#3156a3", "#3f4442"]),
  dark: Object.freeze(["#a8b8ff", "#f2f0ea"])
});

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
export const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function finiteNumber(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Creates the DOM-facing ClickSpark runtime behind an injectable boundary.
 * No canvas context or active window listeners are allocated until both media
 * queries say that the effect is appropriate for the current user.
 *
 * @param {{
 *   canvas: HTMLCanvasElement,
 *   window?: Window,
 *   now?: () => number,
 *   getComputedStyle?: (element: Element) => CSSStyleDeclaration
 * }} options
 */
export function createClickSparkRuntime(options) {
  const canvas = options?.canvas;
  const targetWindow = options?.window ?? globalThis.window;

  if (!canvas) throw new TypeError("ClickSpark requires a canvas element.");
  if (!targetWindow) throw new TypeError("ClickSpark requires a window environment.");

  const now = options?.now ?? (() => targetWindow.performance.now());
  const readComputedStyle =
    options?.getComputedStyle ?? ((element) => targetWindow.getComputedStyle(element));

  /** @type {CanvasRenderingContext2D | null} */
  let context = null;
  /** @type {MediaQueryList | null} */
  let motionQuery = null;
  /** @type {MediaQueryList | null} */
  let finePointerQuery = null;
  /** @type {Array<{
   *   x: number,
   *   y: number,
   *   angle: number,
   *   startTime: number,
   *   color: string,
   *   lengthScale: number,
   *   lineWidth: number
   * }>} */
  const sparks = [];

  let animationFrame = 0;
  let activeListenersAttached = false;
  let canvasReleased = false;
  let enabled = false;
  let mounted = false;
  let destroyed = false;

  function viewportSize() {
    return {
      width: Math.max(1, finiteNumber(targetWindow.innerWidth, 1)),
      height: Math.max(1, finiteNumber(targetWindow.innerHeight, 1))
    };
  }

  function preferencesDisableEffect() {
    return Boolean(motionQuery?.matches || !finePointerQuery?.matches);
  }

  function releaseCanvas() {
    if (canvasReleased) return;

    canvas.width = 1;
    canvas.height = 1;
    canvas.style.width = "1px";
    canvas.style.height = "1px";
    canvasReleased = true;
  }

  function resizeCanvas() {
    if (!enabled || !context) return;

    const { width, height } = viewportSize();
    const rawRatio = finiteNumber(targetWindow.devicePixelRatio, 1);
    const ratio = clamp(rawRatio, 1, MAX_DEVICE_PIXEL_RATIO);

    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvasReleased = false;

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.lineCap = "round";
  }

  function removeActiveListeners() {
    if (!activeListenersAttached) return;

    targetWindow.removeEventListener("resize", resizeCanvas);
    targetWindow.removeEventListener("pointerdown", handlePointerDown);
    activeListenersAttached = false;
  }

  function clearActiveWork() {
    if (animationFrame) targetWindow.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    sparks.splice(0);

    if (context) {
      const { width, height } = viewportSize();
      context.clearRect(0, 0, width, height);
    }
  }

  function disable() {
    if (!enabled && !activeListenersAttached && !context && !animationFrame && canvasReleased) {
      return;
    }

    enabled = false;
    removeActiveListeners();
    clearActiveWork();
    context = null;
    releaseCanvas();
  }

  function drawSparks(timestamp) {
    if (!enabled || !context) {
      animationFrame = 0;
      return;
    }

    const { width, height } = viewportSize();
    context.clearRect(0, 0, width, height);

    for (let index = sparks.length - 1; index >= 0; index -= 1) {
      const spark = sparks[index];
      const elapsed = timestamp - spark.startTime;

      if (elapsed >= SPARK_DURATION_MS) {
        sparks.splice(index, 1);
        continue;
      }

      const progress = clamp(elapsed / SPARK_DURATION_MS, 0, 1);
      const eased = 1 - (1 - progress) ** 3;
      const distance = eased * 30 * spark.lengthScale;
      const lineLength = 15 * (1 - eased) * spark.lengthScale;
      const x1 = spark.x + distance * Math.cos(spark.angle);
      const y1 = spark.y + distance * Math.sin(spark.angle);
      const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
      const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

      context.save();
      context.globalAlpha = (1 - progress) ** 1.35;
      context.strokeStyle = spark.color;
      context.lineWidth = spark.lineWidth;
      context.shadowBlur = 3;
      context.shadowColor = spark.color;
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();
      context.restore();
    }

    animationFrame = sparks.length
      ? targetWindow.requestAnimationFrame(drawSparks)
      : 0;
  }

  function sparkPalette() {
    const styles = readComputedStyle(canvas);
    const primary = styles.getPropertyValue("--click-spark-primary").trim();
    const secondary = styles.getPropertyValue("--click-spark-secondary").trim();

    return [
      primary || CLICK_SPARK_THEME_COLORS.light[0],
      secondary || CLICK_SPARK_THEME_COLORS.light[1]
    ];
  }

  /** @param {PointerEvent} event */
  function handlePointerDown(event) {
    if (
      !enabled ||
      preferencesDisableEffect() ||
      event.button !== 0 ||
      event.isPrimary !== true ||
      event.pointerType === "touch"
    ) {
      return;
    }

    const [primaryColor, secondaryColor] = sparkPalette();
    const { width, height } = viewportSize();
    const x = clamp(finiteNumber(event.clientX, 0), 0, width);
    const y = clamp(finiteNumber(event.clientY, 0), 0, height);
    const startTime = now();

    for (let index = 0; index < SPARK_COUNT; index += 1) {
      sparks.push({
        x,
        y,
        angle: (2 * Math.PI * index) / SPARK_COUNT,
        startTime,
        color: index % 2 === 0 ? primaryColor : secondaryColor,
        lengthScale: index % 2 === 0 ? 1 : 0.82,
        lineWidth: index % 2 === 0 ? 1.15 : 0.85
      });
    }

    if (sparks.length > MAX_ACTIVE_SPARKS) {
      sparks.splice(0, sparks.length - MAX_ACTIVE_SPARKS);
    }

    if (!animationFrame) {
      animationFrame = targetWindow.requestAnimationFrame(drawSparks);
    }
  }

  function enable() {
    if (destroyed || enabled || preferencesDisableEffect()) return;

    context = canvas.getContext("2d");
    if (!context) {
      releaseCanvas();
      return;
    }

    enabled = true;
    canvasReleased = false;
    resizeCanvas();
    targetWindow.addEventListener("resize", resizeCanvas, { passive: true });
    targetWindow.addEventListener("pointerdown", handlePointerDown, { passive: true });
    activeListenersAttached = true;
  }

  function reconcilePreferences() {
    if (preferencesDisableEffect()) disable();
    else enable();
  }

  function mount() {
    if (mounted || destroyed) return;

    motionQuery = targetWindow.matchMedia(REDUCED_MOTION_QUERY);
    finePointerQuery = targetWindow.matchMedia(FINE_POINTER_QUERY);
    motionQuery.addEventListener("change", reconcilePreferences);
    finePointerQuery.addEventListener("change", reconcilePreferences);
    mounted = true;
    reconcilePreferences();
  }

  function destroy() {
    if (destroyed) return;

    destroyed = true;
    disable();
    motionQuery?.removeEventListener("change", reconcilePreferences);
    finePointerQuery?.removeEventListener("change", reconcilePreferences);
    motionQuery = null;
    finePointerQuery = null;
    mounted = false;
  }

  return {
    mount,
    destroy,
    isEnabled: () => enabled
  };
}
