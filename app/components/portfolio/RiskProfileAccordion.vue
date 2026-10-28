<script setup lang="ts">
import type { Holding, Quote } from '#shared/types'
import { calculatePortfolioRiskProfile } from '~/utils/calculations'
import { useExchangeRates } from '~/composables/useExchangeRates'

const props = defineProps<{
  holdings: readonly Holding[]
  getQuote: (symbol: string) => Quote | null
}>()

const { toUsd } = useExchangeRates()
const { t } = useI18n()
const isOpen = ref(false)
const profile = computed(() => calculatePortfolioRiskProfile(props.holdings, props.getQuote, toUsd))
const levelLabel = computed(() => t(`riskProfile${profile.value.level.charAt(0).toUpperCase()}${profile.value.level.slice(1)}` as 'riskProfileConservative'))
const riskColorClass = computed(() => ({
  conservative: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  moderatelyConservative: 'bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300',
  moderate: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  aggressive: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  veryAggressive: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
}[profile.value.level]))
const riskBarClass = computed(() => ({
  conservative: 'bg-emerald-500',
  moderatelyConservative: 'bg-lime-500',
  moderate: 'bg-amber-500',
  aggressive: 'bg-orange-500',
  veryAggressive: 'bg-red-500',
}[profile.value.level]))

function pct(value: number) {
  return `${value.toFixed(1)}%`
}
</script>

<template>
  <div class="rounded-2xl bg-card p-5 card-press elev-1 contain-layout">
    <button
      type="button"
      class="flex w-full items-center justify-between cursor-pointer text-sm font-semibold text-foreground"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      <span class="flex items-center gap-2">
        <span>{{ t('riskProfileTitle') }}</span>
        <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold" :class="riskColorClass">{{ levelLabel }}</span>
      </span>
      <span class="flex items-center gap-2">
        <span class="text-xs tabular-nums text-muted-foreground">{{ t('riskProfileScore', { score: profile.score }) }}</span>
        <svg class="size-4 text-muted-foreground transition-transform duration-300" :class="isOpen ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </span>
    </button>

    <div class="risk-body grid" :style="{ gridTemplateRows: isOpen ? '1fr' : '0fr' }">
      <div class="min-h-0 overflow-hidden">
        <div class="pt-4" :class="isOpen ? 'opacity-100' : 'opacity-0'">
          <div class="flex items-center gap-3">
            <div class="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div class="h-full rounded-full transition-all duration-500" :class="riskBarClass" :style="{ width: `${profile.score}%` }" /></div>
            <span class="text-xs font-semibold tabular-nums">{{ profile.score }}</span>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div class="rounded-xl bg-muted/40 p-3"><p class="text-muted-foreground">{{ t('riskProfileEquity') }}</p><p class="mt-1 font-semibold">{{ pct(profile.equityPct) }}</p></div>
            <div class="rounded-xl bg-muted/40 p-3"><p class="text-muted-foreground">{{ t('riskProfileCrypto') }}</p><p class="mt-1 font-semibold">{{ pct(profile.cryptoPct) }}</p></div>
            <div class="rounded-xl bg-muted/40 p-3"><p class="text-muted-foreground">{{ t('riskProfileCash') }}</p><p class="mt-1 font-semibold">{{ pct(profile.cashPct) }}</p></div>
            <div class="rounded-xl bg-muted/40 p-3"><p class="text-muted-foreground">{{ t('riskProfileConcentration') }}</p><p class="mt-1 font-semibold">{{ pct(profile.largestHoldingPct) }}</p></div>
          </div>
          <p class="mt-4 text-[11px] text-muted-foreground">{{ t('riskProfileAdvice') }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.risk-body { transition: grid-template-rows 450ms cubic-bezier(0.4, 0, 0.2, 1); }
.risk-body > div > div { transition: opacity 280ms ease 90ms; }
</style>
