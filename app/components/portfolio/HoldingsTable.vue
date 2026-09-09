<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronDown } from '@lucide/vue'
import type { Holding, Quote, SortKey } from '#shared/types'
import { calculateHoldingMetrics } from '~/utils/calculations'
import { formatCurrency, formatNumber, formatPercent, formatQuantity } from '~/utils/format'
import { useExchangeRates } from '~/composables/useExchangeRates'
import AssetIcon from './AssetIcon.vue'

const props = defineProps<{
  holdings: readonly Holding[]
  getQuote: (symbol: string) => Quote | null
  filtering?: string | null
}>()

const emit = defineEmits<{
  edit: [h: Holding]
  remove: [h: Holding]
}>()

const { ensureLoaded: ensureRates, toUsd } = useExchangeRates()
onMounted(ensureRates)

const route = useRoute()
const router = useRouter()
function openDetail(h: Holding) {
  void router.push({ path: `/holding/${encodeURIComponent(h.symbol)}` })
}

const sortKey = ref<SortKey>('weight')
const sortDir = ref<'asc' | 'desc'>('desc')
const filterStatus = ref<'all' | 'gain' | 'loss'>('all')
const sheetHolding = ref<Holding | null>(null)
const longPressTimer = ref<ReturnType<typeof setTimeout> | null>(null)

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'weight', label: 'Portfolio Weight' },
  { key: 'value', label: 'Market Value' },
  { key: 'pnl', label: 'Total Return' },
  { key: 'day', label: 'Day Change' },
  { key: 'symbol', label: 'Symbol' },
]

const rows = computed(() => {
  let list = props.holdings
  if (props.filtering) {
    list = list.filter((h) => h.symbol === props.filtering)
  }
  const withMetrics = list.map((h) => {
    const quote = props.getQuote(h.symbol)
    const metrics = calculateHoldingMetrics(h, quote)
    const cur = quote?.currency ?? h.currency ?? 'USD'
    return {
      holding: h,
      quote,
      metrics,
      usdValue: toUsd(metrics.marketValue, cur),
      usdPnl: toUsd(metrics.pnl, cur),
    }
  })

  let filtered = withMetrics
  if (filterStatus.value === 'gain') {
    filtered = filtered.filter((r) => r.metrics.pnl >= 0)
  } else if (filterStatus.value === 'loss') {
    filtered = filtered.filter((r) => r.metrics.pnl < 0)
  }

  const dir = sortDir.value === 'asc' ? 1 : -1
  return filtered.sort((a, b) => {
    const h = a.holding
    const o = b.holding
    switch (sortKey.value) {
      case 'symbol':
        return h.symbol.localeCompare(o.symbol) * dir
      case 'value':
        return (a.usdValue - b.usdValue) * dir
      case 'pnl':
        return (a.usdPnl - b.usdPnl) * dir
      case 'day':
        return (a.metrics.dayChange - b.metrics.dayChange) * dir
      case 'weight':
      default:
        return ((a.usdValue || 0) - (b.usdValue || 0)) * dir
    }
  })
})

function sortLabel(key: SortKey) {
  const opt = SORT_OPTIONS.find((o) => o.key === key)
  return opt ? opt.label : ''
}

function onPressStart(h: Holding) {
  longPressTimer.value = setTimeout(() => {
    sheetHolding.value = h
  }, 400)
}

function onPressEnd() {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
}

function openSheet(h: Holding) {
  sheetHolding.value = h
}

function closeSheet() {
  sheetHolding.value = null
}
</script>

