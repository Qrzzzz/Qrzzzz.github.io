export const HOME_ASCII_TRAIL_POINTER_QUERY = "(hover: hover) and (pointer: fine)";
export const HOME_ASCII_TRAIL_REDUCED_MOTION_QUERY =
  "(prefers-reduced-motion: reduce)";

const CELL_WIDTH = 18;
const CELL_HEIGHT = 24;
const MIN_ENERGY = 0.025;
const CORE_THRESHOLD = 0.7;
const DIRECTION_THRESHOLD = 0.31;

function finiteNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

export function asciiDirectionGlyph(deltaX, deltaY, fallback = ">") {
  const x = finiteNumber(deltaX);
  const y = finiteNumber(deltaY);
  if (Math.abs(x) < 0.01 && Math.abs(y) < 0.01) return fallback;
  if (Math.abs(x) >= Math.abs(y)) return x >= 0 ? ">" : "<";
  return y >= 0 ? "v" : "^";
}

export function asciiTrailGlyph(energy, direction = ">") {
  if (energy >= CORE_THRESHOLD) return "o";
  if (energy >= DIRECTION_THRESHOLD) return direction;
  return "-";
}

/**
 * Draws a sparse, demand-driven ASCII field behind the homepage. Pointer
 * movement deposits energy into nearby grid cells; the field quantizes that
 * energy into o, directional arrows, and fading dashes.
 */
