<script setup lang="ts">
import { useLibraryResultMarker } from "./useLibraryResultMarker";
const { resultsRef, markerRef, handlePointerOver, handlePointerLeave, handleFocusIn, handleFocusOut } = useLibraryResultMarker(".catalog-entry");
</script>
<template>
  <div ref="resultsRef" class="catalog-list" @pointerover="handlePointerOver" @pointerleave="handlePointerLeave" @focusin="handleFocusIn" @focusout="handleFocusOut">
    <span ref="markerRef" class="library-result-marker" aria-hidden="true"><span class="library-result-marker__ink"></span></span>
    <slot />
  </div>
</template>
<style scoped>.catalog-list { position: relative; min-width: 0; }</style>
