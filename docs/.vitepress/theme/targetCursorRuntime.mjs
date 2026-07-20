export const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export const TARGET_CURSOR_SELECTOR = [
  "a[href]",
  "area[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "label[for]",
  "[contenteditable='true']",
  "[role='button']",
  "[role='link']",
  "[role='menuitem']",
  "[role='option']",
  "[role='tab']",
  "[role='switch']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='slider']",
  "[tabindex]:not([tabindex='-1'])",
  "[data-cursor-target]",
  ".cursor-target"
].join(",");

export const READING_CURSOR_SELECTOR = [
  ".VPDoc .content-container",
  "[data-cursor-reading]"
].join(",");

export const FREE_CORNER_OFFSETS = Object.freeze([
  Object.freeze({ x: -18, y: -18 }),
  Object.freeze({ x: 6, y: -18 }),
  Object.freeze({ x: 6, y: 6 }),
  Object.freeze({ x: -18, y: 6 })
]);

export const READING_CORNER_OFFSETS = Object.freeze([
  Object.freeze({ x: -6, y: -14 }),
  Object.freeze({ x: -6, y: -14 }),
  Object.freeze({ x: -6, y: 2 }),
  Object.freeze({ x: -6, y: 2 })
]);

function finiteNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function lerp(current, target, amount) {
  return current + (target - current) * amount;
}

export function targetCornerOffsets(rect, cursorX, cursorY, borderWidth = 3, cornerSize = 12) {
  return [
    { x: rect.left - borderWidth - cursorX, y: rect.top - borderWidth - cursorY },
    {
      x: rect.right + borderWidth - cornerSize - cursorX,
      y: rect.top - borderWidth - cursorY
    },
    {
      x: rect.right + borderWidth - cornerSize - cursorX,
      y: rect.bottom + borderWidth - cornerSize - cursorY
    },
    {
      x: rect.left - borderWidth - cursorX,
      y: rect.bottom + borderWidth - cornerSize - cursorY
    }
  ];
}

export function resolveCursorTarget(element, selector = TARGET_CURSOR_SELECTOR) {
  let current = element;
  while (current && current.nodeType === 1) {
    if (current.hasAttribute?.("data-target-cursor")) return null;
    if (current.matches?.(selector)) return current;
    current = current.parentElement;
  }
  return null;
}

export function resolveReadingRegion(element, selector = READING_CURSOR_SELECTOR) {
  let current = element;
  while (current && current.nodeType === 1) {
    if (current.hasAttribute?.("data-target-cursor")) return null;
    if (current.matches?.(selector)) return current;
    current = current.parentElement;
  }
  return null;
}

/**
 * A dependency-free version of the React Bits Target Cursor interaction.
 * The injectable browser boundary keeps geometry and lifecycle behavior testable.
 */
