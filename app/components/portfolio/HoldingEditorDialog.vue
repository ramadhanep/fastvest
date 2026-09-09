<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Search, Loader2, ArrowLeft, Zap } from '@lucide/vue'
import type { Holding, SearchResult } from '#shared/types'
import { holdingSchema } from '#shared/schemas/holding'
import { toast } from 'vue-sonner'
import {
  RECOMMENDED_CATEGORIES,
  RECOMMENDED_ASSETS,
  type RecommendedAsset,
  type RecommendationCategory,
} from '~/utils/recommendations'
import { formatCurrency } from '~/utils/format'
import AssetIcon from './AssetIcon.vue'

const props = defineProps<{
  open: boolean
  holding: Holding | null
}>()

const emit = defineEmits<{
  close: []
  saved: [holding: Holding, isNew: boolean]
}>()

const search = useSymbolSearch()
const portfolio = usePortfolio()
const quotes = useQuotes()

const query = computed(() => search.query.value)
const results = computed(() => search.results.value)
const searching = computed(() => search.searching.value)
const recent = computed(() => search.recent.value)

const step = ref<'symbol' | 'form'>('symbol')
const selected = ref<SearchResult | null>(null)
const manualSymbol = ref('')
const quantity = ref('')
const averageCost = ref('')
const currency = ref('USD')
const notes = ref('')
const isCash = ref(false) // new cash flag
const submitting = ref(false)
const qtyError = ref('')
const costError = ref('')
const selectedSymbol = ref('')

const activeCategory = ref<RecommendationCategory['key']>('popular')

const isEdit = computed(() => !!props.holding)

const filteredRecommendations = computed(() => {
  return RECOMMENDED_ASSETS.filter((a) => a.category === activeCategory.value)
})

const liveQuote = computed(() => {
  if (!selectedSymbol.value) return null
  return quotes.getQuote(selectedSymbol.value)
})

const estimatedTotal = computed(() => {
  const q = Number(quantity.value)
  const c = Number(averageCost.value)
  if (Number.isFinite(q) && Number.isFinite(c) && q > 0 && c > 0) {
    return q * c
  }
  return 0
})

watch(
  () => props.open,
  (open) => {
    if (!open) return
    if (props.holding) {
      selectedSymbol.value = props.holding.symbol
      selected.value = {
        symbol: props.holding.symbol,
        name: props.holding.symbol,
        exchange: '',
        type: '',
      }
      quantity.value = String(props.holding.quantity)
      averageCost.value = String(props.holding.averageCost)
      currency.value = props.holding.currency ?? (props.holding.symbol.endsWith('.JK') ? 'IDR' : 'USD')
      notes.value = props.holding.notes ?? ''
      isCash.value = props.holding.isCash ?? false
      step.value = 'form'
      manualSymbol.value = props.holding.symbol
      quotes.refresh([props.holding.symbol])
    } else {
      selectedSymbol.value = ''
      selected.value = null
      manualSymbol.value = ''
      quantity.value = ''
      averageCost.value = ''
      currency.value = 'USD'
      notes.value = ''
      isCash.value = false
      step.value = 'symbol'
      activeCategory.value = 'popular'
    }
    search.onInput('')
  },
)

function onPick(item: SearchResult) {
  selected.value = item
  selectedSymbol.value = item.symbol
  currency.value = item.symbol.endsWith('.JK') ? 'IDR' : 'USD'
  step.value = 'form'
  search.close()
  quotes.refresh([item.symbol])
}

function onPickRecommended(item: RecommendedAsset) {
  selected.value = {
    symbol: item.symbol,
    name: item.name,
    exchange: item.exchange ?? '',
    type: 'EQUITY',
  }
  selectedSymbol.value = item.symbol
  currency.value = item.currency
  step.value = 'form'
  search.close()
  quotes.refresh([item.symbol])
}

function onManual() {
  const sym = query.value.trim().toUpperCase()
  if (!sym) return
  manualSymbol.value = sym
  selected.value = null
  selectedSymbol.value = sym
  if (sym.endsWith('.JK')) {
    currency.value = 'IDR'
  }
  step.value = 'form'
  search.close()
  quotes.refresh([sym])
}

