<script setup lang="ts">
import { ref, computed } from 'vue'
import { Pencil, Trash2, Loader2, Plus } from '@lucide/vue'
import type { ChartData, ChartPoint, Holding } from '#shared/types'
import { calculateHoldingMetrics } from '~/utils/calculations'
import { formatCurrency, formatPercent, formatNumber, formatQuantity, formatDate, formatTime } from '~/utils/format'
import { brandColorFor } from '~/utils/brand-colors'

const route = useRoute()
const router = useRouter()
const { holdings, loaded, removeHolding } = usePortfolio()
const { has: hasWatch } = useWatchlist()
const addModal = useAddHoldingModal()
const quotes = useQuotes()
const { ensureLoaded: ensureRates, toUsd } = useExchangeRates()
const { t } = useI18n()

const symbol = computed(() => String(route.params.symbol ?? ''))
const holding = computed<Holding | null>(() =>
  holdings.value.find((h) => h.symbol === symbol.value) ?? null,
)
const isWatch = computed(() => !holding.value && hasWatch(symbol.value))
const isCashSymbol = computed(() => !!holding.value?.symbol.startsWith('CASH-'))

const getQuote = (s: string) => quotes.getQuote(s)
const quote = computed(() =>
  holding.value
    ? getQuote(holding.value.symbol)
    : getQuote(symbol.value),
)

useHead({ title: () => symbol.value })

// Wait for storage-backed portfolio to hydrate before deciding the route is invalid
watchEffect(() => {
  if (loaded.value && !holding.value && !isWatch.value) {
    void router.replace('/')
  }
})

function trackInPortfolio() {
  addModal.openWith(symbol.value)
  void router.push('/')
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
  () => symbol.value,
  (s) => {
    if (s && !isCashSymbol.value) loadChart(s, '6m')
  },
  { immediate: true },
)

