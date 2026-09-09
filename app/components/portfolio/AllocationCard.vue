<script setup lang="ts">
import type { Holding, Quote } from '#shared/types'
import { calculateHoldingMetrics } from '~/utils/calculations'
import { brandColorFor } from '~/utils/brand-colors'
import { useExchangeRates } from '~/composables/useExchangeRates'

const FALLBACK_COLORS = [
  '#444444',
  '#0092BC',
  '#76B900',
  '#00A1F1',
  '#FF9900',
  '#0064E0',
  '#F7931A',
]

const props = withDefaults(
  defineProps<{
    holdings: readonly Holding[]
    getQuote: (symbol: string) => Quote | null
    selectedSymbol?: string | null
  }>(),
  { selectedSymbol: null },
)

const emit = defineEmits<{
  (e: 'select', symbol: string | null): void
}>()

const { ensureLoaded: ensureRates, toUsd } = useExchangeRates()

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
      color: brand ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length] ?? '#444444',
    }
  }).filter((s) => s.value > 0)
})

onMounted(ensureRates)

function toggle(symbol: string) {
  if (props.selectedSymbol === symbol) emit('select', null)
  else emit('select', symbol)
}

// ─── Smooth accordion ──────────────────────────────────────────────────────
const isOpen = ref(false)
const bodyEl = ref<HTMLElement | null>(null)
const bodyHeight = ref(0)

function onToggle() {
  isOpen.value = !isOpen.value
}

// Measure real height so we can animate max-height precisely
watch(isOpen, (open) => {
  if (open && bodyEl.value) {
    // Temporarily unclip to measure, then re-clip via max-height
    bodyHeight.value = bodyEl.value.scrollHeight
  }
})

// Re-measure if content changes (e.g. segments loaded)
watch(segments, () => {
  if (isOpen.value && bodyEl.value) {
    bodyHeight.value = bodyEl.value.scrollHeight
  }
})
</script>

<template>
  <div class="rounded-2xl bg-card p-5">
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
      class="allocation-body overflow-hidden"
      :style="{
        maxHeight: isOpen ? bodyHeight + 'px' : '0px',
        opacity: isOpen ? 1 : 0,
      }"
    >
      <div ref="bodyEl" class="mt-2 flex flex-col items-center gap-3">
        <div class="relative">
          <Donut :segments="segments" :size="180" />
        </div>
        <div class="flex flex-wrap items-center justify-center gap-1.5 max-w-xs">
          <button
            v-for="s in segments"
            :key="s.label"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors cursor-pointer"
            :class="selectedSymbol === s.label ? 'bg-muted' : 'bg-muted/40 hover:bg-muted'"
            :aria-pressed="selectedSymbol === s.label"
            @click="toggle(s.label)"
          >
            <span class="size-2 rounded-full" :style="{ backgroundColor: s.color }" aria-hidden="true" />
            <span class="text-[11px] font-medium text-foreground">{{ s.label }}</span>
          </button>
        </div>
        <div v-if="selectedSymbol" class="mt-2 flex items-center justify-end w-full">
          <button
            type="button"
            class="size-6 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
            aria-label="Clear filter"
            @click="emit('select', null)"
          >
            <svg viewBox="0 0 24 24" class="size-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.allocation-body {
  /* GPU-composited: only max-height + opacity change — no paint */
  transition:
    max-height 600ms cubic-bezier(0.4, 0, 0.2, 1),
    opacity 400ms ease;
  will-change: max-height, opacity;
}
</style>
