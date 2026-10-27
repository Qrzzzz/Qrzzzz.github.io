<script setup lang="ts">
defineProps<{
  name: "arrow-up" | "arrow-right" | "arrow-left" | "arrow-up-right" | "search" | "delete" | "x" | "sun" | "moon" | "external-link" | "github";
}>();
</script>

<template>
  <span class="site-icon" :class="`site-icon--${name}`" aria-hidden="true" />
</template>
