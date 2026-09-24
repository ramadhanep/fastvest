<script setup lang="ts">
import type { ChartData, ChartPoint, Holding, Quote } from '#shared/types'
import { buildPortfolioHistory, type HistorySeriesInput } from '~/utils/performance'
import { formatCurrency, formatPercent } from '~/utils/format'

const props = defineProps<{
  holdings: readonly Holding[]
  getQuote: (symbol: string) => Quote | null
}>()

const { ensureLoaded: ensureRates, toUsd } = useExchangeRates()
const { t } = useI18n()

const RANGES = [
  { label: '1M', range: '1mo' },
  { label: '3M', range: '3mo' },
  { label: '6M', range: '6mo' },
  { label: '1Y', range: '1y' },
  { label: '2Y', range: '2y' },
  { label: 'ALL', range: 'max' },
] as const

const range = ref<(typeof RANGES)[number]['range']>('6mo')
const data = ref<ChartPoint[] | null>(null)
const loading = ref(false)
const error = ref(false)
let reqId = 0

const marketHoldings = computed(() =>
  props.holdings.filter((h) => !h.isCash && !String(h.symbol).startsWith('CASH-')),
)

async function load() {
  if (!marketHoldings.value.length) {
    data.value = null
    return
  }
  const id = ++reqId
  loading.value = true
  error.value = false
  try {
    const series: HistorySeriesInput[] = []
    await Promise.all(
      marketHoldings.value.map(async (h) => {
        try {
          const res = await $fetch<ChartData>('/api/chart', { query: { symbol: h.symbol, range: range.value } })
          if (id !== reqId) return
          const cur = props.getQuote(h.symbol)?.currency ?? h.currency ?? 'USD'
          series.push({
            symbol: h.symbol,
            points: res.points,
            startAt: h.createdAt ?? '',
            quantity: h.quantity,
            currency: cur,
          })
        } catch {
          // symbol without history is skipped
        }
      }),
    )
    if (id !== reqId) return
    for (const h of props.holdings) {
      if (h.isCash) {
        series.push({
          symbol: h.symbol,
          points: [],
          startAt: h.createdAt ?? '',
          quantity: h.quantity,
          currency: h.currency ?? 'USD',
          isCash: true,
        })
      }
    }
    const built = buildPortfolioHistory(series, toUsd)
    data.value = built.length ? built : null
  } catch {
    if (id === reqId) error.value = true
  } finally {
    if (id === reqId) loading.value = false
  }
}

const isOpen = ref(false)

function onToggle() {
  isOpen.value = !isOpen.value
  if (isOpen.value) load()
}

watch(range, () => {
  if (isOpen.value) load()
})

onMounted(ensureRates)

const periodChange = computed(() => {
  if (!data.value || data.value.length < 2) return undefined
  const first = data.value[0]?.close ?? 0
  const last = data.value[data.value.length - 1]?.close ?? 0
  return { change: last - first, percent: first !== 0 ? ((last - first) / first) * 100 : undefined }
})
const isGain = computed(() => (periodChange.value?.change ?? 0) >= 0)

const hasCash = computed(() => props.holdings.some((h) => h.isCash))
</script>

<template>
  <div class="rounded-2xl bg-card p-5 card-press elev-1 contain-layout">
    <!-- Header row — acts as the toggle trigger -->
    <button
      type="button"
      class="flex w-full items-center justify-between cursor-pointer text-sm font-semibold text-foreground"
      :aria-expanded="isOpen"
      @click="onToggle"
    >
      <span>{{ t('performanceTitle') }}</span>
      <svg
        class="size-4 text-muted-foreground transition-transform duration-300 ease-out"
        :class="isOpen ? 'rotate-180' : 'rotate-0'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>

    <!-- Animated body -->
    <div
      class="performance-body grid"
      :style="{ gridTemplateRows: isOpen ? '1fr' : '0fr' }"
    >
      <div class="min-h-0 overflow-hidden">
        <div :class="isOpen ? 'mt-3 opacity-100' : 'opacity-0'">
          <div class="flex gap-1 overflow-x-auto no-scrollbar pb-1">
            <button
              v-for="r in RANGES"
              :key="r.range"
              type="button"
              class="px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer"
              :class="range === r.range ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'"
              @click="range = r.range"
            >
              {{ r.label }}
            </button>
          </div>

          <div class="mt-2 flex h-[220px] w-full items-center justify-center overflow-hidden rounded-xl bg-muted/20 p-2">
            <HoldingChart
              v-if="data && data.length >= 2"
              :points="data"
              currency="USD"
              :height="200"
            />
            <div v-else-if="loading && !data" class="text-xs text-muted-foreground">
              {{ t('performanceLoading') }}
            </div>
            <p v-else class="text-xs text-muted-foreground text-center px-4">
              {{ error ? t('performanceUnavailable') : data && data.length < 2 ? t('performanceNotEnough') : t('performanceEmpty') }}
            </p>
          </div>

          <p v-if="periodChange" class="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium tabular-nums">
            <span class="inline-flex items-center gap-1.5" :class="isGain ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
              {{ isGain ? '+' : '' }}{{ formatCurrency(periodChange.change, 'USD') }}
              <span class="text-muted-foreground">{{ formatPercent(periodChange.percent) }} {{ t('performanceOverRange') }}</span>
            </span>
          </p>

          <p class="mt-3 text-[10px] leading-relaxed text-muted-foreground">
            {{ t('performanceFooter') }}
            {{ hasCash ? t('performanceCash') + ' ' : '' }}{{ t('performanceAdvice') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.performance-body {
  transition: grid-template-rows 600ms cubic-bezier(0.4, 0, 0.2, 1);
  will-change: grid-template-rows;
}
.performance-body > div > div {
  transition: opacity 380ms ease 120ms;
}
</style>