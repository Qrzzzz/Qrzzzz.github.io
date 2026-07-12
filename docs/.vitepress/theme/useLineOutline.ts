import { nextTick, onBeforeUnmount, onMounted, watch } from "vue";
import { useData } from "vitepress";

const proximityRadius = 104;
const maximumShift = 18;
const nestedMaximumShift = 9;

function outlineLevel(link: HTMLAnchorElement) {
  const id = link.hash.slice(1);
  if (!id) return "2";

  try {
    return document.getElementById(decodeURIComponent(id))?.tagName === "H3" ? "3" : "2";
  } catch {
    return "2";
  }
}

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
      const nested = link.dataset.outlineLevel === "3";
      const nestedList = nested
        ? link.closest<HTMLElement>(".VPDocOutlineItem.nested")
        : undefined;
      if (nestedList && nestedList.clientHeight === 0) {
        link.style.removeProperty("--line-outline-proximity");
        link.style.removeProperty("--line-outline-shift");
        continue;
      }

      const bounds = link.getBoundingClientRect();
      const distance = Math.abs(event.clientY - (bounds.top + bounds.height / 2));
      const linear = Math.max(0, 1 - distance / proximityRadius);
      const proximity = linear * linear * (3 - 2 * linear);
      const shift = nested ? nestedMaximumShift : maximumShift;

      link.style.setProperty("--line-outline-proximity", proximity.toFixed(3));
      link.style.setProperty(
        "--line-outline-shift",
        `${(proximity * shift).toFixed(2)}px`
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
    const shift = target.dataset.outlineLevel === "3" ? nestedMaximumShift : maximumShift;
    target.style.setProperty("--line-outline-proximity", "1");
    target.style.setProperty("--line-outline-shift", `${shift}px`);
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
    for (const link of links) link.removeAttribute("data-outline-level");
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
    for (const link of links) {
      link.dataset.outlineLevel = outlineLevel(link);
    }
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
