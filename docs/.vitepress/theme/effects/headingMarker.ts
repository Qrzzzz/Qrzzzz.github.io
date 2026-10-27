// Measure rendered line fragments without splitting text or changing heading anchors.
export function createHeadingMarker() {
  let active: HTMLElement | undefined;
  let observer: ResizeObserver | undefined;
  let frame = 0;
  let strokes: HTMLElement[] = [];
  const selector = ".site-layout h1, .site-layout h2";

  function heading(target: EventTarget | null) {
    const element = target instanceof Element ? target.closest<HTMLElement>(selector) : null;
    return element?.querySelector(":scope > .heading-feedback") ? element : undefined;
  }

  function clear() {
    cancelAnimationFrame(frame);
    observer?.disconnect();
    strokes.forEach(stroke => { stroke.getAnimations().forEach(animation => animation.cancel()); stroke.remove(); });
    strokes = [];
    active = undefined;
  }

  function paint(restart = false) {
    if (!active?.isConnected) { clear(); return; }
    const label = active.querySelector<HTMLElement>(":scope > .heading-feedback")!;
    const bounds = active.getBoundingClientRect();
    const fontSize = parseFloat(getComputedStyle(active).fontSize);
    const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
    const rows: { left: number; right: number; top: number; bottom: number }[] = [];
    const range = document.createRange();
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent?.trim() || node.parentElement?.closest(".header-anchor")) continue;
      range.selectNodeContents(node);
      for (const rect of range.getClientRects()) {
        if (!rect.width || !rect.height) continue;
        const row = rows.find(item => Math.abs(item.top - rect.top) < fontSize * .45);
        if (row) {
          row.left = Math.min(row.left, rect.left);
          row.right = Math.max(row.right, rect.right);
          row.bottom = Math.max(row.bottom, rect.bottom);
        } else rows.push({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom });
      }
    }
    rows.sort((a, b) => a.top - b.top);
    restart ||= rows.length !== strokes.length;
    if (restart) {
      strokes.forEach(stroke => { stroke.getAnimations().forEach(animation => animation.cancel()); stroke.remove(); });
      strokes = rows.map(() => {
        const stroke = document.createElement("span");
        stroke.className = "heading-marker-stroke";
        stroke.setAttribute("aria-hidden", "true");
        active!.append(stroke);
        return stroke;
      });
    }
    const totalWidth = rows.reduce((sum, row) => sum + row.right - row.left, 0);
    const totalDuration = Math.min(900, Math.max(320, totalWidth * .7));
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let delay = 0;
    rows.forEach((row, index) => {
      const stroke = strokes[index];
      Object.assign(stroke.style, {
        left: `${row.left - bounds.left - active!.clientLeft}px`,
        top: `${row.bottom - bounds.top - active!.clientTop - fontSize * .44}px`,
        width: `${row.right - row.left}px`, height: `${fontSize * .38}px`
      });
      if (!restart) return;
      const duration = totalWidth ? totalDuration * (row.right - row.left) / totalWidth : 0;
      if (!reduced) stroke.animate(
        [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
        { duration, delay, easing: "linear", fill: "both" }
      );
      delay += duration;
    });
  }

  function activate(element: HTMLElement) {
    if (active === element) return;
    clear();
    active = element;
    element.dataset.sequentialMarker = "";
    paint(true);
    // Track variable-font geometry during its existing weight transition, then stop.
    const until = performance.now() + 360;
    const followWeight = () => {
      paint();
      if (active && performance.now() < until) frame = requestAnimationFrame(followWeight);
    };
    frame = requestAnimationFrame(followWeight);
    observer = new ResizeObserver(() => paint());
    observer.observe(element);
  }

  function enter(event: Event) {
    if (event instanceof PointerEvent && (!matchMedia("(hover: hover)").matches || event.pointerType === "touch")) return;
    const element = heading(event.target);
    if (element) activate(element);
  }

  function leave(event: Event) {
    const related = (event as MouseEvent | FocusEvent).relatedTarget;
    if (!active || (related instanceof Node && active.contains(related))) return;
    if (active.matches(":hover, :focus-within")) return;
    clear();
  }

  return {
    mount() {
      document.addEventListener("pointerover", enter);
      document.addEventListener("pointerout", leave);
      document.addEventListener("focusin", enter);
      document.addEventListener("focusout", leave);
    },
    sync: clear,
    destroy() {
      clear();
      document.removeEventListener("pointerover", enter);
      document.removeEventListener("pointerout", leave);
      document.removeEventListener("focusin", enter);
      document.removeEventListener("focusout", leave);
    }
  };
}
