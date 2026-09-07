<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Loader2, Pencil } from '@lucide/vue'
import type { ChartData, ChartPoint, Holding, Quote } from '#shared/types'
import { calculateHoldingMetrics } from '~/utils/calculations'
import { formatCurrency, formatNumber, formatPercent, formatQuantity } from '~/utils/format'
import AssetIcon from './AssetIcon.vue'

const props = defineProps<{
  holding: Holding | null
  getQuote: (symbol: string) => Quote | null
}>()

const emit = defineEmits<{
  close: []
  edit: [h: Holding]
}>()

const RANGES = ['1d', '1w', '1m', '3m', '6m', '1y', 'max'] as const
type Range = (typeof RANGES)[number]

const range = ref<Range>('1m')
const chartData = ref<ChartData | null>(null)
const chartLoading = ref(false)
const chartError = ref(false)
let chartRequest = 0

const quote = computed(() => (props.holding ? props.getQuote(props.holding.symbol) : null))
const metrics = computed(() =>
  props.holding ? calculateHoldingMetrics(props.holding, quote.value) : null,
)

const { holdings } = usePortfolio()
const portfolioTotal = computed(() => {
  if (!props.holding) return 0
  let t = 0
  for (const h of holdings.value) t += calculateHoldingMetrics(h, props.getQuote(h.symbol)).marketValue
  return t || 1
})

const allocation = computed(() => {
  if (!props.holding || !metrics.value) return null
  const total = metrics.value.marketValue
  return total > 0 ? (total / portfolioTotal.value) * 100 : 0
})

watch(
  () => props.holding,
  (h, prev) => {
    if (h?.symbol !== prev?.symbol) {
      chartData.value = null
      chartError.value = false
      range.value = '1m'
      if (h) loadChart(h.symbol, '1m')
    }
  },
  { immediate: true },
)

watch(range, (r) => {
  if (props.holding) loadChart(props.holding.symbol, r)
})

async function loadChart(symbol: string, r: Range) {
  const rangeParam = r === '1w' ? '5d' : r === 'max' ? 'max' : r
  chartLoading.value = true
  chartError.value = false
  const reqId = ++chartRequest
  try {
    const res = await $fetch<ChartData>('/api/chart', { query: { symbol, range: rangeParam } })
    if (reqId !== chartRequest) return
    chartData.value = res
  } catch {
    if (reqId === chartRequest) chartError.value = true
  } finally {
    if (reqId === chartRequest) chartLoading.value = false
  }
}

const chartPoints = computed<ChartPoint[]>(() => chartData.value?.points ?? [])
const periodChange = computed(() => {
  if (chartPoints.value.length < 2) return undefined
  const first = chartPoints.value[0]?.close ?? 0
  const last = chartPoints.value[chartPoints.value.length - 1]?.close ?? 0
  return {
    change: last - first,
    percent: first !== 0 ? ((last - first) / first) * 100 : undefined,
  }
})

const isPeriodGain = computed(() => (periodChange.value?.change ?? 0) >= 0)

function edit() {
  if (props.holding) emit('edit', props.holding)
}
</script>

