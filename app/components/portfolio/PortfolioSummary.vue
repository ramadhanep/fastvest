<script setup lang="ts">
import { computed } from 'vue'
import { Minus, ArrowDownRight, ArrowUpRight, Eye, EyeOff } from '@lucide/vue'
import { useExchangeRates } from '~/composables/useExchangeRates'
import { usePreferences } from '~/composables/usePreferences'
import type { PortfolioSummary } from '#shared/types'
import { formatCurrency, formatPercent } from '~/utils/format'

const props = defineProps<{
  summary: PortfolioSummary
  // currency prop no longer needed, kept for backward compatibility
  currency: string
  hasQuotes: boolean
  quoteErrors: number
}>()

const showBalance = ref(true)

const { preferences, setDisplayCurrency } = usePreferences()
const { fromUsd } = useExchangeRates()

// Use persisted currency from preferences
const displayCurrency = computed(() => preferences.value.displayCurrency)

// convert USD totals to selected currency
const totalValue = computed(() => fromUsd(props.summary.totalValue, displayCurrency.value))
const totalCost = computed(() => fromUsd(props.summary.totalCostBasis, displayCurrency.value))
const totalPnl = computed(() => fromUsd(props.summary.totalPnl, displayCurrency.value))

const trendIcon = computed(() => {
  if (!props.hasQuotes) return Minus
  if (props.summary.totalDayChange > 0) return ArrowUpRight
  if (props.summary.totalDayChange < 0) return ArrowDownRight
  return Minus
})

const isGain = computed(() => props.summary.totalPnl >= 0)
const isDayGain = computed(() => props.summary.totalDayChange >= 0)
</script>


<template>
  <section aria-label="Portfolio summary" class="rounded-2xl bg-card p-5 transition-all">



    <div class="flex justify-between items-center">
      <div>
        <!-- Main Value -->
        <h2 class="text-[2.25rem] font-semibold tracking-tight tabular-nums text-foreground leading-none">
          <template v-if="showBalance">
            {{ formatCurrency(totalValue, displayCurrency) }}
          </template>
          <template v-else>
            ••••••••
          </template>
        </h2>
        <!-- P&L inline -->
        <div class="mt-2 flex items-center gap-2">
          <div
            v-if="hasQuotes"
            class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums"
            :class="
              isGain
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
            "
          >
            <component :is="trendIcon" class="size-3" />
            <span>
              <template v-if="showBalance">
                {{ isGain ? '+' : '' }}{{ formatCurrency(totalPnl, displayCurrency) }}
              </template>
              <template v-else>•••</template>
              <span class="opacity-60 ml-0.5">{{ summary.totalPnlPercent === undefined ? '' : formatPercent(summary.totalPnlPercent) }}</span>
            </span>
          </div>
          <span class="text-[11px] text-muted-foreground tabular-nums">{{ summary.holdingsCount }}</span>
        </div>
      </div>
      <div class="flex items-center">
        <button
          type="button"
          class="size-7 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors ios-press cursor-pointer"
          aria-label="Toggle balance visibility"
          @click="showBalance = !showBalance"
        >
          <EyeOff v-if="showBalance" class="size-3.5" />
          <Eye v-else class="size-3.5" />
        </button>
        <select
          :value="displayCurrency"
          class="ml-2 rounded-sm bg-muted/20 px-2 py-0.5 text-xs cursor-pointer"
          @change="setDisplayCurrency(($event.target as HTMLSelectElement).value as 'USD' | 'IDR' | 'SGD')"
        >
          <option value="USD">USD</option>
          <option value="IDR">IDR</option>
          <option value="SGD">SGD</option>
        </select>
      </div>
    </div>

    <!-- 3-Column Metrics -->
    <div class="mt-4 grid grid-cols-3 gap-0 rounded-xl bg-muted/30 overflow-hidden">
      <div class="px-3 py-2.5 text-center">
        <p class="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Invested</p>
        <p class="mt-0.5 text-xs font-semibold tabular-nums text-foreground truncate">
          <template v-if="showBalance">{{ formatCurrency(totalCost, displayCurrency) }}</template>
          <template v-else>••••</template>
        </p>
      </div>
      <div class="px-3 py-2.5 text-center border-x border-border/40">
        <p class="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Return</p>
        <p
          class="mt-0.5 text-xs font-semibold tabular-nums truncate"
          :class="
            hasQuotes
              ? isGain
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
              : 'text-muted-foreground'
          "
        >
          <template v-if="hasQuotes && showBalance">
            {{ isGain ? '+' : '' }}{{ formatCurrency(totalPnl, displayCurrency) }}
          </template>
          <template v-else-if="!showBalance">••••</template>
          <template v-else>—</template>
        </p>
      </div>
      <div class="px-3 py-2.5 text-center">
        <p class="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Today</p>
        <p
          class="mt-0.5 text-xs font-semibold tabular-nums truncate"
          :class="
            hasQuotes
              ? isDayGain
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
              : 'text-muted-foreground'
          "
        >
          <template v-if="hasQuotes">
            {{ summary.totalDayChangePercent === undefined ? '—' : formatPercent(summary.totalDayChangePercent) }}
          </template>
          <template v-else>—</template>
        </p>
      </div>
    </div>

    <!-- Quote warnings -->
    <div
      v-if="quoteErrors > 0"
      class="mt-2 text-[11px] text-amber-600 dark:text-amber-400"
    >
      {{ quoteErrors }} quote{{ quoteErrors === 1 ? '' : 's' }} unavailable
    </div>
  </section>
</template>
