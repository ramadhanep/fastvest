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
  <section
    aria-label="Portfolio summary"
    class="rounded-3xl border border-border/70 bg-card p-5 sm:p-6 transition-all"
  >
    <!-- Header: Label + Privacy Toggle -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2 text-xs text-muted-foreground font-medium">
        <span
          class="size-2 rounded-full"
          :class="hasQuotes ? 'bg-emerald-500' : 'bg-amber-500'"
        />
        <span>Portfolio Value</span>
      </div>
      <button
        type="button"
        class="size-8 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors ios-press cursor-pointer"
        aria-label="Toggle balance visibility"
        @click="showBalance = !showBalance"
      >
        <EyeOff v-if="showBalance" class="size-4" />
        <Eye v-else class="size-4" />
      </button>
    </div>

    <!-- Main Value & PnL Badge -->
    <div class="mt-3">
      <h2 class="text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums text-foreground">
        <template v-if="showBalance">
          {{ formatCurrency(summary.totalValue, currency) }}
        </template>
        <template v-else>
          ••••••••
        </template>
      </h2>

      <!-- Gain / Loss Pill -->
      <div class="mt-2.5 flex flex-wrap items-center gap-2">
        <div
          v-if="hasQuotes"
          class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums"
          :class="
            isGain
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
          "
        >
          <component :is="trendIcon" class="size-3.5" />
          <span>
            <template v-if="showBalance">
              {{ isGain ? '+' : '' }}{{ formatCurrency(summary.totalPnl, currency) }}
            </template>
            <template v-else>••••</template>
            ({{ summary.totalPnlPercent === undefined ? '—' : formatPercent(summary.totalPnlPercent) }})
          </span>
        </div>

        <span class="text-xs text-muted-foreground">
          {{ summary.holdingsCount }} assets
        </span>
      </div>
    </div>

    <!-- 3-Column Metrics -->
    <div class="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-muted/40 p-3 border border-border/40 text-xs">
      <!-- Cost Basis -->
      <div>
        <p class="text-[11px] text-muted-foreground font-medium">Invested</p>
        <p class="mt-1 font-semibold tabular-nums text-foreground truncate">
          <template v-if="showBalance">{{ formatCurrency(summary.totalCostBasis, currency) }}</template>
          <template v-else>••••</template>
        </p>
      </div>

      <!-- Total Return -->
      <div class="border-x border-border/40 px-2">
        <p class="text-[11px] text-muted-foreground font-medium">Total Return</p>
        <p
          class="mt-1 font-semibold tabular-nums truncate"
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

      <!-- Today Change -->
      <div class="pl-1">
        <p class="text-[11px] text-muted-foreground font-medium">Today</p>
        <p
          class="mt-1 font-semibold tabular-nums truncate"
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
      class="mt-3 text-xs text-amber-600 dark:text-amber-400 font-medium"
    >
      Quotes unavailable for {{ quoteErrors }} asset{{ quoteErrors === 1 ? '' : 's' }}
    </div>
  </section>
</template>
