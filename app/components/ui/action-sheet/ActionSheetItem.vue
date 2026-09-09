<script setup lang="ts">
defineProps<{
  destructive?: boolean
}>()
</script>

<template>
  <button
    type="button"
    class="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-colors ios-press cursor-pointer"
    :class="destructive
      ? 'text-destructive hover:bg-destructive/5 active:bg-destructive/10'
      : 'text-foreground hover:bg-muted/50 active:bg-muted'
    "
  >
    <slot />
  </button>
</template>
