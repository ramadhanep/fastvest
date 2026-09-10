<script setup lang="ts">
import type { StyleValue } from 'vue'

withDefaults(
  defineProps<{
    style?: StyleValue
    dense?: boolean
  }>(),
  { style: () => ({}) },
)
</script>

<template>
  <div
    class="liquid-glass-container"
    :class="{ 'liquid-glass-container--dense': dense }"
    :style="style"
  >
    <slot />
  </div>
</template>

<style scoped>
.liquid-glass-container {
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(48px) saturate(180%);
  -webkit-backdrop-filter: blur(48px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  border-radius: 1.75rem;
  overflow: hidden;
  padding: 6px;
  transition: background-color 500ms ease-out;
}

.liquid-glass-container--dense {
  background: rgba(255, 255, 255, 0.72);
}

:global(.dark) .liquid-glass-container {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

:global(.dark) .liquid-glass-container--dense {
  background: rgba(255, 255, 255, 0.12);
}
</style>