function back() {
  step.value = 'symbol'
}

function sanitizeDecimal(raw: string): string {
  const cleaned = String(raw).replace(/,/g, '.').replace(/[^0-9.]/g, '')
  const dotIndex = cleaned.indexOf('.')
  if (dotIndex === -1) return cleaned
  return `${cleaned.slice(0, dotIndex)}.${cleaned.slice(dotIndex + 1).replace(/\./g, '')}`
}

function addQty(delta: number) {
  const current = Number(quantity.value) || 0
  quantity.value = String(Math.max(0, current + delta))
}

function useMarketPrice() {
  if (liveQuote.value?.price) {
    averageCost.value = String(liveQuote.value.price)
    toast.success(`Market price (${liveQuote.value.price}) applied`)
  }
}

function validate(): boolean {
  qtyError.value = ''
  costError.value = ''
  let ok = true
  const q = Number(quantity.value)
  const c = Number(averageCost.value)
  if (!Number.isFinite(q) || q <= 0) {
    qtyError.value = 'Quantity must be greater than 0.'
    ok = false
  }
  if (!Number.isFinite(c) || c < 0) {
    costError.value = 'Please enter a valid average cost.'
    ok = false
  }
  return ok
}

async function save() {
  if (!validate()) return
  submitting.value = true
  try {
    const parsed = holdingSchema.omit({ id: true, createdAt: true }).parse({
      symbol: selectedSymbol.value,
      quantity: Number(quantity.value),
      averageCost: isCash.value ? 1 : Number(averageCost.value),
      currency: currency.value,
      notes: notes.value || undefined,
      isCash: isCash.value,
    })

    if (isEdit.value && props.holding) {
      portfolio.updateHolding(props.holding.id, parsed)
      toast.success(`${parsed.symbol} updated`)
      emit('saved', { ...props.holding, ...parsed }, false)
    } else {
      const holding = portfolio.addHolding(parsed)
      toast.success(`${parsed.symbol} added to portfolio`)
      emit('saved', holding, true)
    }
    emit('close')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UiDialog :open="open" @update:open="(v: boolean) => !v && emit('close')">
    <UiDialogContent
      class="sm:max-w-md rounded-3xl p-5 sm:p-6 border border-border/80 bg-card shadow-2xl transition-all"
    >
      <UiDialogHeader class="text-left">
        <UiDialogTitle class="text-base font-semibold tracking-tight">
          {{ isEdit ? 'Edit Position' : 'Add Holding' }}
        </UiDialogTitle>
      </UiDialogHeader>

      <!-- Step 1: Symbol Selection -->
      <template v-if="step === 'symbol'">
        <div class="relative mt-2">
          <Search
            class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <UiInput
            :model-value="query"
            class="pl-9 h-10 rounded-xl bg-muted/40 border-border/70 text-xs focus-visible:ring-1"
            placeholder="Search symbol, e.g. NVDA, BBCA, BTC..."
            autofocus
            @update:model-value="search.onInput(String($event))"
            @keydown.enter.prevent="onManual"
          />
        </div>

        <div class="mt-3 max-h-80 overflow-y-auto no-scrollbar space-y-3" role="listbox" aria-label="Asset options">
          <!-- Curated Categories -->
          <template v-if="!query.trim()">
            <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 pt-0.5">
              <button
                v-for="cat in RECOMMENDED_CATEGORIES"
                :key="cat.key"
                type="button"
                class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer"
                :class="
                  activeCategory === cat.key
                    ? 'bg-foreground text-background'
                    : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                "
                @click="activeCategory = cat.key"
              >
                {{ cat.label }}
              </button>
            </div>

            <!-- Recommendation Grid -->
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="asset in filteredRecommendations"
                :key="asset.symbol"
                type="button"
                role="option"
                class="group flex flex-col justify-between rounded-2xl border border-border/60 bg-muted/20 p-3 text-left transition-colors hover:border-border hover:bg-muted/40 cursor-pointer min-w-0"
                @click="onPickRecommended(asset)"
              >
                <div class="flex items-center justify-between gap-1.5">
                  <AssetIcon :symbol="asset.symbol" size="sm" />
                  <span
                    v-if="asset.badge"
                    class="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground truncate"
                  >
                    {{ asset.badge }}
                  </span>
                </div>

                <div class="mt-2 min-w-0">
                  <p class="text-xs font-semibold truncate leading-tight text-foreground">
                    {{ asset.symbol }}
                  </p>
                  <p class="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
                    {{ asset.name }}
                  </p>
                </div>

                <div class="mt-2 flex items-center text-[11px] text-muted-foreground font-medium">
                  <span>{{ asset.currency }}</span>
                </div>
              </button>
            </div>

            <!-- Recent Searches -->
            <div v-if="recent.length" class="pt-2 border-t border-border/40">
              <p class="px-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                Recent
              </p>
              <div class="space-y-1">
                <button
                  v-for="item in recent"
                  :key="item.symbol"
                  type="button"
                  role="option"
                  class="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted/60 cursor-pointer"
                  @click="onPick(item)"
                >
                  <div class="flex items-center gap-2">
                    <AssetIcon :symbol="item.symbol" size="sm" />
                    <div>
                      <span class="font-medium block">{{ item.symbol }}</span>
                      <span class="text-[11px] text-muted-foreground truncate block">{{ item.name }}</span>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </template>

          <!-- Searching State -->
          <div v-else-if="searching" class="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
            <Loader2 class="size-4 animate-spin" />
            Searching market quotes…
          </div>

          <!-- Search Results -->
          <div v-else class="space-y-1.5">
            <button
              v-for="item in results"
              :key="item.symbol"
              type="button"
              role="option"
              class="flex w-full items-center justify-between gap-3 rounded-2xl border border-transparent p-2.5 text-left transition-colors hover:bg-muted/50 cursor-pointer"
              @click="onPick(item)"
            >
              <div class="flex items-center gap-2.5 min-w-0">
                <AssetIcon :symbol="item.symbol" size="sm" />
                <div class="min-w-0">
                  <p class="text-xs font-semibold leading-tight">{{ item.symbol }}</p>
                  <p class="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">{{ item.name }}</p>
                </div>
              </div>
              <span class="text-[11px] text-muted-foreground font-medium shrink-0">{{ item.exchange }}</span>
            </button>

            <!-- Manual enter fallback -->
            <button
              v-if="query.trim()"
              type="button"
              class="flex w-full items-center justify-between rounded-2xl border border-dashed border-border/80 p-3 text-xs text-muted-foreground hover:bg-muted/40 transition-colors cursor-pointer"
              @click="onManual"
            >
              <span>Use <strong class="text-foreground">"{{ query.trim().toUpperCase() }}"</strong></span>
            </button>
          </div>
        </div>
      </template>

      <!-- Step 2: Position Form -->
      <template v-else>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer py-1"
          @click="back"
        >
          <ArrowLeft class="size-3.5" aria-hidden="true" />
          Back
        </button>

        <!-- Selected Asset Card -->
        <div class="flex items-center justify-between rounded-2xl bg-muted/40 p-3 mt-1 border border-border/40">
          <div class="flex items-center gap-2.5 min-w-0">
            <AssetIcon :symbol="selectedSymbol" size="md" />
            <div class="min-w-0">
              <p class="text-sm font-semibold leading-tight">{{ selectedSymbol }}</p>
              <p class="text-xs text-muted-foreground truncate leading-tight mt-0.5">
                {{ selected?.name ?? manualSymbol }}
              </p>
            </div>
          </div>
          <span class="rounded-full bg-background px-2.5 py-0.5 text-[11px] font-medium text-foreground border border-border/60">
            {{ currency }}
          </span>
        </div>

        <!-- Live Price helper -->
        <div
          v-if="liveQuote?.price"
          class="mt-2 flex items-center justify-between rounded-xl bg-muted/50 border border-border/60 px-3 py-1.5 text-xs"
        >
          <span class="text-muted-foreground">
            Market price: <strong class="text-foreground">{{ formatCurrency(liveQuote.price, currency) }}</strong>
          </span>
          <button
            type="button"
            class="inline-flex items-center gap-1 text-[11px] font-medium text-foreground hover:underline cursor-pointer"
            @click="useMarketPrice"
          >
            <Zap class="size-3 text-muted-foreground" />
            Use price
          </button>
        </div>

        <form class="space-y-4 mt-3" @submit.prevent="save">
          <!-- Count as Cash Checkbox -->
          <div class="flex items-center gap-2 px-1">
            <input
              id="fv-is-cash"
              v-model="isCash"
              type="checkbox"
              class="size-4 rounded border-border/70 text-foreground focus:ring-ring"
            />
            <UiLabel for="fv-is-cash" class="text-xs font-medium cursor-pointer">Count as Cash / Stablecoin</UiLabel>
          </div>

          <!-- Quantity / Amount -->
          <div>
            <div class="flex items-center justify-between">
              <UiLabel for="fv-qty" class="text-xs font-medium">{{ isCash ? 'Amount' : 'Quantity' }}</UiLabel>
              <div v-if="!isCash" class="flex items-center gap-1">
                <button
                  v-for="delta in (selectedSymbol.endsWith('.JK') ? [100, 500, 1000] : [1, 5, 10, 50])"
                  :key="delta"
                  type="button"
                  class="px-2 py-0.5 rounded-md bg-muted text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  @click="addQty(delta)"
                >
                  +{{ delta }}
                </button>
              </div>
            </div>
            <UiInput
              id="fv-qty"
              :model-value="quantity"
              type="text"
              inputmode="decimal"
              placeholder="e.g. 10"
              class="mt-1.5 h-10 rounded-xl"
              :aria-describedby="qtyError ? 'fv-qty-err' : undefined"
              @update:model-value="quantity = sanitizeDecimal(String($event))"
            />
            <p v-if="qtyError" id="fv-qty-err" class="mt-1 text-xs text-destructive font-medium">
              {{ qtyError }}
            </p>
          </div>

          <!-- Average Cost (hide if cash) -->
          <div v-if="!isCash">
            <UiLabel for="fv-cost" class="text-xs font-medium">Average Cost</UiLabel>
            <UiInput
              id="fv-cost"
              :model-value="averageCost"
              type="text"
              inputmode="decimal"
              placeholder="e.g. 150.25"
              class="mt-1.5 h-10 rounded-xl"
              :aria-describedby="costError ? 'fv-cost-err' : undefined"
              @update:model-value="averageCost = sanitizeDecimal(String($event))"
            />
            <p v-if="costError" id="fv-cost-err" class="mt-1 text-xs text-destructive font-medium">
              {{ costError }}
            </p>
          </div>

          <!-- Estimated Total -->
          <div v-if="estimatedTotal > 0 && !isCash" class="rounded-xl border border-border/60 bg-muted/30 p-2.5 flex items-center justify-between text-xs">
            <span class="text-muted-foreground">Est. Investment</span>
            <span class="font-semibold tabular-nums text-foreground">
              {{ formatCurrency(estimatedTotal, currency) }}
            </span>
          </div>

          <!-- Currency & Notes -->
          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <UiLabel for="fv-currency" class="text-xs font-medium">Currency</UiLabel>
              <UiInput
                id="fv-currency"
                v-model="currency"
                list="currency-options"
                placeholder="USD"
                maxlength="3"
                class="mt-1.5 h-10 rounded-xl uppercase font-medium"
              />
              <datalist id="currency-options">
                <option value="USD" />
                <option value="IDR" />
                <option value="EUR" />
                <option value="SGD" />
              </datalist>
            </div>
            <div>
              <UiLabel for="fv-notes" class="text-xs font-medium">Notes (optional)</UiLabel>
              <UiInput
                id="fv-notes"
                v-model="notes"
                placeholder="e.g. Core portfolio"
                class="mt-1.5 h-10 rounded-xl"
              />
            </div>
          </div>

          <UiDialogFooter class="mt-5">
            <button
              type="submit"
              class="h-11 rounded-full w-full bg-foreground text-background font-medium text-sm hover:opacity-90 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              :disabled="submitting || !selectedSymbol"
            >
              <Loader2 v-if="submitting" class="size-3.5 animate-spin" aria-hidden="true" />
              {{ isEdit ? 'Save' : 'Add Holding' }}
            </button>
          </UiDialogFooter>
        </form>
      </template>
    </UiDialogContent>
  </UiDialog>
</template>
