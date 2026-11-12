<script setup lang="ts">
import type { Holding, Quote } from '#shared/types'
import { formatCurrency, formatQuantity } from '~/utils/format'
import { remainingAfterSell } from '~/utils/calculations'

const props = defineProps<{
  open: boolean
  holding: Holding | null
  quote: Quote | null
}>()

const emit = defineEmits<{
  close: []
  sold: [left: number, sold: number]
}>()

const { t } = useI18n()
const { preferences } = usePreferences()
const { sellHolding } = usePortfolio()

const raw = ref('')
const error = ref('')

watch(() => props.open, (open) => {
  if (open) {
    raw.value = ''
    error.value = ''
  }
})

// iOS decimal keypads type a comma in many locales.
const qty = computed(() => Number(raw.value.replace(',', '.')))
const valid = computed(() => !!props.holding && Number.isFinite(qty.value) && qty.value > 0 && qty.value <= props.holding.quantity)
const closes = computed(() => valid.value && remainingAfterSell(props.holding!.quantity, qty.value) === 0)
const currency = computed(() => props.quote?.currency ?? props.holding?.currency ?? 'USD')
const estimate = computed(() => {
  const price = props.quote?.price
  if (!valid.value || !price || !props.holding) return null
  return (price - props.holding.averageCost) * qty.value
})

function submit() {
  const h = props.holding
  if (!h) return
  if (!valid.value) {
    error.value = t('sellErrorQty', { qty: formatQuantity(h.quantity) })
    return
  }
  const sold = qty.value
  const left = sellHolding(h.id, sold)
  emit('sold', left, sold)
}
</script>

<template>
  <UiDialog :open="open" @update:open="(v: boolean) => !v && emit('close')">
    <UiDialogContent v-if="holding" class="px-5 pt-5 border border-border/80 bg-card shadow-2xl">
      <UiDialogHeader class="text-left">
        <UiDialogTitle class="text-base font-semibold tracking-tight">{{ t('sellTitle', { symbol: holding.symbol }) }}</UiDialogTitle>
        <p class="text-xs text-muted-foreground">{{ t('sellHeld', { qty: formatQuantity(holding.quantity) }) }}</p>
      </UiDialogHeader>

      <form class="space-y-3" @submit.prevent="submit">
        <div>
          <div class="flex items-center justify-between">
            <UiLabel for="fv-sell-qty" class="text-xs font-medium">{{ t('sellQuantity') }}</UiLabel>
            <button
              type="button"
              class="px-2 py-0.5 rounded-md bg-muted text-[11px] font-medium text-muted-foreground cursor-pointer"
              @click="raw = String(holding.quantity); error = ''"
            >
              {{ t('sellAll') }}
            </button>
          </div>
          <UiInput
            id="fv-sell-qty"
            v-model="raw"
            inputmode="decimal"
            autocomplete="off"
            class="mt-1.5 h-11 rounded-xl text-base tabular-nums"
            :aria-invalid="!!error"
            @input="error = ''"
          />
          <p v-if="error" class="mt-1 text-[11px] text-destructive" role="alert">{{ error }}</p>
        </div>

        <div v-if="estimate !== null" class="flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-xs">
          <span class="text-muted-foreground">{{ t('sellEstimate') }}</span>
          <span
            class="font-semibold tabular-nums"
            :class="estimate >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
          >
            <template v-if="preferences.hideBalance">••••</template>
            <template v-else>{{ estimate >= 0 ? '+' : '' }}{{ formatCurrency(estimate, currency) }}</template>
          </span>
        </div>
        <p v-if="closes" class="text-[11px] text-amber-600 dark:text-amber-400">{{ t('sellCloses') }}</p>

        <button
          type="submit"
          class="w-full inline-flex items-center justify-center rounded-xl bg-foreground text-background h-12 text-sm font-semibold cursor-pointer ios-press disabled:opacity-50"
          :disabled="!raw"
        >
          {{ t('sellConfirm', { qty: valid ? formatQuantity(qty) : '' }) }}
        </button>
      </form>
    </UiDialogContent>
  </UiDialog>
</template>
