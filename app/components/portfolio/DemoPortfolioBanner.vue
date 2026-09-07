<script setup lang="ts">
import { Plus, Trash2, X, Info } from '@lucide/vue'

const emit = defineEmits<{
  add: []
  clear: []
  dismiss: []
}>()
</script>

<template>
  <div
    class="relative rounded-3xl border border-border/80 bg-muted/30 p-4 sm:p-5 transition-all"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="flex items-center gap-2">
        <span
          class="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground border border-border/60"
        >
          <Info class="size-3.5 text-muted-foreground" />
          Sample Demo Data
        </span>
      </div>
      <button
        type="button"
        class="size-7 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer ios-press"
        aria-label="Dismiss demo info"
        @click="emit('dismiss')"
      >
        <X class="size-3.5" />
      </button>
    </div>

    <p class="mt-2.5 text-xs text-muted-foreground leading-relaxed">
      This starter portfolio contains simulated data so you can test charts and price updates. You can edit quantities, delete holdings, or add your real investments anytime.
    </p>

    <div class="mt-3.5 flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-3.5 py-1.5 text-xs font-medium hover:opacity-90 transition-all ios-press cursor-pointer"
        @click="emit('add')"
      >
        <Plus class="size-3.5" />
        Add Asset
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors ios-press cursor-pointer"
        @click="emit('clear')"
      >
        <Trash2 class="size-3.5" />
        Start from Scratch
      </button>
    </div>
  </div>
</template>
