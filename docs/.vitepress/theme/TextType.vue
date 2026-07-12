<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

type VariableSpeed = {
  min: number;
  max: number;
};

const props = withDefaults(
  defineProps<{
    text: string | string[];
    as?: string;
    typingSpeed?: number;
    initialDelay?: number;
    pauseDuration?: number;
    deletingSpeed?: number;
    loop?: boolean;
    showCursor?: boolean;
    hideCursorWhileTyping?: boolean;
    cursorCharacter?: string;
    cursorBlinkDuration?: number;
    textColors?: string[];
    variableSpeed?: VariableSpeed;
    startOnVisible?: boolean;
    reverseMode?: boolean;
  }>(),
  {
    as: "span",
    typingSpeed: 50,
    initialDelay: 0,
    pauseDuration: 2000,
    deletingSpeed: 30,
    loop: true,
    showCursor: true,
    hideCursorWhileTyping: false,
    cursorCharacter: "|",
    cursorBlinkDuration: 0.5,
    textColors: () => [],
    variableSpeed: undefined,
    startOnVisible: false,
    reverseMode: false
  }
);

const emit = defineEmits<{
  sentenceComplete: [sentence: string, index: number];
}>();

const container = ref<HTMLElement | null>(null);
const displayedText = ref("");
const currentTextIndex = ref(0);
const isDeleting = ref(false);
const isVisible = ref(!props.startOnVisible);
const prefersReducedMotion = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;
let observer: IntersectionObserver | undefined;

const textArray = computed(() =>
  (Array.isArray(props.text) ? props.text : [props.text]).filter(Boolean)
);
const currentText = computed(() => textArray.value[currentTextIndex.value] ?? "");
const processedText = computed(() =>
  props.reverseMode ? [...currentText.value].reverse().join("") : currentText.value
);
const isActivelyTyping = computed(
  () => displayedText.value.length < processedText.value.length || isDeleting.value
);
const textColor = computed(() => {
  if (!props.textColors.length) return "inherit";
  return props.textColors[currentTextIndex.value % props.textColors.length];
});

function clearTimer() {
  if (timer) clearTimeout(timer);
  timer = undefined;
}

function typingDelay() {
  if (!props.variableSpeed) return props.typingSpeed;
  const { min, max } = props.variableSpeed;
  return Math.random() * (max - min) + min;
}

function schedule(delay: number, callback: () => void) {
  clearTimer();
  timer = setTimeout(callback, Math.max(0, delay));
}

function advance() {
  if (!isVisible.value || prefersReducedMotion.value || !currentText.value) return;

  if (isDeleting.value) {
    if (displayedText.value) {
      schedule(props.deletingSpeed, () => {
        displayedText.value = displayedText.value.slice(0, -1);
        advance();
      });
      return;
    }

    emit("sentenceComplete", currentText.value, currentTextIndex.value);
    const isLastSentence = currentTextIndex.value === textArray.value.length - 1;
    if (isLastSentence && !props.loop) return;

    isDeleting.value = false;
    currentTextIndex.value = (currentTextIndex.value + 1) % textArray.value.length;
    schedule(props.initialDelay, advance);
    return;
  }

  if (displayedText.value.length < processedText.value.length) {
    schedule(typingDelay(), () => {
      displayedText.value += processedText.value[displayedText.value.length] ?? "";
      advance();
    });
    return;
  }

  const isLastSentence = currentTextIndex.value === textArray.value.length - 1;
  if (isLastSentence && !props.loop) {
    emit("sentenceComplete", currentText.value, currentTextIndex.value);
    return;
  }

  schedule(props.pauseDuration, () => {
    isDeleting.value = true;
    advance();
  });
}

function restart() {
  clearTimer();
  currentTextIndex.value = 0;
  displayedText.value = prefersReducedMotion.value ? currentText.value : "";
  isDeleting.value = false;
  if (!prefersReducedMotion.value && isVisible.value) {
    schedule(props.initialDelay, advance);
  }
}

onMounted(() => {
  prefersReducedMotion.value = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion.value) {
    restart();
    return;
  }

  if (props.startOnVisible && container.value) {
    observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          isVisible.value = true;
          observer?.disconnect();
          schedule(props.initialDelay, advance);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(container.value);
  } else {
    restart();
  }
});

watch(() => props.text, restart, { deep: true });

onBeforeUnmount(() => {
  clearTimer();
  observer?.disconnect();
});
</script>

<template>
  <component
    :is="as"
    ref="container"
    class="text-type"
    :style="{ '--text-type-cursor-duration': `${cursorBlinkDuration}s` }"
  >
    <span class="text-type__content" :style="{ color: textColor }">{{ displayedText }}</span>
    <span
      v-if="showCursor && !prefersReducedMotion"
      class="text-type__cursor"
      :class="{ 'text-type__cursor--hidden': hideCursorWhileTyping && isActivelyTyping }"
      aria-hidden="true"
    >{{ cursorCharacter }}</span>
  </component>
</template>

<style scoped>
.text-type__cursor {
  animation: text-type-cursor-blink var(--text-type-cursor-duration) ease-in-out infinite alternate;
}

.text-type__cursor--hidden {
  visibility: hidden;
}

@keyframes text-type-cursor-blink {
  to {
    opacity: 0;
  }
}
</style>
