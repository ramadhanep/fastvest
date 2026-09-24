<script setup lang="ts">
import { Search, Loader2, ChevronRight, Check } from '@lucide/vue'
import type { SearchResult } from '#shared/types'

const { isOpen, close } = useAddWatchlistModal()
const search = useSymbolSearch()
const { add, has } = useWatchlist()
const quotes = useQuotes()
const { t } = useI18n()

const query = computed(() => search.query.value)
const results = computed(() => search.results.value)
const searching = computed(() => search.searching.value)
const recent = computed(() => search.recent.value)

watch(isOpen, (open) => {
  if (open) search.onInput('')
})

function onPick(item: SearchResult) {
  if (has(item.symbol)) {
    close()
    return
  }
  add({ symbol: item.symbol, name: item.name })
  search.select(item)
  quotes.refresh([item.symbol])
  close()
}

function pickManual() {
  const sym = query.value.trim().toUpperCase()
  if (!sym) return
  onPick({ symbol: sym, name: sym, exchange: '', type: '' })
}
</script>

<template>
  <UiDialog :open="isOpen" @update:open="(v: boolean) => !v && close()">
    <UiDialogContent class="sm:max-w-md rounded-3xl p-5 sm:p-6 border border-border/80 bg-card shadow-2xl">
      <UiDialogHeader class="text-left">
        <UiDialogTitle class="text-base font-semibold tracking-tight">
          {{ t('watchlistAdd') }}
        </UiDialogTitle>
      </UiDialogHeader>

      <div class="relative mt-2">
        <Search
          class="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <UiInput
          :model-value="query"
          class="pl-9 h-10 rounded-xl bg-muted/40 border-border/70 text-xs focus-visible:ring-1"
          :placeholder="t('editorSearchPlaceholder')"
          autofocus
          @update:model-value="search.onInput(String($event))"
          @keydown.enter.prevent="pickManual"
        />
      </div>

      <div class="mt-3 max-h-80 overflow-y-auto no-scrollbar space-y-1.5" role="listbox" :aria-label="t('watchlistOptionsAria')">
        <div v-if="searching" class="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
          <Loader2 class="size-4 animate-spin" aria-hidden="true" />
          {{ t('editorSearching') }}
        </div>

        <template v-else-if="query.trim()">
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
            <span v-if="has(item.symbol)" class="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
              <Check class="size-3.5" aria-hidden="true" />
              {{ t('watchlistTracked') }}
            </span>
            <ChevronRight v-else class="size-4 text-muted-foreground shrink-0" aria-hidden="true" />
          </button>

          <button
            type="button"
            class="flex w-full items-center justify-between rounded-2xl border border-dashed border-border/80 p-3 text-xs text-muted-foreground hover:bg-muted/40 transition-colors cursor-pointer"
            @click="pickManual"
          >
            <span>{{ t('editorUse') }} <strong class="text-foreground">"{{ query.trim().toUpperCase() }}"</strong></span>
          </button>
        </template>

        <template v-else>
          <div v-if="recent.length" class="space-y-1">
            <p class="px-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{{ t('editorRecent') }}</p>
            <button
              v-for="item in recent"
              :key="item.symbol"
              type="button"
              role="option"
              class="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-muted/60 cursor-pointer"
              @click="onPick(item)"
            >
              <div class="flex items-center gap-2 min-w-0">
                <AssetIcon :symbol="item.symbol" size="sm" />
                <div class="min-w-0">
                  <span class="font-medium block">{{ item.symbol }}</span>
                  <span class="text-[11px] text-muted-foreground truncate block">{{ item.name }}</span>
                </div>
              </div>
            </button>
          </div>
          <p v-else class="px-1 py-10 text-center text-xs text-muted-foreground">
            Search for any symbol to start watching it.
          </p>
        </template>
      </div>
    </UiDialogContent>
  </UiDialog>
</template>