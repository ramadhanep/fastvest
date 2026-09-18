<script setup lang="ts">
import type { Holding, Quote } from '#shared/types'
import { calculateHoldingMetrics } from '~/utils/calculations'
import { brandColorFor, BRAND_FALLBACK } from '~/utils/brand-colors'
import { formatCurrency } from '~/utils/format'
import { useExchangeRates } from '~/composables/useExchangeRates'
import { usePreferences } from '~/composables/usePreferences'

const props = withDefaults(
  defineProps<{
    holdings: readonly Holding[]
    getQuote: (symbol: string) => Quote | null
    selectedSymbol?: string | null
    selectedCurrency?: string | null
  }>(),
  { selectedSymbol: null, selectedCurrency: null },
)

const emit = defineEmits<{
  (e: 'select', symbol: string | null): void
  (e: 'select-currency', currency: string | null): void
}>()

const { ensureLoaded: ensureRates, toUsd, fromUsd } = useExchangeRates()
const { preferences } = usePreferences()

const displayCurrency = computed(() => preferences.value.displayCurrency ?? 'USD')

const segments = computed<{ label: string; value: number; color: string }[]>(() => {
  const metrics = props.holdings.map((h) => {
    const m = calculateHoldingMetrics(h, props.getQuote(h.symbol))
    const cur = props.getQuote(h.symbol)?.currency ?? h.currency ?? 'USD'
    return { ...m, marketValue: toUsd(m.marketValue, cur) }
  })
  return props.holdings.map((h, i) => {
    const mv = metrics[i]?.marketValue ?? 0
    const brand = brandColorFor(h.symbol)
    return {
      label: h.symbol,
      value: mv,
      color: brand ?? BRAND_FALLBACK,
    }
  }).filter((s) => s.value > 0)
})

const totalValue = computed(() => segments.value.reduce((s, x) => s + x.value, 0))

const rows = computed(() => [...segments.value].sort((a, b) => b.value - a.value))

const donutRef = ref<{ resize: () => void } | null>(null)

const CURRENCY_COLORS: Record<string, string> = {
  USD: '#2563EB',
  IDR: '#DC2626',
  SGD: '#16A34A',
  EUR: '#7C3AED',
  GBP: '#DB2777',
  JPY: '#DC2626',
  HKD: '#0D9488',
}

const INVESTED_COLOR = '#2563EB'
const CASH_COLOR = '#DC2626'

const currencies = computed<{ label: string; value: number; color: string }[]>(() => {
  const byCur = new Map<string, number>()
  for (const h of props.holdings) {
    const cur = props.getQuote(h.symbol)?.currency ?? h.currency ?? 'USD'
    const m = calculateHoldingMetrics(h, props.getQuote(h.symbol))
    const usd = toUsd(m.marketValue, cur)
    byCur.set(cur, (byCur.get(cur) ?? 0) + usd)
  }
  return [...byCur.entries()]
    .filter(([, v]) => v > 0)
    .map(([label, value]) => ({ label, value, color: CURRENCY_COLORS[label] ?? '#6B7280' }))
    .sort((a, b) => b.value - a.value)
})

const cashSplit = computed(() => {
  let cash = 0
  let invested = 0
  for (const h of props.holdings) {
    const cur = props.getQuote(h.symbol)?.currency ?? h.currency ?? 'USD'
    const m = calculateHoldingMetrics(h, props.getQuote(h.symbol))
    const usd = toUsd(m.marketValue, cur)
    if (h.isCash || h.symbol.startsWith('CASH-')) cash += usd
    else invested += usd
  }
  return { cash, invested, total: cash + invested }
})

const cashPct = computed(() => (cashSplit.value.total ? (cashSplit.value.cash / cashSplit.value.total) * 100 : 0))
const investedPct = computed(() => 100 - cashPct.value)

const currencyBarLabel = computed(() =>
  currencies.value
    .map((c) => `${c.label} ${totalValue.value ? ((c.value / totalValue.value) * 100).toFixed(1) : 0}%`)
    .join(', '),
)

onMounted(ensureRates)

function toggle(symbol: string) {
  if (props.selectedSymbol === symbol) emit('select', null)
  else emit('select', symbol)
}

function toggleCurrency(currency: string) {
  if (props.selectedCurrency === currency) emit('select-currency', null)
  else emit('select-currency', currency)
}

// ─── Smooth accordion (grid-template-rows, GPU-friendly — no layout thrash) ─
const isOpen = ref(false)

function onToggle() {
  isOpen.value = !isOpen.value
}

