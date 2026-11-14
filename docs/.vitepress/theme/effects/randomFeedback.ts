export function createRandomFeedback() {
  const cleanups = new Set<() => void>();
  function click(event: MouseEvent) {
    if (event.button || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href$="/random.html"], a[href$="/random"]') : null;
    if (!link || link.querySelector("[data-random-feedback]")) return;
    const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
    let text: Text | undefined;
    while (walker.nextNode()) {
      if (walker.currentNode.textContent?.trim() === "Random") { text = walker.currentNode as Text; break; }
    }
    if (!text) return;
    const original = text;
    const wrapper = document.createElement("span");
    wrapper.dataset.randomFeedback = "";
    const label = link.getAttribute("aria-label");
    link.setAttribute("aria-label", label || "Random");
    wrapper.setAttribute("aria-hidden", "true");
    const animations = [...original.data].map((letter, index) => {
      const span = document.createElement("span");
      span.textContent = letter;
      span.style.display = "inline-block";
      wrapper.append(span);
      return { span, index };
    });
    original.replaceWith(wrapper);
    const running = animations.map(({ span, index }) => span.animate([
      { transform: "translateY(0) rotate(0deg)" },
      { transform: `translateY(${index % 2 ? -2 : 2}px) rotate(${index % 2 ? 2 : -2}deg)`, offset: .35 },
      { transform: "translateY(0) rotate(0deg)" }
    ], { duration: 300, easing: "cubic-bezier(.2,.7,.25,1)" }));
    const cleanup = () => {
      running.forEach(animation => animation.cancel());
      wrapper.replaceWith(original);
      if (label === null) link.removeAttribute("aria-label");
      else link.setAttribute("aria-label", label);
      cleanups.delete(cleanup);
    };
    cleanups.add(cleanup);
    void Promise.all(running.map(animation => animation.finished)).then(cleanup, cleanup);
  }
  return {
    mount() { document.addEventListener("click", click, true); },
    destroy() { document.removeEventListener("click", click, true); [...cleanups].forEach(cleanup => cleanup()); }
  };
}
