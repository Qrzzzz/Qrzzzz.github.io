import { nextTick, onBeforeUnmount, watch, type Ref } from "vue";

// Snapshot the painted position, so interrupted filters continue from what is visible.
export function useGentleResults(root: Ref<HTMLElement | null>, items: Ref<unknown>, query: Ref<string>) {
  const animations = new Set<Animation>();
  const ghosts = new Map<string, { element: HTMLElement; animation: Animation }>();
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
    ghosts.forEach(({ element, animation }) => { animation.cancel(); element.remove(); });
    ghosts.clear();
  }
  watch([items, query], async ([, term], [, previousTerm]) => {
    const current = ++revision;
    const container = root.value;
    if (!container) return;
    const before = new Map([...container.querySelectorAll<HTMLAnchorElement>(".library-result")]
      .filter(link => !link.inert).map(link => [link.href, { link, rect: link.getBoundingClientRect(), opacity: getComputedStyle(link).opacity }]));
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { clear(); return; }
    // Keep outgoing rows alive across keystrokes so they can finish or rejoin.
    for (const animation of animations) {
      const target = (animation.effect as KeyframeEffect | null)?.target;
      if (target instanceof HTMLElement && !target.inert) animation.cancel();
    }
    const typing = term !== previousTerm;
    await nextTick();
    if (current !== revision || !root.value) return;
    const bounds = root.value.getBoundingClientRect();
    const visible = (rect: DOMRect) => rect.bottom > 0 && rect.top < innerHeight;
    let index = 0;
    for (const link of root.value.querySelectorAll<HTMLAnchorElement>(".library-result")) {
      const retiring = ghosts.get(link.href);
      const old = before.get(link.href) ?? (retiring && {
        rect: retiring.element.getBoundingClientRect(),
        opacity: getComputedStyle(retiring.element).opacity
      });
      if (retiring) {
        retiring.animation.cancel();
        retiring.element.remove();
        ghosts.delete(link.href);
      }
      before.delete(link.href);
      const rect = link.getBoundingClientRect();
      if (!visible(rect)) continue;
      const dy = old ? old.rect.top - rect.top : 4;
      if (old && Math.abs(dy) < 1 && Number(old.opacity) >= .99) continue;
      const nearby = old && visible(old.rect) && Math.abs(dy) < innerHeight / 2;
      play(link, [{ opacity: old && visible(old.rect) ? old.opacity : 0, transform: `translateY(${nearby ? dy : 4}px)` }, { opacity: 1, transform: "translateY(0)" }], typing ? 200 : 360, old || typing ? 0 : Math.min(80, index++ * 20));
    }
    for (const { link, rect, opacity } of before.values()) {
      if (!visible(rect)) continue;
      const ghost = link.cloneNode(true) as HTMLElement;
      ghost.inert = true;
      ghost.setAttribute("aria-hidden", "true");
      Object.assign(ghost.style, { position: "absolute", pointerEvents: "none", margin: "0", top: `${rect.top - bounds.top}px`, left: `${rect.left - bounds.left}px`, width: `${rect.width}px`, height: `${rect.height}px` });
      root.value.append(ghost);
      const animation = play(ghost, [{ opacity }, { opacity: 0 }], typing ? 110 : 160);
      ghosts.set(link.href, { element: ghost, animation });
      animation.finished.then(() => { ghost.remove(); ghosts.delete(link.href); }, () => {});
    }
  }, { flush: "pre" });
  onBeforeUnmount(() => { revision++; clear(); });
}