export function createHomeAsciiTrailRuntime(options) {
  const canvas = options?.canvas;
  const targetWindow = options?.window ?? globalThis.window;
  const targetDocument = options?.document ?? globalThis.document;
  const context = options?.context ?? canvas?.getContext?.("2d");

  if (!canvas || !context) {
    throw new TypeError("HomeAsciiTrail requires a canvas with a 2D context.");
  }
  if (!targetWindow || !targetDocument) {
    throw new TypeError("HomeAsciiTrail requires a browser environment.");
  }

  let color = options?.color ?? "#5f625f";
  let pointerQuery;
  let reducedMotionQuery;
  let frame = 0;
  let mounted = false;
  let destroyed = false;
  let enabled = false;
  let width = 1;
  let height = 1;
  let columns = 1;
  let previousX;
  let previousY;
  let previousDirection = ">";
  let previousTime = 0;
  const cells = new Map();

  function setState(state) {
    canvas.dataset.asciiTrailState = state;
  }

  function configureContext() {
    context.font = `12px ${
      options?.fontFamily ??
      'ui-monospace, "SFMono-Regular", "Cascadia Code", Consolas, monospace'
    }`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = color;
  }

  function clear() {
    cells.clear();
    context.clearRect(0, 0, width, height);
    previousTime = 0;
    setState(enabled ? "idle" : "disabled");
  }

  function cancelFrame() {
    if (!frame) return;
    targetWindow.cancelAnimationFrame(frame);
    frame = 0;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect?.() ?? {};
    width = Math.max(1, finiteNumber(rect.width, targetWindow.innerWidth || 1));
    height = Math.max(1, finiteNumber(rect.height, targetWindow.innerHeight || 1));
    const dpr = Math.min(2, Math.max(1, finiteNumber(targetWindow.devicePixelRatio, 1)));

    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    configureContext();
    columns = Math.max(1, Math.ceil(width / CELL_WIDTH));
    clear();
  }

  function scheduleFrame() {
    if (!enabled || frame || targetDocument.hidden || cells.size === 0) return;
    frame = targetWindow.requestAnimationFrame(draw);
  }

  function draw(timestamp) {
    frame = 0;
    if (!enabled || targetDocument.hidden) return;

    const elapsed = previousTime
      ? Math.min(48, Math.max(0, timestamp - previousTime))
      : 16;
    previousTime = timestamp;
    const decay = Math.pow(0.94, elapsed / 16);

    context.clearRect(0, 0, width, height);
    configureContext();

    for (const [key, cell] of cells) {
      cell.energy *= decay;
      if (cell.energy < MIN_ENERGY) {
        cells.delete(key);
        continue;
      }

      context.globalAlpha = Math.min(0.72, 0.1 + cell.energy * 0.62);
      context.fillText(
        asciiTrailGlyph(cell.energy, cell.direction),
        cell.x,
        cell.y
      );
    }

    context.globalAlpha = 1;
    if (cells.size) {
      setState("running");
      scheduleFrame();
    } else {
      previousTime = 0;
      setState("idle");
    }
  }

  function deposit(clientX, clientY) {
    const rect = canvas.getBoundingClientRect?.() ?? { left: 0, top: 0 };
    const x = finiteNumber(clientX) - finiteNumber(rect.left);
    const y = finiteNumber(clientY) - finiteNumber(rect.top);
    if (x < 0 || y < 0 || x > width || y > height) return;

    const deltaX = previousX === undefined ? 0 : x - previousX;
    const deltaY = previousY === undefined ? 0 : y - previousY;
    const speed = Math.min(40, Math.hypot(deltaX, deltaY));
    previousDirection = asciiDirectionGlyph(deltaX, deltaY, previousDirection);
    previousX = x;
    previousY = y;

    const radius = Math.min(168, 112 + speed * 1.4);
    const minimumColumn = Math.max(0, Math.floor((x - radius) / CELL_WIDTH));
    const maximumColumn = Math.min(
      columns - 1,
      Math.ceil((x + radius) / CELL_WIDTH)
    );
    const minimumRow = Math.max(0, Math.floor((y - radius) / CELL_HEIGHT));
    const maximumRow = Math.ceil((Math.min(height, y + radius)) / CELL_HEIGHT);
    const speedBoost = 0.92 + speed / 100;

    for (let row = minimumRow; row <= maximumRow; row += 1) {
      const cellY = row * CELL_HEIGHT + CELL_HEIGHT / 2;
      for (let column = minimumColumn; column <= maximumColumn; column += 1) {
        const cellX = column * CELL_WIDTH + CELL_WIDTH / 2;
        const distance = Math.hypot(cellX - x, cellY - y);
        if (distance >= radius) continue;

        const falloff = Math.pow(1 - distance / radius, 0.72);
        const energy = Math.min(1, falloff * speedBoost);
        const key = row * columns + column;
        const cell = cells.get(key);
        if (cell) {
          if (energy > cell.energy) cell.energy = energy;
          cell.direction = previousDirection;
        } else {
          cells.set(key, {
            x: cellX,
            y: cellY,
            energy,
            direction: previousDirection
          });
        }
      }
    }

    if (cells.size) {
      setState("running");
      scheduleFrame();
    }
  }

  function handlePointerMove(event) {
    if (!enabled || event.pointerType === "touch") return;
    deposit(event.clientX, event.clientY);
  }

  function handleVisibilityChange() {
    if (targetDocument.hidden) {
      cancelFrame();
      clear();
      return;
    }
    scheduleFrame();
  }

  function enable() {
    if (enabled || destroyed || !pointerQuery?.matches || reducedMotionQuery?.matches) {
      return;
    }
    enabled = true;
    previousX = undefined;
    previousY = undefined;
    targetWindow.addEventListener("pointermove", handlePointerMove, { passive: true });
    resize();
    setState("idle");
  }

  function disable() {
    if (enabled) {
      targetWindow.removeEventListener("pointermove", handlePointerMove);
    }
    enabled = false;
    previousX = undefined;
    previousY = undefined;
    cancelFrame();
    clear();
  }

  function syncMode() {
    if (pointerQuery?.matches && !reducedMotionQuery?.matches) enable();
    else disable();
  }

  function mount() {
    if (mounted || destroyed) return;
    mounted = true;
    pointerQuery = targetWindow.matchMedia(HOME_ASCII_TRAIL_POINTER_QUERY);
    reducedMotionQuery = targetWindow.matchMedia(HOME_ASCII_TRAIL_REDUCED_MOTION_QUERY);
    pointerQuery.addEventListener("change", syncMode);
    reducedMotionQuery.addEventListener("change", syncMode);
    targetWindow.addEventListener("resize", resize, { passive: true });
    targetDocument.addEventListener("visibilitychange", handleVisibilityChange);
    syncMode();
  }

  function setColor(nextColor) {
    if (!nextColor) return;
    color = nextColor;
    context.fillStyle = color;
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    mounted = false;
    disable();
    pointerQuery?.removeEventListener("change", syncMode);
    reducedMotionQuery?.removeEventListener("change", syncMode);
    targetWindow.removeEventListener("resize", resize);
    targetDocument.removeEventListener("visibilitychange", handleVisibilityChange);
  }

  return {
    mount,
    destroy,
    deposit,
    setColor,
    getState: () => ({
      mounted,
      destroyed,
      enabled,
      frame,
      activeCells: cells.size,
      mode: canvas.dataset.asciiTrailState
    })
  };
}
