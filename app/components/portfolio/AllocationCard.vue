<script setup lang="ts">
import type { Holding, Quote } from '#shared/types'
import { calculateHoldingMetrics } from '~/utils/calculations'
import { brandColorFor } from '~/utils/brand-colors'
import { useExchangeRates } from '~/composables/useExchangeRates'

const FALLBACK_COLORS = [
  '#444444',
  '#0092BC',
  '#76B900',
  '#00A1F1',
  '#FF9900',
  '#0064E0',
  '#F7931A',
]

const props = withDefaults(
  defineProps<{
    holdings: readonly Holding[]
    getQuote: (symbol: string) => Quote | null
    selectedSymbol?: string | null
  }>(),
  { selectedSymbol: null },
)

const emit = defineEmits<{
  (e: 'select', symbol: string | null): void
}>()

const { ensureLoaded: ensureRates, toUsd } = useExchangeRates()

const segments = computed<{ label: string; value: number; color: string }[]>(() => {
  const metrics = props.holdings.map((h) => {
    const m = calculateHoldingMetrics(h, props.getQuote(h.symbol))
    const cur = props.getQuote(h.symbol)?.currency ?? h.currency ?? 'USD'
    return { ...m, marketValue: toUsd(m.marketValue, cur) }
  })
  const total = metrics.reduce((s, m) => s + (m?.marketValue || 0), 0)
  return props.holdings.map((h, i) => {
    const mv = metrics[i]?.marketValue ?? 0
    const brand = brandColorFor(h.symbol)
    return {
      label: h.symbol,
      value: mv,
      color: brand ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length] ?? '#444444',
    }
  }).filter((s) => s.value > 0)
})

onMounted(ensureRates)

function toggle(symbol: string) {
  if (props.selectedSymbol === symbol) emit('select', null)
  else emit('select', symbol)
}
</script>

<template>
  <div class="rounded-2xl bg-card p-5 transition-all">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-semibold text-foreground">Allocation</h2>
      <button
        v-if="selectedSymbol"
        type="button"
        class="size-6 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
        aria-label="Clear filter"
        @click="emit('select', null)"
      >
        <svg viewBox="0 0 24 24" class="size-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div class="mt-1 flex flex-col items-center gap-3">
      <div class="relative">
        <Donut :segments="segments" :size="180" />
      </div>

      <!-- Legend chips -->
      <div class="flex flex-wrap items-center justify-center gap-1.5 max-w-xs">
        <button
          v-for="s in segments"
          :key="s.label"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors cursor-pointer"
          :class="selectedSymbol === s.label ? 'bg-muted' : 'bg-muted/40 hover:bg-muted'"
          :aria-pressed="selectedSymbol === s.label"
          @click="toggle(s.label)"
        >
          <span class="size-2 rounded-full" :style="{ backgroundColor: s.color }" aria-hidden="true" />
          <span class="text-[11px] font-medium text-foreground">{{ s.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
