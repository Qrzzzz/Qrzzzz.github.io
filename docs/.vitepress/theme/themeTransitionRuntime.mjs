export function getThemeRevealGeometry(rect, viewport, point) {
  const x = Number.isFinite(point?.x) ? point.x : rect.left + rect.width / 2;
  const y = Number.isFinite(point?.y) ? point.y : rect.top + rect.height / 2;
  const radius = Math.hypot(
    Math.max(x, viewport.width - x),
    Math.max(y, viewport.height - y)
  );

  return { x, y, radius };
}

export function canAnimateThemeTransition(documentObject, windowObject, origin) {
  return Boolean(
    origin &&
      typeof documentObject?.startViewTransition === "function" &&
      typeof documentObject?.documentElement?.animate === "function" &&
      !windowObject?.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

export async function runThemeTransition({
  documentObject,
  windowObject,
  origin,
  point,
  targetIsDark,
  update,
  duration = 300
}) {
  let didUpdate = false;
  const applyUpdate = async () => {
    if (didUpdate) return;
    didUpdate = true;
    await update();
  };

  if (!canAnimateThemeTransition(documentObject, windowObject, origin)) {
    await applyUpdate();
    return false;
  }

  const rect = origin.getBoundingClientRect();
  const { x, y, radius } = getThemeRevealGeometry(
    rect,
    {
      width: windowObject.innerWidth,
      height: windowObject.innerHeight
    },
    point
  );
  const clipPath = [
    `circle(0px at ${x}px ${y}px)`,
    `circle(${radius}px at ${x}px ${y}px)`
  ];

  try {
    const transition = documentObject.startViewTransition(applyUpdate);
    await transition.ready;
    documentObject.documentElement.animate(
      {
        clipPath: targetIsDark ? [...clipPath].reverse() : clipPath
      },
      {
        duration,
        easing: "ease-in",
        pseudoElement: `::view-transition-${targetIsDark ? "old" : "new"}(root)`
      }
    );
    return true;
  } catch {
    await applyUpdate();
    return false;
  }
}
