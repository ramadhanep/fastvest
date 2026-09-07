<script setup lang="ts">
import { Plus, Layers } from '@lucide/vue'

const emit = defineEmits<{
  add: []
  loadDemo: []
}>()

const quickPicks = ['AAPL', 'NVDA', 'BTC-USD', 'SPY', 'BBCA.JK']
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 px-4 text-center">
    <div
      class="flex items-center justify-center size-16 rounded-2xl border border-border/80 bg-muted/40 mb-4"
    >
      <Layers class="size-7 text-muted-foreground" aria-hidden="true" />
    </div>

    <h1 class="text-xl font-semibold tracking-tight text-foreground">
      Portfolio is empty
    </h1>
    <p class="mt-1.5 max-w-xs text-xs text-muted-foreground leading-relaxed">
      Track US equities, crypto, and IDX stocks with live price updates. Stored locally on this device.
    </p>

    <!-- CTAs -->
    <div class="mt-6 flex flex-col sm:flex-row items-center gap-2.5 w-full max-w-xs">
      <button
        type="button"
        class="w-full inline-flex items-center justify-center gap-1.5 h-11 rounded-full bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-all ios-press cursor-pointer"
        @click="emit('add')"
      >
        <Plus class="size-4" />
        Add Holding
      </button>

      <button
        type="button"
        class="w-full inline-flex items-center justify-center gap-1.5 h-11 rounded-full border border-border/80 bg-background px-4 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all ios-press cursor-pointer"
        @click="emit('loadDemo')"
      >
        Load Demo
      </button>
    </div>

    <!-- Quick suggestions -->
    <div class="mt-8 flex flex-wrap items-center justify-center gap-1.5 max-w-xs">
      <span class="text-xs text-muted-foreground mr-1">Try:</span>
      <button
        v-for="sym in quickPicks"
        :key="sym"
        type="button"
        class="px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted text-xs text-foreground/80 hover:text-foreground transition-colors cursor-pointer ios-press"
        @click="emit('add')"
      >
        {{ sym }}
      </button>
    </div>
  </div>
</template>
