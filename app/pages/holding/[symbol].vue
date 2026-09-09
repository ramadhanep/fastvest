<script setup lang="ts">
import { ref, computed } from 'vue'
import { Pencil, Trash2, Loader2 } from '@lucide/vue'
import type { ChartData, ChartPoint, Holding } from '#shared/types'
import { calculateHoldingMetrics } from '~/utils/calculations'
import { formatCurrency, formatPercent, formatNumber, formatQuantity } from '~/utils/format'
import { brandColorFor } from '~/utils/brand-colors'

const route = useRoute()
const router = useRouter()
const { holdings, removeHolding } = usePortfolio()
const quotes = useQuotes()
const { ensureLoaded: ensureRates, toUsd } = useExchangeRates()

const symbol = computed(() => String(route.params.symbol ?? ''))
const holding = computed<Holding | null>(() =>
  holdings.value.find((h) => h.symbol === symbol.value) ?? null,
)

const getQuote = (s: string) => quotes.getQuote(s)
const quote = computed(() => (holding.value ? getQuote(holding.value.symbol) : null))

useHead({ title: () => symbol.value })

if (!holding.value) {
  router.replace('/')
}

const metrics = computed(() =>
  holding.value ? calculateHoldingMetrics(holding.value, quote.value) : null,
)

const portfolioTotal = computed(() => {
  let t = 0
  for (const h of holdings.value) {
    const q = getQuote(h.symbol)
    const m = calculateHoldingMetrics(h, q)
    t += toUsd(m.marketValue, q?.currency ?? h.currency ?? 'USD')
  }
  return t || 1
})

const allocation = computed(() => {
  if (!holding.value || !metrics.value) return null
  const cur = quote.value?.currency ?? holding.value.currency ?? 'USD'
  const mvUsd = toUsd(metrics.value.marketValue, cur)
  return mvUsd > 0 ? (mvUsd / portfolioTotal.value) * 100 : 0
})

const RANGES = ['1w', '1m', '3m', '6m', '1y', '2y', 'max'] as const
type Range = (typeof RANGES)[number]