export function createTargetCursorRuntime(options) {
  const cursor = options?.cursor;
  const targetWindow = options?.window ?? globalThis.window;
  const targetDocument = options?.document ?? globalThis.document;
  const selector = options?.targetSelector ?? TARGET_CURSOR_SELECTOR;
  const readingSelector = options?.readingSelector ?? READING_CURSOR_SELECTOR;

  if (!cursor) throw new TypeError("TargetCursor requires a cursor element.");
  if (!targetWindow || !targetDocument) {
    throw new TypeError("TargetCursor requires a browser environment.");
  }

  const corners = Array.from(cursor.querySelectorAll("[data-target-cursor-corner]"));
  const dot = cursor.querySelector("[data-target-cursor-dot]");
  if (corners.length !== 4 || !dot) {
    throw new TypeError("TargetCursor requires one dot and four corners.");
  }

  let finePointerQuery;
  let reducedMotionQuery;
  let frame = 0;
  let enabled = false;
  let mounted = false;
  let destroyed = false;
  let visible = false;
  let pressed = false;
  let activeTarget = null;
  let activeReadingRegion = null;
  let previousTime = 0;
  let rotation = 0;
  let x = finiteNumber(targetWindow.innerWidth, 0) / 2;
  let y = finiteNumber(targetWindow.innerHeight, 0) / 2;
  let targetX = x;
  let targetY = y;
  let scale = 1;
  let targetScale = 1;
  const cornerPositions = FREE_CORNER_OFFSETS.map((position) => ({ ...position }));

  function setTarget(target) {
    if (activeTarget === target) return;
    activeTarget = target;
    cursor.classList.toggle("is-targeting", Boolean(target));
  }

  function setReadingRegion(region) {
    if (activeReadingRegion === region) return;
    activeReadingRegion = region;
    cursor.classList.toggle("is-reading", Boolean(region));
  }

  function elementsAtPoint(clientX, clientY, fallbackTarget) {
    const underPointer = targetDocument.elementFromPoint?.(clientX, clientY) ?? fallbackTarget;
    const target = resolveCursorTarget(underPointer, selector);
    return {
      target,
      readingRegion: target ? null : resolveReadingRegion(underPointer, readingSelector)
    };
  }

  function scheduleFrame() {
    if (!enabled || frame) return;
    frame = targetWindow.requestAnimationFrame(draw);
  }

  function draw(timestamp) {
    frame = 0;
    if (!enabled) return;

    const reducedMotion = Boolean(reducedMotionQuery?.matches);
    const elapsed = previousTime ? Math.min(48, Math.max(0, timestamp - previousTime)) : 16;
    previousTime = timestamp;
    const follow = reducedMotion ? 1 : 1 - Math.pow(0.7, elapsed / 16);
    const cornerFollow = reducedMotion
      ? 1
      : activeTarget
        ? 0.34
        : activeReadingRegion
          ? 0.3
          : 0.22;
    x = lerp(x, targetX, follow);
    y = lerp(y, targetY, follow);
    scale = lerp(scale, targetScale, reducedMotion ? 1 : 0.28);

    if (!activeTarget && !activeReadingRegion && !reducedMotion) {
      rotation = (rotation + elapsed * 0.18) % 360;
    } else {
      const restingRotation = Math.round(rotation / 360) * 360;
      rotation = lerp(rotation, restingRotation, reducedMotion ? 1 : 0.2);
    }

    let desiredCorners = FREE_CORNER_OFFSETS;
    if (activeTarget && activeTarget.isConnected !== false) {
      const rect = activeTarget.getBoundingClientRect();
      desiredCorners = targetCornerOffsets(rect, x, y);
    } else if (activeTarget) {
      setTarget(null);
    } else if (activeReadingRegion && activeReadingRegion.isConnected !== false) {
      desiredCorners = READING_CORNER_OFFSETS;
    } else if (activeReadingRegion) {
      setReadingRegion(null);
    }

    for (let index = 0; index < corners.length; index += 1) {
      const desired = desiredCorners[index];
      const current = cornerPositions[index];
      current.x = lerp(current.x, desired.x, cornerFollow);
      current.y = lerp(current.y, desired.y, cornerFollow);
      corners[index].style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;
    }

    cursor.style.opacity = visible ? "1" : "0";
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotation}deg) scale(${scale})`;
    scheduleFrame();
  }

  function handlePointerMove(event) {
    if (!enabled || event.pointerType === "touch") return;
    targetX = finiteNumber(event.clientX, targetX);
    targetY = finiteNumber(event.clientY, targetY);
    visible = true;
    const { target, readingRegion } = elementsAtPoint(targetX, targetY, event.target);
    setTarget(target);
    setReadingRegion(readingRegion);
    scheduleFrame();
  }

  function handlePointerDown(event) {
    if (!enabled || event.button !== 0 || event.pointerType === "touch") return;
    pressed = true;
    targetScale = 0.88;
    cursor.classList.add("is-pressed");
    scheduleFrame();
  }

  function handlePointerUp() {
    if (!enabled || !pressed) return;
    pressed = false;
    targetScale = 1;
    cursor.classList.remove("is-pressed");
    scheduleFrame();
  }

  function handlePointerLeave(event) {
    if (event.relatedTarget) return;
    visible = false;
    setTarget(null);
    setReadingRegion(null);
    handlePointerUp();
  }

  function attachActiveListeners() {
    targetWindow.addEventListener("pointermove", handlePointerMove, { passive: true });
    targetWindow.addEventListener("pointerdown", handlePointerDown, { passive: true });
    targetWindow.addEventListener("pointerup", handlePointerUp, { passive: true });
    targetWindow.addEventListener("pointercancel", handlePointerUp, { passive: true });
    targetWindow.addEventListener("pointerout", handlePointerLeave, { passive: true });
    targetDocument.addEventListener("pointerleave", handlePointerLeave, { passive: true });
  }

  function removeActiveListeners() {
    targetWindow.removeEventListener("pointermove", handlePointerMove);
    targetWindow.removeEventListener("pointerdown", handlePointerDown);
    targetWindow.removeEventListener("pointerup", handlePointerUp);
    targetWindow.removeEventListener("pointercancel", handlePointerUp);
    targetWindow.removeEventListener("pointerout", handlePointerLeave);
    targetDocument.removeEventListener("pointerleave", handlePointerLeave);
  }

  function enable() {
    if (enabled || destroyed || !finePointerQuery?.matches) return;
    enabled = true;
    previousTime = 0;
    targetDocument.documentElement.classList.add("has-target-cursor");
    attachActiveListeners();
    scheduleFrame();
  }

  function disable() {
    if (!enabled) return;
    enabled = false;
    removeActiveListeners();
    if (frame) targetWindow.cancelAnimationFrame(frame);
    frame = 0;
    visible = false;
    pressed = false;
    activeTarget = null;
    activeReadingRegion = null;
    cursor.classList.remove("is-targeting", "is-reading", "is-pressed");
    cursor.style.opacity = "0";
    targetDocument.documentElement.classList.remove("has-target-cursor");
  }

  function syncPointerMode() {
    if (finePointerQuery?.matches) enable();
    else disable();
  }

  function mount() {
    if (mounted || destroyed) return;
    mounted = true;
    finePointerQuery = targetWindow.matchMedia(FINE_POINTER_QUERY);
    reducedMotionQuery = targetWindow.matchMedia(REDUCED_MOTION_QUERY);
    finePointerQuery.addEventListener("change", syncPointerMode);
    reducedMotionQuery.addEventListener("change", scheduleFrame);
    syncPointerMode();
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    disable();
    finePointerQuery?.removeEventListener("change", syncPointerMode);
    reducedMotionQuery?.removeEventListener("change", scheduleFrame);
  }

  return {
    mount,
    destroy,
    getState: () => ({ enabled, visible, pressed, activeTarget, activeReadingRegion })
  };
}
