import { nextTick, onBeforeUnmount, onMounted, watch } from "vue";
import { useData } from "vitepress";

const proximityRadius = 104;
const maximumShift = 18;

export function useLineOutline() {
  const { page } = useData();
  let outline: HTMLElement | undefined;
  let links: HTMLAnchorElement[] = [];
  let syncFrame = 0;

  function resetLinks() {
    for (const link of links) {
      link.style.removeProperty("--line-outline-proximity");
      link.style.removeProperty("--line-outline-shift");
    }
  }

  function handlePointerMove(event: PointerEvent) {
    if (event.pointerType === "touch") return;

    for (const link of links) {
      const bounds = link.getBoundingClientRect();
      const distance = Math.abs(event.clientY - (bounds.top + bounds.height / 2));
      const linear = Math.max(0, 1 - distance / proximityRadius);
      const proximity = linear * linear * (3 - 2 * linear);

      link.style.setProperty("--line-outline-proximity", proximity.toFixed(3));
      link.style.setProperty(
        "--line-outline-shift",
        `${(proximity * maximumShift).toFixed(2)}px`
      );
    }
  }

  function handlePointerLeave() {
    resetLinks();
  }

  function handleFocusIn(event: FocusEvent) {
    resetLinks();
    const target = event.target;
    if (!(target instanceof HTMLAnchorElement) || !links.includes(target)) return;
    target.style.setProperty("--line-outline-proximity", "1");
    target.style.setProperty("--line-outline-shift", `${maximumShift}px`);
  }

  function handleFocusOut(event: FocusEvent) {
    if (outline?.contains(event.relatedTarget as Node | null)) return;
    resetLinks();
  }

  function detachOutline() {
    if (!outline) return;
    outline.removeEventListener("pointermove", handlePointerMove);
    outline.removeEventListener("pointerleave", handlePointerLeave);
    outline.removeEventListener("focusin", handleFocusIn);
    outline.removeEventListener("focusout", handleFocusOut);
    outline.classList.remove("line-outline");
    resetLinks();
    outline = undefined;
    links = [];
  }

  function attachOutline() {
    const nextOutline = document.querySelector<HTMLElement>(
      ".VPDocAsideOutline.has-outline"
    );

    if (outline !== nextOutline) detachOutline();
    if (!nextOutline) return;

    outline = nextOutline;
    links = Array.from(outline.querySelectorAll<HTMLAnchorElement>(".outline-link"));
    outline.classList.add("line-outline");
    outline.addEventListener("pointermove", handlePointerMove, { passive: true });
    outline.addEventListener("pointerleave", handlePointerLeave);
    outline.addEventListener("focusin", handleFocusIn);
    outline.addEventListener("focusout", handleFocusOut);
  }

  function scheduleSync() {
    if (syncFrame) window.cancelAnimationFrame(syncFrame);
    nextTick(() => {
      syncFrame = window.requestAnimationFrame(() => {
        syncFrame = 0;
        detachOutline();
        attachOutline();
      });
    });
  }

  onMounted(scheduleSync);
  watch(() => page.value.relativePath, scheduleSync, { flush: "post" });
  onBeforeUnmount(() => {
    if (syncFrame) window.cancelAnimationFrame(syncFrame);
    detachOutline();
  });
}