watch(isOpen, (open, prev) => {
  if (open && !prev) setTimeout(() => donutRef.value?.resize(), 620)
})
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
      <span>Allocation</span>
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
      class="allocation-body grid"
      :style="{ gridTemplateRows: isOpen ? '1fr' : '0fr' }"
    >
      <div class="min-h-0 overflow-hidden">
        <div
          class="flex flex-col items-center sm:flex-row sm:items-start gap-4 sm:gap-6"
          :class="isOpen ? 'mt-2 opacity-100' : 'opacity-0'"
        >
          <Donut
            ref="donutRef"
            :segments="segments"
            :size="180"
            :selected="selectedSymbol"
            class="shrink-0"
            @select="toggle"
          />
          <ul class="w-full min-w-0 flex-1 max-h-52 overflow-y-auto space-y-0.5">
            <li v-for="s in rows" :key="s.label">
              <button
                type="button"
                class="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors cursor-pointer"
                :class="selectedSymbol === s.label ? 'bg-muted' : 'hover:bg-muted/60'"
                :aria-pressed="selectedSymbol === s.label"
                @click="toggle(s.label)"
              >
                <span class="flex min-w-0 items-center gap-2">
                  <span class="size-2 shrink-0 rounded-full" :style="{ backgroundColor: s.color }" aria-hidden="true" />
                  <span class="text-xs font-medium text-foreground truncate">{{ s.label }}</span>
                </span>
                <span class="flex shrink-0 items-center gap-2 tabular-nums">
                  <span class="text-xs text-muted-foreground">{{ formatCurrency(fromUsd(s.value, displayCurrency), displayCurrency) }}</span>
                  <span class="w-12 text-right text-xs font-semibold text-foreground">{{ totalValue ? ((s.value / totalValue) * 100).toFixed(1) : '0.0' }}%</span>
                </span>
              </button>
            </li>
          </ul>
        </div>

        <div class="mt-5 border-t border-border/40 pt-4">
          <p class="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Cash vs investments
          </p>
          <div class="rounded-xl bg-muted/30 p-3">
            <div class="flex h-2.5 w-full overflow-hidden rounded-full" :style="{ backgroundColor: CASH_COLOR }" role="img" :aria-label="`Investments ${investedPct.toFixed(1)}%, cash ${cashPct.toFixed(1)}%`">
              <div class="transition-all duration-500 rounded-r-full" :style="{ width: `${investedPct}%`, backgroundColor: INVESTED_COLOR }" />
            </div>
            <div class="mt-3 space-y-1">
              <div class="flex w-full items-center justify-between gap-2">
                <span class="flex min-w-0 items-center gap-2">
                  <span class="size-2 shrink-0 rounded-full" :style="{ backgroundColor: INVESTED_COLOR }" aria-hidden="true" />
                  <span class="text-xs font-medium text-foreground">Investments</span>
                </span>
                <span class="flex shrink-0 items-center gap-2 tabular-nums">
                  <span class="text-xs text-muted-foreground">{{ formatCurrency(fromUsd(cashSplit.invested, displayCurrency), displayCurrency) }}</span>
                  <span class="w-12 text-right text-xs font-semibold text-foreground">{{ investedPct.toFixed(1) }}%</span>
                </span>
              </div>
              <div class="flex w-full items-center justify-between gap-2">
                <span class="flex min-w-0 items-center gap-2">
                  <span class="size-2 shrink-0 rounded-full" :style="{ backgroundColor: CASH_COLOR }" aria-hidden="true" />
                  <span class="text-xs font-medium text-foreground">Cash</span>
                </span>
                <span class="flex shrink-0 items-center gap-2 tabular-nums">
                  <span class="text-xs text-muted-foreground">{{ formatCurrency(fromUsd(cashSplit.cash, displayCurrency), displayCurrency) }}</span>
                  <span class="w-12 text-right text-xs font-semibold text-foreground">{{ cashPct.toFixed(1) }}%</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="currencies.length > 1"
          class="mt-5 border-t border-border/40 pt-4"
        >
          <p class="mb-3 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Currency exposure
          </p>
          <div class="rounded-xl bg-muted/30 p-3">
            <div class="flex h-2.5 w-full items-stretch overflow-hidden rounded-full bg-muted" role="img" :aria-label="currencyBarLabel">
              <div
                v-for="c in currencies"
                :key="c.label"
                class="transition-all duration-500"
                :style="{ width: `${totalValue ? (c.value / totalValue) * 100 : 0}%`, backgroundColor: c.color }"
              />
            </div>
            <div class="mt-3 space-y-1">
              <button
                v-for="c in currencies"
                :key="c.label"
                type="button"
                class="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors cursor-pointer"
                :class="selectedCurrency === c.label ? 'bg-muted' : 'hover:bg-muted/60'"
                :aria-pressed="selectedCurrency === c.label"
                @click="toggleCurrency(c.label)"
              >
                <span class="flex min-w-0 items-center gap-2">
                  <span class="size-2 shrink-0 rounded-full" :style="{ backgroundColor: c.color }" aria-hidden="true" />
                  <span class="text-xs font-medium text-foreground">{{ c.label }}</span>
                </span>
                <span class="flex shrink-0 items-center gap-2 tabular-nums">
                  <span class="text-xs text-muted-foreground">{{ formatCurrency(fromUsd(c.value, c.label), c.label) }}</span>
                  <span class="w-12 text-right text-xs font-semibold text-foreground">{{ totalValue ? ((c.value / totalValue) * 100).toFixed(1) : '0.0' }}%</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.allocation-body {
  /* GPU-composited height animation via grid-template-rows — no measurement, no layout thrash */
  transition: grid-template-rows 600ms cubic-bezier(0.4, 0, 0.2, 1);
  will-change: grid-template-rows;
}
.allocation-body > div > div {
  transition: opacity 380ms ease 120ms;
}
</style>
