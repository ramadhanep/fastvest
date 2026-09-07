<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, MoreHorizontal, Pencil, Trash2 } from '@lucide/vue'
import type { Holding, Quote, SortKey } from '#shared/types'
import { calculateHoldingMetrics } from '~/utils/calculations'
import { formatCurrency, formatNumber, formatPercent, formatQuantity } from '~/utils/format'
import AssetIcon from './AssetIcon.vue'

const props = defineProps<{
  holdings: readonly Holding[]
  getQuote: (symbol: string) => Quote | null
  filtering?: string | null
}>()

const emit = defineEmits<{
  add: []
  edit: [h: Holding]
  remove: [h: Holding]
  detail: [h: Holding]
}>()

const sortKey = ref<SortKey>('weight')
const sortDir = ref<'asc' | 'desc'>('desc')
const filterStatus = ref<'all' | 'gain' | 'loss'>('all')

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'weight', label: 'Portfolio Weight' },
  { key: 'value', label: 'Market Value' },
  { key: 'pnl', label: 'Total Return (P&L)' },
  { key: 'day', label: 'Day Change' },
  { key: 'symbol', label: 'Symbol' },
]

const rows = computed(() => {
  let list = props.holdings
  if (props.filtering) {
    list = list.filter((h) => h.symbol === props.filtering)
  }
  const withMetrics = list.map((h) => ({
    holding: h,
    quote: props.getQuote(h.symbol),
    metrics: calculateHoldingMetrics(h, props.getQuote(h.symbol)),
  }))

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
        return (a.metrics.marketValue - b.metrics.marketValue) * dir
      case 'pnl':
        return (a.metrics.pnl - b.metrics.pnl) * dir
      case 'day':
        return (a.metrics.dayChange - b.metrics.dayChange) * dir
      case 'weight':
      default:
        return ((a.metrics.marketValue || 0) - (b.metrics.marketValue || 0)) * dir
    }
  })
})

function sortLabel(key: SortKey) {
  const opt = SORT_OPTIONS.find((o) => o.key === key)
  return opt ? opt.label : ''
}
</script>

<template>
  <section class="mt-6" aria-labelledby="holdings-heading">
    <!-- Header: Title & Sort/Add controls -->
    <div class="flex items-center justify-between gap-2">
      <div>
        <h2 id="holdings-heading" class="text-base font-semibold tracking-tight">Holdings</h2>
        <p class="text-xs text-muted-foreground">Asset performance &amp; positions</p>
      </div>

      <div class="flex items-center gap-2">
        <UiSelect v-model="sortKey" :aria-label="`Sort holdings by ${sortLabel(sortKey)}`">
          <UiSelectTrigger class="h-8 w-[140px] sm:w-[155px] text-xs rounded-full bg-muted/50 border-border/60">
            <UiSelectValue :placeholder="sortLabel(sortKey)" />
          </UiSelectTrigger>
          <UiSelectContent class="rounded-xl">
            <UiSelectItem v-for="opt in SORT_OPTIONS" :key="opt.key" :value="opt.key">
              {{ opt.label }}
            </UiSelectItem>
          </UiSelectContent>
        </UiSelect>

        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-full bg-foreground text-background text-xs font-medium hover:opacity-90 transition-all ios-press cursor-pointer"
          @click="emit('add')"
        >
          <Plus class="size-3.5" />
          <span>Add</span>
        </button>
      </div>
    </div>

    <!-- Filter Pills (All, Gains, Losses) -->
    <div class="mt-3 flex items-center justify-between gap-2 flex-wrap">
      <div class="flex items-center gap-1.5">
        <button
          type="button"
          class="rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer"
          :class="
            filterStatus === 'all'
              ? 'bg-foreground text-background'
              : 'bg-muted/50 text-muted-foreground hover:text-foreground'
          "
          @click="filterStatus = 'all'"
        >
          All ({{ holdings.length }})
        </button>
        <button
          type="button"
          class="rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer"
          :class="
            filterStatus === 'gain'
              ? 'bg-emerald-600 text-white'
              : 'bg-muted/50 text-muted-foreground hover:text-foreground'
          "
          @click="filterStatus = 'gain'"
        >
          Gains
        </button>
        <button
          type="button"
          class="rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer"
          :class="
            filterStatus === 'loss'
              ? 'bg-rose-600 text-white'
              : 'bg-muted/50 text-muted-foreground hover:text-foreground'
          "
          @click="filterStatus = 'loss'"
        >
          Losses
        </button>
      </div>

      <span
        v-if="filtering"
        class="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground font-medium"
      >
        Filtered: {{ filtering }}
      </span>
    </div>

    <!-- Mobile-First Inset List -->
    <div
      class="mt-3.5 rounded-3xl border border-border/70 bg-card divide-y divide-border/40 overflow-hidden"
    >
      <div
        v-for="row in rows"
        :key="row.holding.id"
        class="group flex items-center justify-between gap-3 p-3.5 sm:p-4 hover:bg-muted/25 transition-colors"
        :class="{ 'bg-muted/20': filtering === row.holding.symbol }"
      >
        <!-- Tappable holding card -->
        <button
          type="button"
          class="min-w-0 flex-1 flex items-center justify-between gap-3 text-left cursor-pointer"
          @click="emit('detail', row.holding)"
        >
          <div class="flex items-center gap-3 min-w-0">
            <AssetIcon :symbol="row.holding.symbol" size="md" />

            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-foreground">
                  {{ row.holding.symbol }}
                </span>
                <span
                  v-if="row.quote && row.quote.changePercent !== undefined"
                  class="rounded-full px-1.5 py-0.2 text-[10px] font-medium tabular-nums"
                  :class="
                    (row.quote.changePercent ?? 0) >= 0
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  "
                >
                  {{ (row.quote.changePercent ?? 0) >= 0 ? '+' : '' }}{{ formatPercent(row.quote.changePercent ?? 0) }}
                </span>
              </div>

              <p class="truncate text-xs text-muted-foreground mt-0.5">
                {{ formatQuantity(row.holding.quantity) }} · avg {{ formatNumber(row.holding.averageCost) }} {{ row.holding.currency ?? '' }}
              </p>
            </div>
          </div>

          <!-- Market Value & Total Return -->
          <div class="text-right shrink-0">
            <p class="text-sm font-semibold tabular-nums text-foreground">
              {{ row.quote ? formatCurrency(row.metrics.marketValue, row.quote.currency ?? 'USD') : '—' }}
            </p>
            <p
              class="text-xs font-medium tabular-nums mt-0.5"
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
              <template v-else>waiting data</template>
            </p>
          </div>
        </button>

        <!-- Dropdown menu -->
        <UiDropdownMenu>
          <UiDropdownMenuTrigger as-child>
            <button
              type="button"
              class="size-8 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer shrink-0"
              :aria-label="`Actions for ${row.holding.symbol}`"
            >
              <MoreHorizontal class="size-4" />
            </button>
          </UiDropdownMenuTrigger>
          <UiDropdownMenuContent align="end" class="rounded-xl">
            <UiDropdownMenuItem @select="emit('detail', row.holding)">
              <Pencil class="size-3.5 mr-2" />
              Detail &amp; Edit
            </UiDropdownMenuItem>
            <UiDropdownMenuItem variant="destructive" @select="emit('remove', row.holding)">
              <Trash2 class="size-3.5 mr-2" />
              Delete Holding
            </UiDropdownMenuItem>
          </UiDropdownMenuContent>
        </UiDropdownMenu>
      </div>
    </div>
  </section>
</template>
