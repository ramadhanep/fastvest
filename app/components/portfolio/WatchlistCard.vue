<script setup lang="ts">
import { X } from '@lucide/vue'
import { formatCurrency, formatPercent } from '~/utils/format'

const router = useRouter()
const { items, remove } = useWatchlist()
const quotes = useQuotes()

function refreshMissing() {
  const missing = items.value.map((w) => w.symbol).filter((s) => !quotes.getQuote(s))
  if (missing.length) quotes.refresh(missing)
}

onMounted(refreshMissing)

watch(items, refreshMissing)

function goto(symbol: string) {
  void router.push(`/holding/${encodeURIComponent(symbol)}`)
}
</script>

<template>
  <section v-if="items.length" class="mt-4" aria-labelledby="watchlist-heading">
    <h2 id="watchlist-heading" class="text-sm font-semibold tracking-tight">Watchlist</h2>

    <div class="mt-3 -mx-4 sm:mx-0 rounded-none sm:rounded-2xl bg-card divide-y divide-border/30 overflow-hidden">
      <div
        v-for="w in items"
        :key="w.symbol"
        class="relative flex items-center justify-between gap-3 px-4 py-3.5 bg-card transition-colors cursor-pointer hover:bg-muted/40"
        @click="goto(w.symbol)"
      >
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <AssetIcon :symbol="w.symbol" size="md" />
          <div class="min-w-0">
            <p class="text-sm font-semibold text-foreground truncate leading-tight">{{ w.symbol }}</p>
            <p class="truncate text-[11px] text-muted-foreground mt-0.5 leading-tight">
              {{ w.name ?? quotes.getQuote(w.symbol)?.name ?? '—' }}
            </p>
          </div>
        </div>

        <div v-if="quotes.getQuote(w.symbol)?.price !== undefined" class="text-right shrink-0">
          <p class="text-sm font-semibold tabular-nums text-foreground">
            {{ formatCurrency(quotes.getQuote(w.symbol)?.price, quotes.getQuote(w.symbol)?.currency ?? 'USD') }}
          </p>
          <p
            v-if="quotes.getQuote(w.symbol)?.changePercent !== undefined"
            class="text-[11px] font-medium tabular-nums mt-0.5"
            :class="(quotes.getQuote(w.symbol)?.changePercent ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'"
          >
            {{ (quotes.getQuote(w.symbol)?.changePercent ?? 0) >= 0 ? '+' : '' }}{{ formatPercent(quotes.getQuote(w.symbol)?.changePercent) }}
          </p>
        </div>

        <button
          type="button"
          class="size-8 shrink-0 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          aria-label="Remove from watchlist"
          @click.stop="remove(w.symbol)"
        >
          <X class="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  </section>
</template>