import { nextTick, onBeforeUnmount, onMounted, watch, type Ref } from "vue";
import { prefetchLink } from "./prefetchPage";

/** Warm only visible reading destinations, one low-priority request at a time. */
export function useVisiblePagePrefetch(root: Ref<HTMLElement | null>, items: Ref<unknown>) {
  let observer: IntersectionObserver | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active: HTMLLinkElement | undefined;
  let disposed = false;
  const visible = new Set<HTMLAnchorElement>();
  const attempted = new Set<string>();
  function schedule() {
    clearTimeout(timer);
    if (!disposed && !document.hidden) timer = setTimeout(pump, 600);
  }
  function settled() {
    active?.removeEventListener("load", settled);
    active?.removeEventListener("error", settled);
    active = undefined;
    schedule();
  }
  function pump() {
    if (disposed || active || document.hidden) return;
    for (const link of visible) {
      if (!link.isConnected || attempted.has(link.href)) continue;
      attempted.add(link.href);
      active = prefetchLink(link, "low");
      if (active) {
        active.addEventListener("load", settled);
        active.addEventListener("error", settled);
        return;
      }
    }
  }
  function observe() {
    observer?.disconnect();
    visible.clear();
    root.value?.querySelectorAll<HTMLAnchorElement>("a.library-result[href]").forEach(link => observer?.observe(link));
  }
  onMounted(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (connection?.saveData || /2g/.test(connection?.effectiveType ?? "") || !("IntersectionObserver" in window)) return;
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const link = entry.target as HTMLAnchorElement;
        if (entry.isIntersecting) visible.add(link); else visible.delete(link);
      }
      schedule();
    });
    observe();
    document.addEventListener("visibilitychange", schedule);
  });
  watch(items, () => nextTick(observe), { flush: "post" });
  onBeforeUnmount(() => {
    disposed = true;
    observer?.disconnect();
    clearTimeout(timer);
    active?.removeEventListener("load", settled);
    active?.removeEventListener("error", settled);
    document.removeEventListener("visibilitychange", schedule);
  });
}