<template>
  <section class="mt-4" aria-labelledby="holdings-heading">
    <!-- Header: Title & Sort/Add controls -->
    <div class="flex items-center justify-between gap-2">
      <h2 id="holdings-heading" class="text-sm font-semibold tracking-tight">Holdings</h2>

      <div class="flex items-center gap-1.5">
        <div class="relative">
          <select
            v-model="sortKey"
            :aria-label="`Sort holdings by ${sortLabel(sortKey)}`"
            class="appearance-none h-9 pl-3.5 pr-8 rounded-full bg-muted text-xs font-medium text-foreground cursor-pointer border border-border/60 outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option v-for="opt in SORT_OPTIONS" :key="opt.key" :value="opt.key" class="py-1">
              {{ opt.label }}
            </option>
          </select>
          <ChevronDown class="pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        </div>
      </div>
    </div>

    <!-- Filter Pills -->
    <div class="mt-3 flex items-center gap-2">
      <button
        v-for="f in ([{ key: 'all', label: 'All' }, { key: 'gain', label: 'Gains' }, { key: 'loss', label: 'Losses' }] as const)"
        :key="f.key"
        type="button"
        class="rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors cursor-pointer"
        :class="
          filterStatus === f.key
            ? f.key === 'gain' ? 'bg-emerald-600 text-white'
              : f.key === 'loss' ? 'bg-rose-600 text-white'
                : 'bg-foreground text-background'
            : 'bg-muted/50 text-muted-foreground'
        "
        @click="filterStatus = f.key"
      >
        {{ f.label }}
      </button>
    </div>

    <!-- Holdings List -->
    <div class="mt-3 rounded-2xl bg-card divide-y divide-border/30 overflow-hidden">
      <div
        v-for="row in rows"
        :key="row.holding.id"
        class="group flex items-center justify-between gap-3 px-4 py-3.5 active:bg-muted/30 transition-colors"
        :class="{ 'bg-muted/15': filtering === row.holding.symbol }"
      >
        <!-- Tappable holding card -->
        <button
          type="button"
          class="min-w-0 flex-1 flex items-center justify-between gap-3 text-left cursor-pointer"
          @click="openDetail(row.holding)"
          @touchstart.passive="onPressStart(row.holding)"
          @touchend="onPressEnd"
          @touchcancel="onPressEnd"
          @mousedown="onPressStart(row.holding)"
          @mouseup="onPressEnd"
          @mouseleave="onPressEnd"
          @contextmenu.prevent="openSheet(row.holding)"
        >
          <div class="flex items-center gap-3 min-w-0">
            <AssetIcon :symbol="row.holding.symbol" size="md" />

            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="text-sm font-semibold text-foreground">
                  {{ row.holding.symbol }}
                </span>
                <span
                  v-if="row.quote && row.quote.changePercent !== undefined"
                  class="rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums"
                  :class="
                    (row.quote.changePercent ?? 0) >= 0
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  "
                >
                  {{ (row.quote.changePercent ?? 0) >= 0 ? '+' : '' }}{{ formatPercent(row.quote.changePercent ?? 0) }}
                </span>
              </div>

              <p class="truncate text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                {{ formatQuantity(row.holding.quantity) }} · {{ formatNumber(row.holding.averageCost) }} {{ row.holding.currency ?? '' }}
              </p>
            </div>
          </div>

          <!-- Market Value & Total Return -->
          <div class="text-right shrink-0">
            <p class="text-sm font-semibold tabular-nums text-foreground">
              {{ row.quote ? formatCurrency(row.metrics.marketValue, row.quote.currency ?? 'USD') : '—' }}
            </p>
            <p
              class="text-[11px] font-medium tabular-nums mt-0.5"
              :class="
                row.quote && row.quote.price
                  ? row.metrics.pnl >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                  : 'text-muted-foreground'
              "
            >
              <template v-if="row.quote && row.quote.price">
                {{ row.metrics.pnl >= 0 ? '+' : '' }}{{ formatCurrency(row.metrics.pnl, row.quote.currency ?? 'USD') }}
              </template>
              <template v-else>—</template>
            </p>
          </div>
        </button>
      </div>
    </div>

    <!-- Mobile Action Sheet -->
    <UiActionSheet :open="!!sheetHolding" @close="closeSheet">
      <div class="px-5 pt-4 pb-2" v-if="sheetHolding">
        <div class="flex items-center gap-2.5">
          <AssetIcon :symbol="sheetHolding.symbol" size="md" />
          <div>
            <p class="text-sm font-semibold">{{ sheetHolding.symbol }}</p>
            <p class="text-[11px] text-muted-foreground">{{ sheetHolding.notes ?? formatQuantity(sheetHolding.quantity) + ' shares' }}</p>
          </div>
        </div>
      </div>
      <div class="divide-y divide-border/40">
        <UiActionSheetItem @click="openDetail(sheetHolding!); closeSheet()">
          View Details
        </UiActionSheetItem>
        <UiActionSheetItem @click="emit('edit', sheetHolding!); closeSheet()">
          Edit Position
        </UiActionSheetItem>
        <UiActionSheetItem destructive @click="emit('remove', sheetHolding!); closeSheet()">
          Delete
        </UiActionSheetItem>
      </div>
      <UiActionSheetCancel @click="closeSheet" />
    </UiActionSheet>
  </section>
</template>
