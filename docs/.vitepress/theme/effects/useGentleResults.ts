import { nextTick, onBeforeUnmount, watch, type Ref } from "vue";

// Snapshot the painted position, so interrupted filters continue from what is visible.
export function useGentleResults(root: Ref<HTMLElement | null>, items: Ref<unknown>) {
  const animations = new Set<Animation>();
  const ghosts = new Set<HTMLElement>();
  let revision = 0;
  function play(element: HTMLElement, frames: Keyframe[], duration: number, delay = 0) {
    const animation = element.animate(frames, { duration, delay, easing: "cubic-bezier(.2,.7,.25,1)", fill: "backwards" });
    animations.add(animation);
    animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
    return animation;
  }
  function clear() {
    animations.forEach(animation => animation.cancel());
    animations.clear();
    ghosts.forEach(ghost => ghost.remove());
    ghosts.clear();
  }
  watch(items, async () => {
    const current = ++revision;
    const container = root.value;
    if (!container) return;
    const before = new Map([...container.querySelectorAll<HTMLAnchorElement>(".library-result")]
      .filter(link => !link.inert).map(link => [link.href, { link, rect: link.getBoundingClientRect(), opacity: getComputedStyle(link).opacity }]));
    clear();
    await nextTick();
    if (current !== revision || !root.value || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = root.value.getBoundingClientRect();
    const visible = (rect: DOMRect) => rect.bottom > 0 && rect.top < innerHeight;
    let index = 0;
    for (const link of root.value.querySelectorAll<HTMLAnchorElement>(".library-result")) {
      const old = before.get(link.href);
      before.delete(link.href);
      const rect = link.getBoundingClientRect();
      if (!visible(rect)) continue;
      const dy = old ? old.rect.top - rect.top : 4;
      if (old && Math.abs(dy) < 1) continue;
      const nearby = old && visible(old.rect) && Math.abs(dy) < innerHeight / 2;
      play(link, [{ opacity: nearby ? old.opacity : 0, transform: `translateY(${nearby ? dy : 4}px)` }, { opacity: 1, transform: "translateY(0)" }], 360, old ? 0 : Math.min(80, index++ * 20));
    }
    for (const { link, rect, opacity } of before.values()) {
      if (!visible(rect)) continue;
      const ghost = link.cloneNode(true) as HTMLElement;
      ghost.inert = true;
      ghost.setAttribute("aria-hidden", "true");
      Object.assign(ghost.style, { position: "absolute", pointerEvents: "none", margin: "0", top: `${rect.top - bounds.top}px`, left: `${rect.left - bounds.left}px`, width: `${rect.width}px`, height: `${rect.height}px` });
      root.value.append(ghost);
      ghosts.add(ghost);
      play(ghost, [{ opacity }, { opacity: 0 }], 160).finished.then(() => { ghost.remove(); ghosts.delete(ghost); }, () => {});
    }
  }, { flush: "pre" });
  onBeforeUnmount(() => { revision++; clear(); });
}
