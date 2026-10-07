<script setup lang="ts">
import type { StyleValue } from 'vue'

withDefaults(
  defineProps<{
    style?: StyleValue
    dense?: boolean
  }>(),
  {
    style: () => ({}),
  },
)
</script>

<template>
  <div
    class="liquid-glass-container"
    :class="{ 'liquid-glass-container--dense': dense }"
    :style="style"
  >
    <div class="liquid-glass-container__specular" aria-hidden="true" />
    <div class="liquid-glass-container__content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.liquid-glass-container {
  --glass-bg: color-mix(in oklab, var(--card) 42%, transparent);
  --glass-shadow: rgba(22, 18, 10, 0.08);
  --glass-highlight: rgba(255, 255, 255, 0.18);

  position: relative;
  isolation: isolate;
  overflow: hidden;

  background: var(--glass-bg);

  /*
   * Liquid Glass-like optical treatment.
   * Blur is intentionally lower than classic glassmorphism.
   */
  backdrop-filter:
    blur(28px)
    saturate(170%)
    brightness(1.04);
  -webkit-backdrop-filter:
    blur(28px)
    saturate(170%)
    brightness(1.04);

  border-radius: 1.75rem;

  /*
   * Depth separation.
   */
  box-shadow:
    0 8px 24px var(--glass-shadow),
    0 2px 8px rgba(0, 0, 0, 0.04);

  padding: 6px;

  /*
   * Keep the material responsive to state changes.
   */
  transition:
    background 300ms ease,
    box-shadow 300ms ease,
    transform 300ms ease;
}

/*
 * Subtle specular light.
 *
 * This is intentionally very soft.
 * The goal is not to make it look like shiny glass,
 * but to create the slight optical highlight Apple uses.
 */
.liquid-glass-container__specular {
  position: absolute;
  inset: 0;
  z-index: 0;

  pointer-events: none;

  background:
    radial-gradient(
      120% 80% at 20% 0%,
      var(--glass-highlight),
      transparent 45%
    ),
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.08),
      transparent 35%
    );

  opacity: 0.8;
}

/*
 * Keep actual content above the optical layer.
 */
.liquid-glass-container__content {
  position: relative;
  z-index: 1;
}

/*
 * Dense glass should become slightly more substantial,
 * not simply opaque.
 */
.liquid-glass-container--dense {
  --glass-bg: color-mix(in oklab, var(--card) 62%, transparent);

  backdrop-filter:
    blur(30px)
    saturate(165%)
    brightness(1.02);
  -webkit-backdrop-filter:
    blur(30px)
    saturate(165%)
    brightness(1.02);

  box-shadow:
    0 10px 30px rgba(0, 0, 0, 0.12),
    0 2px 10px rgba(0, 0, 0, 0.05);
}

/* Dark appearance */
:global(.dark) .liquid-glass-container {
  --glass-bg: color-mix(in oklab, var(--card) 58%, transparent);
  --glass-shadow: rgba(0, 0, 0, 0.42);
  --glass-highlight: rgba(255, 255, 255, 0.10);

  backdrop-filter:
    blur(28px)
    saturate(160%);
  -webkit-backdrop-filter:
    blur(28px)
    saturate(160%);

  box-shadow:
    0 12px 36px var(--glass-shadow),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

:global(.dark) .liquid-glass-container__specular {
  background:
    radial-gradient(
      120% 80% at 20% 0%,
      var(--glass-highlight),
      transparent 45%
    ),
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.045),
      transparent 35%
    );

  opacity: 0.9;
}

:global(.dark) .liquid-glass-container--dense {
  --glass-bg: color-mix(in oklab, var(--card) 72%, transparent);
}

/*
 * Respect reduced motion preferences.
 */
@media (prefers-reduced-motion: reduce) {
  .liquid-glass-container {
    transition: none;
  }
}

/*
 * Respect reduced transparency.
 */
@media (prefers-reduced-transparency: reduce) {
  .liquid-glass-container {
    background: var(--card);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }

  .liquid-glass-container__specular {
    display: none;
  }
}
</style>