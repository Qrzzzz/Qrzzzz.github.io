// Measure line boxes without splitting text, and keep each heading alive through its exit.
type MarkerState = {
  element: HTMLElement;
  strokes: HTMLElement[];
  widths: number[];
  totalWidth: number;
  progress: number;
  target: number;
  frame: number;
  measureUntil: number;
  observer: ResizeObserver;
};

export function createHeadingMarker() {
  const states = new Map<HTMLElement, MarkerState>();
  const selector = ".site-layout h1, .site-layout h2";
  let preference: MediaQueryList;

  function heading(target: EventTarget | null) {
    const element = target instanceof Element ? target.closest<HTMLElement>(selector) : null;
    return element?.querySelector(":scope > .heading-feedback") ? element : undefined;
  }

  function dispose(state: MarkerState) {
    cancelAnimationFrame(state.frame);
    state.observer.disconnect();
    state.strokes.forEach(stroke => stroke.remove());
    // The CSS fallback stays disabled, including while its hover transition settles.
    states.delete(state.element);
  }

  function clear() {
    [...states.values()].forEach(dispose);
  }

  function draw(state: MarkerState) {
    let remaining = state.progress * state.totalWidth;
    state.strokes.forEach((stroke, index) => {
      const width = state.widths[index];
      const scale = width ? Math.max(0, Math.min(1, remaining / width)) : 0;
      stroke.style.transform = `scaleX(${scale})`;
      remaining -= width;
    });
  }

  function measure(state: MarkerState) {
    const element = state.element;
    const label = element.querySelector<HTMLElement>(":scope > .heading-feedback");
    if (!element.isConnected || !label) { dispose(state); return; }
    const bounds = element.getBoundingClientRect();
    const fontSize = parseFloat(getComputedStyle(element).fontSize);
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
    while (state.strokes.length > rows.length) state.strokes.pop()!.remove();
    while (state.strokes.length < rows.length) {
      const stroke = document.createElement("span");
      stroke.className = "heading-marker-stroke";
      stroke.setAttribute("aria-hidden", "true");
      element.append(stroke);
      state.strokes.push(stroke);
    }
    state.widths = rows.map(row => row.right - row.left);
    state.totalWidth = state.widths.reduce((sum, width) => sum + width, 0);
    rows.forEach((row, index) => Object.assign(state.strokes[index].style, {
      left: `${row.left - bounds.left - element.clientLeft}px`,
      top: `${row.bottom - bounds.top - element.clientTop - fontSize * .38}px`,
      width: `${state.widths[index]}px`,
      height: `${fontSize * .38}px`
    }));
    draw(state);
  }

  function move(state: MarkerState, target: number) {
    if (state.target === target && (state.frame || state.progress === target)) return;
    cancelAnimationFrame(state.frame);
    state.frame = 0;
    state.target = target;
    if (preference.matches) {
      state.progress = target;
      if (target) measure(state);
      else dispose(state);
      return;
    }
    const started = performance.now();
    const from = state.progress;
    const entering = Math.min(900, Math.max(320, state.totalWidth * .7));
    const duration = (target ? entering : 220) * Math.abs(target - from);
    state.measureUntil = started + 360;
    function step(now: number) {
      state.frame = 0;
      if (!state.element.isConnected) { dispose(state); return; }
      const time = duration ? Math.min(1, (now - started) / duration) : 1;
      const eased = target ? time : 1 - (1 - time) ** 2;
      state.progress = from + (target - from) * eased;
      if (now < state.measureUntil) measure(state);
      else draw(state);
      if (!states.has(state.element)) return;
      if (time === 1 && !target) { dispose(state); return; }
      if (time < 1 || now < state.measureUntil) state.frame = requestAnimationFrame(step);
    }
    state.frame = requestAnimationFrame(step);
  }

  function enter(event: Event) {
    if (event instanceof PointerEvent && (!matchMedia("(hover: hover)").matches || event.pointerType === "touch")) return;
    const element = heading(event.target);
    if (!element) return;
    let state = states.get(element);
    if (!state) {
      const observer = new ResizeObserver(() => {
        const current = states.get(element);
        if (current) measure(current);
      });
      state = { element, observer, strokes: [], widths: [], totalWidth: 0, progress: 0, target: 0, frame: 0, measureUntil: 0 };
      states.set(element, state);
      element.dataset.sequentialMarker = "";
      measure(state);
      observer.observe(element);
    }
    move(state, 1);
  }

  function leave(event: Event) {
    const element = heading(event.target);
    if (!element) return;
    const state = states.get(element);
    if (!state) return;
    const related = (event as MouseEvent | FocusEvent).relatedTarget;
    if (related instanceof Node && element.contains(related)) return;
    if (element.matches(":hover, :focus-within")) return;
    move(state, 0);
  }

  function reduceMotion() {
    if (!preference.matches) return;
    [...states.values()].forEach(state => {
      cancelAnimationFrame(state.frame);
      state.frame = 0;
      state.progress = state.target;
      if (state.target) measure(state);
      else dispose(state);
    });
  }

  return {
    mount() {
      preference = matchMedia("(prefers-reduced-motion: reduce)");
      preference.addEventListener("change", reduceMotion);
      document.addEventListener("pointerover", enter);
      document.addEventListener("pointerout", leave);
      document.addEventListener("focusin", enter);
      document.addEventListener("focusout", leave);
    },
    sync: clear,
    destroy() {
      clear();
      preference.removeEventListener("change", reduceMotion);
      document.removeEventListener("pointerover", enter);
      document.removeEventListener("pointerout", leave);
      document.removeEventListener("focusin", enter);
      document.removeEventListener("focusout", leave);
    }
  };
}
