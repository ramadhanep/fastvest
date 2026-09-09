<script setup lang="ts">
import { ref, computed } from 'vue'
import { ArrowDownRight, ArrowUpRight, Minus, Eye, EyeOff } from '@lucide/vue'
import type { PortfolioSummary } from '#shared/types'
import { formatCurrency, formatPercent } from '~/utils/format'

const props = defineProps<{
  summary: PortfolioSummary
  currency: string
  hasQuotes: boolean
  quoteErrors: number
}>()

const showBalance = ref(true)

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
    <!-- Header: Privacy Toggle only -->
    <div class="flex items-center justify-end">
      <button
        type="button"
        class="size-7 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors ios-press cursor-pointer"
        aria-label="Toggle balance visibility"
        @click="showBalance = !showBalance"
      >
        <EyeOff v-if="showBalance" class="size-3.5" />
        <Eye v-else class="size-3.5" />
      </button>
    </div>

    <!-- Main Value -->
    <div class="mt-1">
      <h2 class="text-[2rem] font-semibold tracking-tight tabular-nums text-foreground leading-none">
        <template v-if="showBalance">
          {{ formatCurrency(summary.totalValue, currency) }}
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
              {{ isGain ? '+' : '' }}{{ formatCurrency(summary.totalPnl, currency) }}
            </template>
            <template v-else>•••</template>
            <span class="opacity-60 ml-0.5">{{ summary.totalPnlPercent === undefined ? '' : formatPercent(summary.totalPnlPercent) }}</span>
          </span>
        </div>
        <span class="text-[11px] text-muted-foreground tabular-nums">{{ summary.holdingsCount }}</span>
      </div>
    </div>

    <!-- 3-Column Metrics -->
    <div class="mt-4 grid grid-cols-3 gap-0 rounded-xl bg-muted/30 overflow-hidden">
      <div class="px-3 py-2.5 text-center">
        <p class="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Invested</p>
        <p class="mt-0.5 text-xs font-semibold tabular-nums text-foreground truncate">
          <template v-if="showBalance">{{ formatCurrency(summary.totalCostBasis, currency) }}</template>
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
            {{ isGain ? '+' : '' }}{{ formatCurrency(summary.totalPnl, currency) }}
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
