import { ref } from "vue";

export function useLibraryResultMarker() {
  const resultsRef = ref<HTMLElement | null>(null);
  const markerRef = ref<HTMLElement | null>(null);
  let hoveredResult: HTMLElement | null = null;

  function resolveResult(target: EventTarget | null) {
    if (!(target instanceof Element)) return null;
    const result = target.closest<HTMLElement>(".library-result");
    if (!result || !resultsRef.value?.contains(result)) return null;
    return result;
  }

  function setMarkerGeometry(result: HTMLElement) {
    const marker = markerRef.value;
    if (!marker) return;

    marker.style.setProperty("--library-marker-y", `${result.offsetTop}px`);
    marker.style.setProperty("--library-marker-height", `${result.offsetHeight}px`);
  }

  function activateMarker(result: HTMLElement) {
    const marker = markerRef.value;
    if (!marker) return;

    if (!marker.classList.contains("is-active")) {
      marker.classList.add("is-preparing");
      setMarkerGeometry(result);
      marker.classList.remove("is-active");
      void marker.offsetHeight;
      marker.classList.remove("is-preparing");
    } else {
      setMarkerGeometry(result);
    }

    marker.classList.add("is-active");
  }

  function deactivateMarker() {
    markerRef.value?.classList.remove("is-active");
  }

  function focusedResult() {
    return resolveResult(document.activeElement);
  }

  function handlePointerOver(event: PointerEvent) {
    const result = resolveResult(event.target);
    if (!result) return;
    hoveredResult = result;
    activateMarker(result);
  }

  function handlePointerLeave() {
    hoveredResult = null;
    const focused = focusedResult();
    if (focused) activateMarker(focused);
    else deactivateMarker();
  }

  function handleFocusIn(event: FocusEvent) {
    const result = resolveResult(event.target);
    if (result) activateMarker(result);
  }

  function handleFocusOut(event: FocusEvent) {
    const nextFocused = resolveResult(event.relatedTarget);
    if (nextFocused) {
      activateMarker(nextFocused);
      return;
    }

    if (hoveredResult?.isConnected) activateMarker(hoveredResult);
    else deactivateMarker();
  }

  return {
    resultsRef,
    markerRef,
    handlePointerOver,
    handlePointerLeave,
    handleFocusIn,
    handleFocusOut
  };
}
