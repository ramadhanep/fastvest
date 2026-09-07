<script setup lang="ts">
import type { Holding, Quote } from '#shared/types'
import { calculateHoldingMetrics } from '~/utils/calculations'
import { brandColorFor } from '~/utils/brand-colors'
import { formatCurrency } from '~/utils/format'
import AssetIcon from './AssetIcon.vue'

interface DonutSegment {
  label: string
  value: number
  color: string
}

const props = defineProps<{
  holdings: readonly Holding[]
  getQuote: (symbol: string) => Quote | null
  selectedSymbol?: string | null
}>()

const emit = defineEmits<{
  (e: 'select', symbol: string | null): void
}>()

const FALLBACK_COLORS = [
  '#444444',
  '#0092BC',
  '#76B900',
  '#00A1F1',
  '#FF9900',
  '#0064E0',
  '#F7931A',
]

interface AllocRow {
  symbol: string
  value: number
  pct: number
  color: string
  currency: string
}

const rows = computed(() => {
  const metrics = props.holdings.map((h) => calculateHoldingMetrics(h, props.getQuote(h.symbol)))
  const total = metrics.reduce((s, m) => s + (m?.marketValue || 0), 0)
  return props.holdings.map((h, i) => {
    const mv = metrics[i]?.marketValue ?? 0
    const brand = brandColorFor(h.symbol)
    return {
      symbol: h.symbol,
      value: mv,
      pct: total > 0 ? (mv / total) * 100 : 0,
      color: brand ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length] ?? '#444444',
      currency: h.currency ?? 'USD',
    }
  }).sort((a, b) => b.pct - a.pct)
})

const segments = computed<DonutSegment[]>(() =>
  rows.value
    .filter((r) => r.value > 0)
    .map((r) => ({ label: r.symbol, value: r.value, color: r.color })),
)

function select(symbol: string) {
  if (props.selectedSymbol === symbol) {
    emit('select', null)
  } else {
    emit('select', symbol)
  }
}
</script>

<template>
  <div class="rounded-3xl border border-border/70 bg-card p-5 sm:p-6 transition-all">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-sm font-semibold text-foreground">Allocation</h2>
        <p class="text-xs text-muted-foreground">Portfolio distribution by market value</p>
      </div>
      <button
        v-if="selectedSymbol"
        type="button"
        class="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
        @click="emit('select', null)"
      >
        Clear filter
      </button>
    </div>

    <div class="mt-4 flex flex-col items-center gap-5 sm:flex-row">
      <div class="shrink-0 relative flex items-center justify-center p-2">
        <Donut :segments="segments" :size="130" />
      </div>

      <div class="w-full min-w-0 space-y-1" role="list">
        <button
          v-for="row in rows"
          :key="row.symbol"
          type="button"
          class="group flex w-full items-center justify-between gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition-colors hover:bg-muted/40 cursor-pointer"
          :class="selectedSymbol === row.symbol ? 'bg-muted/70' : ''"
          :aria-pressed="selectedSymbol === row.symbol"
          @click="select(row.symbol)"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <span
              class="size-2 shrink-0 rounded-full"
              :style="{ backgroundColor: row.color }"
              aria-hidden="true"
            />
            <AssetIcon :symbol="row.symbol" size="sm" />
            <div class="min-w-0">
              <span class="text-xs font-semibold block truncate leading-tight">{{ row.symbol }}</span>
              <span class="text-[11px] text-muted-foreground block truncate leading-tight mt-0.5">
                {{ formatCurrency(row.value, row.currency) }}
              </span>
            </div>
          </div>

          <span class="text-xs font-medium tabular-nums text-muted-foreground shrink-0">
            {{ row.pct.toFixed(1) }}%
          </span>
        </button>
      </div>
    </div>
  </div>
</template>