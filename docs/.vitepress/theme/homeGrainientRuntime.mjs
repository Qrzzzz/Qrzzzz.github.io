export const HOME_GRAINIENT_RENDER_QUERY = "(min-width: 320px)";
export const HOME_GRAINIENT_REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Keeps the decorative WebGL background out of the critical rendering path and
 * suspends it whenever the page is hidden, the hero is off-screen, or the user
 * has asked for less motion. The CSS layer remains as the static fallback.
 */
export function createHomeGrainientRuntime(options) {
  const container = options?.container;
  const targetWindow = options?.window ?? globalThis.window;
  const targetDocument = options?.document ?? globalThis.document;
  const createScene = options?.createScene;

  if (!container) throw new TypeError("HomeGrainient requires a container element.");
  if (!targetWindow || !targetDocument || typeof createScene !== "function") {
    throw new TypeError("HomeGrainient requires a browser environment and scene factory.");
  }

  let palette = options?.palette ?? [];
  let scene;
  let frame = 0;
  let mounted = false;
  let destroyed = false;
  let visible = true;
  let reducedMotionQuery;
  let renderQuery;
  let intersectionObserver;
  let resizeObserver;

  function animationAllowed() {
    return Boolean(renderQuery?.matches) && !reducedMotionQuery?.matches;
  }

  function shouldAnimate() {
    return mounted && !destroyed && scene && visible && !targetDocument.hidden;
  }

  function cancelFrame() {
    if (!frame) return;
    targetWindow.cancelAnimationFrame(frame);
    frame = 0;
  }

  function draw(timestamp) {
    frame = 0;
    if (!shouldAnimate()) return;
    scene.render(timestamp);
    frame = targetWindow.requestAnimationFrame(draw);
  }

  function syncLoop() {
    if (!shouldAnimate()) {
      cancelFrame();
      return;
    }
    if (!frame) frame = targetWindow.requestAnimationFrame(draw);
  }

  function destroyScene() {
    cancelFrame();
    scene?.destroy();
    scene = undefined;
    container.dataset.grainientMode = "fallback";
  }

  function syncScene() {
    if (!mounted || destroyed) return;
    if (!animationAllowed()) {
      destroyScene();
      return;
    }

    if (!scene) {
      try {
        scene = createScene({ container, palette });
        scene.setPalette?.(palette);
        scene.resize();
        container.dataset.grainientMode = "webgl";
      } catch {
        destroyScene();
        return;
      }
    }
    syncLoop();
  }

  function handleIntersection(entries) {
    visible = entries[0]?.isIntersecting ?? false;
    syncLoop();
  }

  function handleResize() {
    scene?.resize();
  }

  function mount() {
    if (mounted || destroyed) return;
    mounted = true;
    container.dataset.grainientMode = "fallback";
    reducedMotionQuery = targetWindow.matchMedia(HOME_GRAINIENT_REDUCED_MOTION_QUERY);
    renderQuery = targetWindow.matchMedia(HOME_GRAINIENT_RENDER_QUERY);
    reducedMotionQuery.addEventListener("change", syncScene);
    renderQuery.addEventListener("change", syncScene);
    targetDocument.addEventListener("visibilitychange", syncLoop);

    if (targetWindow.IntersectionObserver) {
      intersectionObserver = new targetWindow.IntersectionObserver(handleIntersection, {
        rootMargin: "120px 0px"
      });
      intersectionObserver.observe(container);
    }

    if (targetWindow.ResizeObserver) {
      resizeObserver = new targetWindow.ResizeObserver(handleResize);
      resizeObserver.observe(container);
    } else {
      targetWindow.addEventListener("resize", handleResize, { passive: true });
    }

    syncScene();
  }

  function setPalette(nextPalette) {
    palette = nextPalette;
    scene?.setPalette?.(palette);
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    mounted = false;
    reducedMotionQuery?.removeEventListener("change", syncScene);
    renderQuery?.removeEventListener("change", syncScene);
    targetDocument.removeEventListener("visibilitychange", syncLoop);
    targetWindow.removeEventListener("resize", handleResize);
    intersectionObserver?.disconnect();
    resizeObserver?.disconnect();
    destroyScene();
  }

  return {
    mount,
    destroy,
    setPalette,
    getState: () => ({
      mounted,
      destroyed,
      visible,
      hasScene: Boolean(scene),
      frame,
      mode: container.dataset.grainientMode
    })
  };
}