watch(range, (r) => {
  if (symbol.value && !isCashSymbol.value) loadChart(symbol.value, r)
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

interface DetailRow {
  key: string
  label: string
  value: string
  sub?: string
  tone?: 'gain' | 'loss'
}

function quoteRows(): DetailRow[] {
  const rows: DetailRow[] = []
  const cur = quote.value?.currency ?? holding.value?.currency ?? 'USD'
  if (quote.value?.previousClose !== undefined) {
    rows.push({ key: 'prev', label: t('detailPrevClose'), value: formatCurrency(quote.value.previousClose, cur) })
  }
  if (quote.value?.marketTime) {
    rows.push({ key: 'updated', label: t('detailLastUpdate'), value: formatTime(quote.value.marketTime) })
  }
  return rows
}

const detailRows = computed<DetailRow[]>(() => {
  const h = holding.value
  const cur = quote.value?.currency ?? h?.currency ?? 'USD'
  const m = metrics.value
  const cash = isCashSymbol.value
  if (!h) return quoteRows()
  const rows: DetailRow[] = []
  if (!cash) {
    rows.push({ key: 'invested', label: t('detailInvested'), value: formatCurrency(m?.costBasis, cur) })
  }
  rows.push({ key: 'mv', label: t('detailMarketValue'), value: formatCurrency(m?.marketValue, cur) })
  if (quote.value?.price) {
    rows.push({
      key: 'day',
      label: t('detailDayChange'),
      value: `${(m?.dayChange ?? 0) >= 0 ? '+' : ''}${formatCurrency(m?.dayChange, cur)}`,
      sub: formatPercent(m?.dayChangePercent),
      tone: (m?.dayChange ?? 0) >= 0 ? 'gain' : 'loss',
    })
  }
  if (!cash) {
    rows.push({
      key: 'pnl',
      label: t('detailTotalReturn'),
      value: (m?.pnl ?? 0) >= 0 ? `+${formatCurrency(m?.pnl, cur)}` : formatCurrency(m?.pnl, cur),
      sub: formatPercent(m?.pnlPercent),
      tone: (m?.pnl ?? 0) >= 0 ? 'gain' : 'loss',
    })
  }
  if (!cash) {
    rows.push({ key: 'currency', label: t('detailCurrency'), value: cur })
  }
  if (!cash && h.isCash) {
    rows.push({ key: 'cashFlag', label: t('detailCountedAsCash'), value: t('detailYes') })
  }
  rows.push({ key: 'added', label: t('detailAdded'), value: formatDate(h.createdAt) })
  return [...rows, ...quoteRows()]
})

const editorOpen = ref(false)
const deleting = ref(false)
onMounted(() => {
  ensureRates()
  if (isWatch.value && !quotes.getQuote(symbol.value)) quotes.refresh([symbol.value])
})

function confirmDelete() {
  if (holding.value) {
    removeHolding(holding.value.id)
    void router.replace('/')
  }
}
</script>

<template>
  <div>
    <div v-if="holding || isWatch" class="pb-12 px-4 sm:px-0">
      <!-- Header card -->
      <div class="mt-2 rounded-2xl p-5 backdrop-blur-xl transition-all card-press elev-2" :style="accentStyle">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <AssetIcon :symbol="symbol" size="lg" />
            <div>
              <p class="text-sm font-semibold tracking-tight">{{ holding?.name ?? quote?.name ?? symbol }}</p>
              <p class="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[160px]">
                {{ isCashSymbol ? t('detailCashBalance', { currency: holding?.currency ?? '' }) : (quote?.name ?? holding?.notes ?? (isWatch ? t('detailWatching') : '')) }}
              </p>
            </div>
          </div>
          <div class="text-right">
            <div
              v-if="isCashSymbol"
              class="font-display text-[1.75rem] font-semibold tabular-nums leading-none"
            >
              {{ formatCurrency(holding?.quantity, holding?.currency ?? 'USD') }}
            </div>
            <div v-else-if="quote" class="font-display text-[1.75rem] font-semibold tabular-nums leading-none">
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

        <div v-if="holding" class="mt-4 grid grid-cols-3 gap-2">
          <div>
            <p class="text-[10px] text-muted-foreground font-medium">{{ isCashSymbol ? t('detailAmount') : t('detailShares') }}</p>
            <p class="text-sm font-semibold tabular-nums mt-0.5">{{ isCashSymbol ? formatCurrency(holding.quantity, holding.currency ?? 'USD') : formatQuantity(holding.quantity) }}</p>
          </div>
          <div class="text-center">
            <p class="text-[10px] text-muted-foreground font-medium">{{ isCashSymbol ? t('detailCurrency') : t('detailAvgCost') }}</p>
            <p class="text-sm font-semibold tabular-nums mt-0.5">{{ isCashSymbol ? (holding.currency ?? 'USD') : formatNumber(holding.averageCost) }}</p>
          </div>
          <div class="text-right">
            <p class="text-[10px] text-muted-foreground font-medium">{{ t('detailWeight') }}</p>
            <p class="text-sm font-semibold tabular-nums mt-0.5">{{ allocation !== null ? `${allocation.toFixed(1)}%` : '—' }}</p>
          </div>
        </div>
      </div>

      <!-- Chart -->
      <div v-if="!isCashSymbol" class="mt-4 rounded-2xl bg-card p-4 card-press elev-1">
        <Transition name="chart-fade" mode="out-in">
          <div
            :key="range + (chartError ? '-err' : chartData ? '-ok' : '-loading')"
            class="flex h-[300px] w-full items-center justify-center overflow-hidden rounded-xl bg-muted/20 p-2"
          >
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
            <p v-else-if="chartError" class="text-[11px] text-muted-foreground">{{ t('detailUnavailable') }}</p>
            <p v-else class="text-[11px] text-muted-foreground">{{ t('detailNoData') }}</p>
          </div>
        </Transition>

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
      <div v-if="detailRows.length" class="mt-4 rounded-2xl bg-card divide-y divide-border/40 overflow-hidden card-press elev-1">
        <div
          v-for="row in detailRows"
          :key="row.key"
          class="flex items-center justify-between gap-3 px-4 py-2.5"
        >
          <span class="text-xs text-muted-foreground font-medium">{{ row.label }}</span>
          <span class="flex items-baseline gap-1.5 text-sm font-semibold tabular-nums text-right">
            <span
              :class="row.tone === 'gain' ? 'text-emerald-600 dark:text-emerald-400' : row.tone === 'loss' ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'"
            >{{ row.value }}</span>
            <span v-if="row.sub" class="text-[11px] font-normal text-muted-foreground">{{ row.sub }}</span>
          </span>
        </div>
      </div>

      <!-- Notes -->
      <div v-if="holding?.notes" class="mt-4 rounded-2xl bg-card p-4 card-press elev-1">
        <p class="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {{ t('detailNotes') }}
        </p>
        <p class="mt-1.5 text-sm text-foreground whitespace-pre-line">{{ holding.notes }}</p>
      </div>

      <!-- Actions -->
      <div v-if="isWatch" class="mt-6">
        <button
          type="button"
          class="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground text-background h-12 text-sm font-semibold cursor-pointer ios-press"
          @click="trackInPortfolio"
        >
          <Plus class="size-4" aria-hidden="true" />
          {{ t('detailTrack') }}
        </button>
        <p class="mt-2 text-center text-[11px] text-muted-foreground">
          {{ t('detailTrackBody') }}
        </p>
      </div>
      <div v-else-if="holding" class="mt-6 grid grid-cols-2 gap-3">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card h-12 text-sm font-semibold cursor-pointer ios-press active:bg-muted/40"
          @click="editorOpen = true"
        >
          <Pencil class="size-4" aria-hidden="true" />
          {{ t('detailEdit') }}
        </button>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 text-destructive h-12 text-sm font-semibold cursor-pointer ios-press active:bg-destructive/20"
          @click="deleting = true"
        >
          <Trash2 class="size-4" aria-hidden="true" />
          {{ t('detailDelete') }}
        </button>
      </div>
    </div>

    <HoldingEditorDialog :open="editorOpen" :holding="holding" @saved="editorOpen = false" @close="editorOpen = false" />
    <DeleteHoldingDialog :holding="deleting ? holding : null" @confirm="confirmDelete" @close="deleting = false" />
  </div>
</template>