<template>
  <UiDialog :open="!!holding" @update:open="(v: boolean) => !v && emit('close')">
    <UiDialogContent
      v-if="holding"
      class="sm:max-w-lg rounded-3xl p-5 sm:p-6 border border-border/80 bg-card shadow-2xl transition-all"
    >
      <UiDialogHeader class="text-left">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <AssetIcon :symbol="holding.symbol" size="lg" />
            <div>
              <UiDialogTitle class="text-lg font-semibold tracking-tight">
                {{ holding.symbol }}
              </UiDialogTitle>
              <UiDialogDescription class="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-xs">
                {{ quote?.name ?? holding.notes ?? 'Holding' }}
              </UiDialogDescription>
            </div>
          </div>

          <div class="text-right">
            <div v-if="quote" class="text-base font-semibold text-foreground tabular-nums">
              {{ formatCurrency(quote.price, quote.currency ?? 'USD') }}
            </div>
            <div
              v-if="quote && quote.changePercent !== undefined"
              class="text-xs font-medium tabular-nums"
              :class="
                quote.changePercent >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              "
            >
              {{ quote.changePercent >= 0 ? '+' : '' }}{{ formatPercent(quote.changePercent) }}
            </div>
          </div>
        </div>
      </UiDialogHeader>

      <!-- Chart -->
      <div class="mt-2">
        <div class="flex h-36 items-center justify-center overflow-hidden rounded-2xl border border-border/50 bg-muted/20 p-2">
          <Sparkline v-if="chartPoints.length >= 2" :points="chartPoints" :height="120" />
          <div v-else-if="chartLoading" class="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 class="size-3.5 animate-spin" aria-hidden="true" />
            Loading chart…
          </div>
          <p v-else-if="chartError" class="text-xs text-muted-foreground">Chart unavailable.</p>
          <p v-else class="text-xs text-muted-foreground">Insufficient chart data.</p>
        </div>

        <!-- Range Pills -->
        <div class="mt-3 flex items-center justify-center gap-1 overflow-x-auto no-scrollbar">
          <button
            v-for="r in RANGES"
            :key="r"
            type="button"
            class="px-2.5 py-0.5 rounded-full text-xs font-medium uppercase transition-colors cursor-pointer"
            :class="
              range === r
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            "
            @click="range = r"
          >
            {{ r }}
          </button>
        </div>

        <div v-if="periodChange" class="mt-2 flex items-center justify-center gap-2 text-xs font-medium tabular-nums">
          <span :class="isPeriodGain ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
            {{ isPeriodGain ? '+' : '' }}{{ formatCurrency(periodChange.change, chartData?.currency ?? 'USD') }}
          </span>
          <span class="text-muted-foreground">
            ({{ periodChange.percent === undefined ? '—' : formatPercent(periodChange.percent) }})
          </span>
        </div>
      </div>

      <!-- Metrics Grid -->
      <div class="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-2xl bg-muted/30 p-3 border border-border/40 text-xs">
        <div>
          <p class="text-[11px] text-muted-foreground font-medium">Position</p>
          <p class="font-semibold tabular-nums mt-0.5">{{ formatQuantity(holding.quantity) }}</p>
        </div>
        <div>
          <p class="text-[11px] text-muted-foreground font-medium">Market Value</p>
          <p class="font-semibold tabular-nums mt-0.5 text-foreground">
            {{ metrics ? formatCurrency(metrics.marketValue, holding.currency ?? 'USD') : '—' }}
          </p>
        </div>
        <div>
          <p class="text-[11px] text-muted-foreground font-medium">Avg Cost</p>
          <p class="font-semibold tabular-nums mt-0.5">{{ formatNumber(holding.averageCost) }} {{ holding.currency }}</p>
        </div>
        <div>
          <p class="text-[11px] text-muted-foreground font-medium">Invested</p>
          <p class="font-semibold tabular-nums mt-0.5">
            {{ metrics ? formatCurrency(metrics.costBasis, holding.currency ?? 'USD') : '—' }}
          </p>
        </div>
        <div>
          <p class="text-[11px] text-muted-foreground font-medium">Total Return</p>
          <p
            class="font-semibold tabular-nums mt-0.5"
            :class="metrics && metrics.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
          >
            <template v-if="metrics && quote?.price">
              {{ metrics.pnl >= 0 ? '+' : '' }}{{ formatCurrency(metrics.pnl, holding.currency ?? 'USD') }}
              <span class="text-[10px] block font-normal">({{ formatPercent(metrics.pnlPercent) }})</span>
            </template>
            <template v-else>—</template>
          </p>
        </div>
        <div>
          <p class="text-[11px] text-muted-foreground font-medium">Weight</p>
          <p class="font-semibold tabular-nums mt-0.5">
            {{ allocation !== null ? `${allocation.toFixed(1)}%` : '—' }}
          </p>
        </div>
      </div>

      <UiDialogFooter class="mt-4 flex gap-2">
        <button
          type="button"
          class="h-10 rounded-full flex-1 border border-border/80 bg-background px-4 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          @click="emit('close')"
        >
          Close
        </button>
        <button
          type="button"
          class="h-10 rounded-full flex-1 bg-foreground text-background font-medium text-xs hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          @click="edit"
        >
          <Pencil class="size-3.5" />
          Edit Position
        </button>
      </UiDialogFooter>
    </UiDialogContent>
  </UiDialog>
</template>