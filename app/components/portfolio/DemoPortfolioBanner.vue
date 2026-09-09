<script setup lang="ts">
import { X } from '@lucide/vue'

const emit = defineEmits<{
  add: []
  clear: []
  dismiss: []
}>()
</script>

<template>
  <div class="relative rounded-2xl border border-border/50 bg-muted/30 p-3.5 transition-all">
    <div class="flex items-center justify-between gap-3">
      <p class="text-xs text-muted-foreground leading-relaxed flex-1">
        Sample data loaded. Add your real investments or start fresh.
      </p>
      <button
        type="button"
        class="size-6 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer ios-press shrink-0"
        aria-label="Dismiss"
        @click="emit('dismiss')"
      >
        <X class="size-3.5" />
      </button>
    </div>
  </div>
</template>
