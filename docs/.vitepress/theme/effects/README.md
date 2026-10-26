# Local Vue Bits adaptations

Source: https://github.com/DavidHDev/vue-bits
Pinned revision: `3766ebeeed37ec35bce29f001b6d101c7b17da35`.
Copyright (c) 2025 David Haz. MIT + Commons Clause; the full license is shipped at
`docs/public/licenses/vue-bits/LICENSE`.

- `VariableProximity.vue`: adapts the character-distance/falloff algorithm from
  `src/content/TextAnimations/VariableProximity/VariableProximity.vue`. It inherits
  site typography, limits weight to 400–600, ignores touch/reduced motion, uses
  event-driven frames, and preserves the current home activation animation.
- `FadeContent.vue`: adapts the basic once-on-visible opacity reveal from
  `src/content/Animations/FadeContent/FadeContent.vue`, using IntersectionObserver
  and Web Animations. SSR stays visible, boot completion gates the first reveal,
  and teardown/reduced motion cancel animation.
- `useAnimatedSearchList.ts` and InlineSearch styles adapt the active-selection,
  opacity entrance and keyboard-aware list interaction from
  `src/content/Components/AnimatedList/AnimatedList.vue`. Existing search owns
  scrolling, IDs, semantics, matching and navigation. No imported icons are used.
- Native `.VPNavScreenMenuLink` staging adapts the staggered reveal from
  `src/content/Components/StaggeredMenu/StaggeredMenu.vue`. Existing VitePress
  navigation continues to own the menu, focus trap and Escape handling.

These are site-specific Vue adaptations, not wholesale upstream components.
GSAP/motion-v/React runtimes, demo fonts, decorative layers and extra scrolling
containers are not bundled. Shared duration tokens live in `styles/tokens.css`.
