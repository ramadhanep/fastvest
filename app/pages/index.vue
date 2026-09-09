<script setup lang="ts">
import { AlertCircle, RefreshCw, Trash2, Download } from '@lucide/vue'
import type { Holding } from '#shared/types'
import { calculatePortfolioSummary } from '~/utils/calculations'
import { formatTimeAgo } from '~/utils/format'

const {
  holdings,
  storageError,
  resetPortfolio,
  exportPortfolio,
  isDemoPortfolio,
  isDemoDismissed,
  clearDemoPortfolio,
  loadDemoPortfolio,
  dismissDemoBanner,
} = usePortfolio()

const quotes = useQuotes()
const { preferences } = usePreferences()
const { online, justBackOnline } = useConnection()
const { refresh, getQuote, errors, lastUpdated, refreshing } = quotes
const addModal = useAddHoldingModal()
const { ensureLoaded: ensureRates, toUsd } = useExchangeRates()

useHead({ title: 'fastvest · Portfolio Tracker' })

const editorOpen = ref(false)
const editingHolding = ref<Holding | null>(null)
const deletingHolding = ref<Holding | null>(null)
const filteringSymbol = ref<string | null>(null)

// Watch addModal trigger
watch(addModal.isOpen, (open) => {
  if (open) {
    openAdd()
    addModal.close()
  }
})

const summary = computed(() =>
  calculatePortfolioSummary(holdings.value, (s) => getQuote(s), toUsd),
)

const quoteErrors = computed(() => errors.value.filter((e) => e.symbol !== '*').length)
const hardError = computed(() => errors.value.some((e) => e.symbol === '*'))

const hasQuotes = computed(() =>
  holdings.value.length > 0 && holdings.value.some((h) => getQuote(h.symbol)?.price !== undefined),
)

const displayCurrency = 'USD'

function openAdd() {
  editingHolding.value = null
  editorOpen.value = true
}

function openEdit(h: Holding) {
  editingHolding.value = h
  editorOpen.value = true
}

function confirmDelete() {
  if (deletingHolding.value) {
    usePortfolio().removeHolding(deletingHolding.value.id)
  }
  deletingHolding.value = null
}

function removeHolding(h: Holding) {
  deletingHolding.value = h
}

function refreshAll() {
  if (holdings.value.length) refresh(holdings.value.map((h) => h.symbol))
}

const intervalMs = computed(() =>
  Math.max(5_000, (preferences.value?.refreshInterval ?? 60) * 1000),
)

function shouldRun() {
  return holdings.value.length > 0 && online.value && !document.hidden
}

onMounted(() => {
  ensureRates()
  const { resume, pause } = useIntervalFn(() => {
    if (shouldRun()) refreshAll()
  }, intervalMs)

  const stopWatch = watch([holdings, online], () => {
    if (shouldRun()) resume()
    else pause()
  })

  const unwatchBackOnline = watch(justBackOnline, (v) => {
    if (v && holdings.value.length) refreshAll()
  })

  const onVis = () => {
    if (document.hidden) {
      pause()
      return
    }
    if (holdings.value.length && online.value) {
      const last = lastUpdated.value ? new Date(lastUpdated.value).getTime() : 0
      if (Date.now() - last > intervalMs.value * 2) refreshAll()
      resume()
    }
  }
  document.addEventListener('visibilitychange', onVis)

  if (shouldRun()) resume()
  if (holdings.value.length) refreshAll()

  onUnmounted(() => {
    stopWatch()
    unwatchBackOnline()
    document.removeEventListener('visibilitychange', onVis)
    pause()
  })
})
</script>

<template>
  <!-- Empty State if no holdings -->
  <div v-if="!holdings.length && !storageError" class="mt-4 px-4 sm:px-0">
    <EmptyState @add="openAdd" @load-demo="loadDemoPortfolio" />
  </div>

  <template v-else>
    <!-- Storage error banner -->
    <div v-if="storageError" class="mt-4 px-4 sm:px-0">
      <div class="rounded-3xl border border-border/70 bg-card p-5">
        <div class="flex items-start gap-3">
          <AlertCircle class="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p class="font-semibold text-sm">Failed to read local portfolio</p>
            <p class="mt-1 text-xs text-muted-foreground">
              Local data might be corrupt. Restore from a backup or reset to start fresh.
            </p>
          </div>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <UiButton variant="outline" size="sm" class="rounded-full text-xs" @click="exportPortfolio">
            <Download class="size-3.5 mr-1" aria-hidden="true" />
            Export Data
          </UiButton>
          <UiButton variant="destructive" size="sm" class="rounded-full text-xs" @click="resetPortfolio">
            <Trash2 class="size-3.5 mr-1" aria-hidden="true" />
            Reset Data
          </UiButton>
        </div>
      </div>
    </div>

    <div class="space-y-4 sm:space-y-5 px-4 sm:px-0">
      <!-- Demo Portfolio Banner -->
      <DemoPortfolioBanner
        v-if="isDemoPortfolio && !isDemoDismissed"
        @add="openAdd"
        @clear="clearDemoPortfolio"
        @dismiss="dismissDemoBanner"
      />

      <!-- Portfolio Summary Card -->
      <PortfolioSummary
        :summary="summary"
        :currency="displayCurrency"
        :has-quotes="hasQuotes"
        :quote-errors="quoteErrors"
      />

      <!-- Hard Error Warning -->
      <div
        v-if="hardError"
        class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-muted/40 p-3.5"
      >
        <div class="flex items-center gap-2.5">
          <AlertCircle class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div>
            <p class="text-xs font-semibold">Market quotes temporarily unavailable</p>
            <p class="text-[11px] text-muted-foreground">Showing last cached prices.</p>
          </div>
        </div>
        <UiButton variant="outline" size="sm" class="h-8 rounded-full text-xs" @click="refreshAll">
          <RefreshCw class="size-3 mr-1" aria-hidden="true" />
          Retry
        </UiButton>
      </div>

      <!-- Allocation Card -->
      <AllocationCard
        :holdings="holdings"
        :get-quote="getQuote"
        :selected-symbol="filteringSymbol"
        @select="(s: string | null) => (filteringSymbol = s)"
      />

      <!-- Holdings List -->
      <HoldingsTable
        :holdings="holdings"
        :get-quote="getQuote"
        :filtering="filteringSymbol"
        @edit="openEdit"
        @remove="removeHolding"
      />
    </div>

    <!-- Status footer -->
    <div class="mt-8 px-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-4 text-[11px] text-muted-foreground">
      <span v-if="lastUpdated">Updated {{ formatTimeAgo(lastUpdated) }}</span>
      <span v-if="!online">Offline · cached prices</span>
      <span>{{ hasQuotes ? 'Quotes via Yahoo Finance' : 'Refresh to see quotes' }}</span>
    </div>
  </template>

  <!-- Dialogs -->
  <HoldingEditorDialog
    :open="editorOpen"
    :holding="editingHolding"
    @saved="(h: Holding) => {
      const isNew = !editingHolding
      if (isNew) {
        const href = `/holding/${encodeURIComponent(h.symbol)}`
        useRouter().push(href)
      }
    }"
    @close="editorOpen = false"
  />

  <DeleteHoldingDialog
    :open="!!deletingHolding"
    :holding="deletingHolding"
    @confirm="confirmDelete"
    @close="deletingHolding = null"
  />
</template>
