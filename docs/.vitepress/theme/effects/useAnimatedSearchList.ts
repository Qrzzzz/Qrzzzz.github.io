// Selection geometry from Vue Bits AnimatedList, adapted to the existing combobox/listbox.
import { nextTick, onBeforeUnmount, ref, watch, type Ref, type WatchSource } from "vue";
export function useAnimatedSearchList(root: Ref<HTMLElement | undefined>, selected: Ref<number>, items: WatchSource<unknown>) {
  const selectionStyle = ref<Record<string, string>>({ opacity: "0" });
  const selectionReady = ref(false);
  let observer: ResizeObserver | undefined;
  let frame = 0;
  let disposed = false;
  function sync() {
    if (disposed) return;
    const option = root.value?.querySelectorAll<HTMLElement>(".inline-search-result")[selected.value];
    if (!root.value || !option) {
      selectionStyle.value = { opacity: "0" };
      selectionReady.value = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      return;
    }
    const bounds = option.getBoundingClientRect();
    const container = root.value.getBoundingClientRect();
    selectionStyle.value = { opacity: "1", height: `${bounds.height}px`, transform: `translateY(${bounds.top - container.top}px)` };
    if (!selectionReady.value && !frame) frame = requestAnimationFrame(() => { frame = 0; selectionReady.value = true; });
  }
  watch([root, selected, items], () => { void nextTick(sync); }, { flush: "post" });
  watch(root, element => {
    observer?.disconnect();
    if (element && typeof ResizeObserver !== "undefined") { observer = new ResizeObserver(sync); observer.observe(element); }
  }, { flush: "post" });
  onBeforeUnmount(() => {
    disposed = true;
    observer?.disconnect();
    if (frame) cancelAnimationFrame(frame);
  });
  return { selectionStyle, selectionReady, syncSelection: sync };
}