const RANGE_MAP: Record<string, string> = { '1w': '5d', '1m': '1mo', '3m': '3mo', '6m': '6mo' }
async function loadChart(symbol: string, r: Range) {
  const rangeParam = RANGE_MAP[r] ?? r
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

const range = ref<Range>('6m')
const chartData = ref<ChartData | null>(null)
const chartLoading = ref(false)
const chartError = ref(false)
let chartRequest = 0

watch(
  () => holding.value?.symbol,
  (s) => {
    if (s) loadChart(s, '6m')
  },
  { immediate: true },
)

watch(range, (r) => {
  if (holding.value) loadChart(holding.value.symbol, r)
})

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

const accent = computed(() => brandColorFor(holding.value?.symbol ?? ''))
const accentStyle = computed(() => {
  const hex = accent.value
  if (!hex) return {}
  return {
    backgroundColor: `${hex}30`,
    borderColor: `${hex}40`,
    border: `1px solid ${hex}40`,
  }
})

const editorOpen = ref(false)
const deleting = ref(false)
onMounted(ensureRates)

function confirmDelete() {
  if (holding.value) {
    removeHolding(holding.value.id)
    void router.replace('/')
  }
}
</script>

<template>
  <div v-if="holding" class="pb-12 px-4 sm:px-0">
    <!-- Header card -->
    <div class="mt-2 rounded-2xl p-5 backdrop-blur-xl transition-all" :style="accentStyle">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <AssetIcon :symbol="holding.symbol" size="lg" />
          <div>
            <p class="text-sm font-semibold tracking-tight">{{ holding.symbol }}</p>
            <p class="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[160px]">
              {{ quote?.name ?? holding.notes ?? '' }}
            </p>
          </div>
        </div>
        <div class="text-right">
          <div v-if="quote" class="font-display text-[1.75rem] font-semibold tabular-nums leading-none">
            {{ formatCurrency(quote.price, quote.currency ?? 'USD') }}
          </div>
          <div
            v-if="quote && quote.changePercent !== undefined"
            class="text-xs font-medium tabular-nums mt-1"
            :class="quote.changePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
          >
            {{ quote.changePercent >= 0 ? '+' : '' }}{{ formatPercent(quote.changePercent) }}
          </div>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-3 gap-2">
        <div>
          <p class="text-[10px] text-muted-foreground font-medium">Shares</p>
          <p class="text-sm font-semibold tabular-nums mt-0.5">{{ formatQuantity(holding.quantity) }}</p>
        </div>
        <div class="text-center">
          <p class="text-[10px] text-muted-foreground font-medium">Avg Cost</p>
          <p class="text-sm font-semibold tabular-nums mt-0.5">{{ formatNumber(holding.averageCost) }}</p>
        </div>
        <div class="text-right">
          <p class="text-[10px] text-muted-foreground font-medium">Weight</p>
          <p class="text-sm font-semibold tabular-nums mt-0.5">{{ allocation !== null ? `${allocation.toFixed(1)}%` : '—' }}</p>
        </div>
      </div>
    </div>

    <!-- Chart -->
    <div class="mt-4 rounded-2xl bg-card p-4">
      <div class="flex h-[300px] items-center justify-center overflow-hidden rounded-xl bg-muted/20 p-2">
        <HoldingChart
          v-if="chartPoints.length >= 2"
          :points="chartPoints"
          :currency="chartData?.currency"
          :brand-color="accent ?? undefined"
          :height="270"
        />
        <div v-else-if="chartLoading" class="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 class="size-3.5 animate-spin" aria-hidden="true" />
        </div>
        <p v-else-if="chartError" class="text-[11px] text-muted-foreground">Unavailable</p>
        <p v-else class="text-[11px] text-muted-foreground">No data</p>
      </div>

      <div class="mt-3 flex items-center justify-center gap-1 overflow-x-auto no-scrollbar">
        <button
          v-for="r in RANGES"
          :key="r"
          type="button"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          :class="range === r ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'"
          @click="range = r"
        >
          {{ r }}
        </button>
      </div>

      <div v-if="periodChange" class="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium tabular-nums">
        <span :class="isPeriodGain ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
          {{ isPeriodGain ? '+' : '' }}{{ formatCurrency(periodChange.change, chartData?.currency ?? 'USD') }}
        </span>
        <span class="text-muted-foreground">
          {{ periodChange.percent === undefined ? '' : formatPercent(periodChange.percent) }}
        </span>
      </div>
    </div>

    <!-- Metrics -->
    <div class="mt-4 rounded-2xl bg-card divide-y divide-border/40 overflow-hidden">
      <div class="flex items-center justify-between px-4 py-3">
        <span class="text-xs text-muted-foreground font-medium">Invested</span>
        <span class="text-sm font-semibold tabular-nums">{{ metrics ? formatCurrency(metrics.costBasis, holding.currency ?? 'USD') : '—' }}</span>
      </div>
      <div class="flex items-center justify-between px-4 py-3">
        <span class="text-xs text-muted-foreground font-medium">Market Value</span>
        <span class="text-sm font-semibold tabular-nums">{{ metrics ? formatCurrency(metrics.marketValue, holding.currency ?? 'USD') : '—' }}</span>
      </div>
      <div class="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <span class="text-xs text-muted-foreground font-medium">Avg Cost</span>
        <span class="text-sm font-semibold tabular-nums">{{ formatNumber(holding.averageCost) }} {{ holding.currency ?? '' }}</span>
      </div>
      <div class="flex items-center justify-between px-4 py-3">
        <span class="text-xs text-muted-foreground font-medium">Total Return</span>
        <span
          class="text-sm font-semibold tabular-nums"
          :class="metrics && metrics.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
        >
          <template v-if="metrics && quote?.price">
            {{ metrics.pnl >= 0 ? '+' : '' }}{{ formatCurrency(metrics.pnl, holding.currency ?? 'USD') }}
            <span class="text-[11px] font-normal text-muted-foreground">({{ formatPercent(metrics.pnlPercent) }})</span>
          </template>
          <template v-else>—</template>
        </span>
      </div>
    </div>

    <!-- Actions -->
    <div class="mt-6 grid grid-cols-2 gap-3">
      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card h-12 text-sm font-semibold cursor-pointer ios-press active:bg-muted/40"
        @click="editorOpen = true"
      >
        <Pencil class="size-4" aria-hidden="true" />
        Edit
      </button>
      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 text-destructive h-12 text-sm font-semibold cursor-pointer ios-press active:bg-destructive/20"
        @click="deleting = true"
      >
        <Trash2 class="size-4" aria-hidden="true" />
        Delete
      </button>
    </div>
  </div>

  <HoldingEditorDialog :open="editorOpen" :holding="holding" @saved="editorOpen = false" @close="editorOpen = false" />
  <DeleteHoldingDialog :holding="deleting ? holding : null" @confirm="confirmDelete" @close="deleting = false" />
</template>