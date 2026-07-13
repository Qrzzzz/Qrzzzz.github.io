export function getThemeRevealGeometry(rect, viewport) {
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
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
  update,
  duration = 520
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
  const { x, y, radius } = getThemeRevealGeometry(rect, {
    width: windowObject.innerWidth,
    height: windowObject.innerHeight
  });

  try {
    const transition = documentObject.startViewTransition(applyUpdate);
    await transition.ready;
    documentObject.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${x}px ${y}px)`,
          `circle(${radius}px at ${x}px ${y}px)`
        ]
      },
      {
        duration,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        pseudoElement: "::view-transition-new(root)"
      }
    );
    return true;
  } catch {
    await applyUpdate();
    return false;
  }
}
