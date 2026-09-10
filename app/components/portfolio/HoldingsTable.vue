<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronDown, Pencil, Trash2 } from '@lucide/vue'
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
const swipedId = ref<string | null>(null)

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
      displayName: h.name ?? h.symbol,
      isCashH: !!(h.isCash || h.symbol.startsWith('CASH-')),
      currency: cur,
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

let touchStartX = 0
let touchStartY = 0
let touchMoved = false  // true if finger moved enough in any direction (scroll or swipe)
let swiping = false     // true only if horizontal swipe detected

const dragX = ref(0)
const draggingId = ref<string | null>(null)

function onRowTouchStart(e: TouchEvent, id: string) {
  if (swipedId.value && swipedId.value !== id) { swipedId.value = null }
  const t = e.touches[0]
  if (!t) return
  touchStartX = t.clientX
  touchStartY = t.clientY
  touchMoved = false
  swiping = false
  draggingId.value = null
}

function onRowTouchMove(e: TouchEvent, id: string) {
  const t = e.touches[0]
  if (!t) return
  const dx = t.clientX - touchStartX
  const dy = t.clientY - touchStartY
  const dist = Math.sqrt(dx * dx + dy * dy)
  // Any movement > 6px means the finger is scrolling or swiping — not a tap
  if (dist > 6) {
    touchMoved = true
  }
  // Horizontal swipe detection (left-swipe to reveal actions)
  if (!swiping && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
    swiping = true
    draggingId.value = id
  }
  if (swiping && draggingId.value === id) {
    // Rubber-band: resistance past -140 (max reveal) and past 0 (right stretch)
    const base = swipedId.value === id ? -120 : 0
    let x = base + dx
    if (x < -140) x = -140 - (x + 140) * 0.35
    else if (x > 0) x = x * 0.35
    dragX.value = x
  }
}

function rowTransform(id: string): string {
  if (draggingId.value === id) return `${dragX.value}px`
  return swipedId.value === id ? '-120px' : '0px'
}

function onRowTouchEnd(e: TouchEvent, h: Holding) {
  const t = e.changedTouches[0]
  if (!t) { swiping = false; touchMoved = false; draggingId.value = null; return }
  const dx = t.clientX - touchStartX

  if (swiping) {
    // Spring snap: open if dragged past -70 OR flicked past -50
    const shouldOpen = dragX.value < -70 || dx < -50
    swipedId.value = shouldOpen ? h.id : null
    draggingId.value = null
    dragX.value = 0
  } else if (!touchMoved) {
    // Clean tap (no movement): navigate or close swiped row
    if (swipedId.value === h.id) { swipedId.value = null }
    else { openDetail(h) }
  }
  // Vertical scroll (touchMoved && !swiping): do nothing, let scroll happen

  swiping = false
  touchMoved = false
  // Suppress the synthetic click event that iOS fires after touchend
  hasTouched = true
  setTimeout(() => { hasTouched = false }, 500)
}

let hasTouched = false

function onRowClick(h: Holding) {
  // Suppress synthetic iOS click that fires ~300ms after touchend
  if (hasTouched) return
  if (swipedId.value) { swipedId.value = null; return }
  openDetail(h)
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
    <div class="mt-3 -mx-4 sm:mx-0 rounded-none sm:rounded-2xl bg-card divide-y divide-border/30 overflow-hidden">
      <div
        v-for="(row, i) in rows"
        :key="row.holding.id"
        class="relative overflow-hidden row-stagger contain-content"
        :style="{ animationDelay: `${Math.min(i, 8) * 45}ms` }"
        :class="{ 'bg-muted/15': filtering === row.holding.symbol }"
      >
        <!-- Action buttons (revealed on swipe) -->
        <div class="absolute inset-y-0 right-0 flex items-center">
          <button
            type="button"
            class="h-full px-5 flex items-center justify-center bg-muted/60 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            @click.stop="emit('edit', row.holding); swipedId = null"
          >
            <Pencil class="size-4" />
          </button>
          <button
            type="button"
            class="h-full px-5 flex items-center justify-center bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25 transition-colors cursor-pointer"
            @click.stop="emit('remove', row.holding); swipedId = null"
          >
            <Trash2 class="size-4" />
          </button>
        </div>

        <!-- Swipeable card content -->
        <div
          class="relative flex items-center justify-between gap-3 px-4 py-3.5 bg-card transition-transform duration-300 ease-out will-change-transform"
          :class="{ 'swipe-no-transition': draggingId === row.holding.id }"
          :style="{ transform: `translateX(${rowTransform(row.holding.id)})` }"
          @click="onRowClick(row.holding)"
          @touchstart.passive="onRowTouchStart($event, row.holding.id)"
          @touchmove.passive="onRowTouchMove($event, row.holding.id)"
          @touchend="onRowTouchEnd($event, row.holding)"
        >
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <AssetIcon :symbol="row.holding.symbol" size="md" />

            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="text-sm font-semibold text-foreground">
                  {{ row.displayName }}
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
                <template v-if="row.isCashH">{{ formatCurrency(row.holding.quantity, row.currency) }}</template>
                <template v-else>
                  {{ formatQuantity(row.holding.quantity) }} · {{ formatNumber(row.holding.averageCost) }} {{ row.holding.currency ?? '' }}
                </template>
              </p>
            </div>
          </div>

          <!-- Market Value & Total Return -->
          <div class="text-right shrink-0">
            <p class="text-sm font-semibold tabular-nums text-foreground">
              {{ row.quote
                ? formatCurrency(row.metrics.marketValue, row.quote.currency ?? 'USD')
                : row.isCashH
                  ? formatCurrency(row.metrics.marketValue, row.currency)
                  : '—' }}
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
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.swipe-no-transition {
  transition: none !important;
}
</style>
