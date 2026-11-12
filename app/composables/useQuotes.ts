import type { Quote, QuoteError } from '#shared/types'
import { kv, storageRawGet, storageRawSet, storageRemove } from '~/lib/storage'

interface QuoteCache {
  quotes: Record<string, Quote>
  updatedAt: string
}

const quotes = ref<Record<string, Quote>>({})
const errors = ref<QuoteError[]>([])
const fetching = ref(false)
const lastUpdated = ref<string | null>(null)
const cacheLoaded = ref(false)
const refreshing = ref(false)
let activeRequest: Promise<void> | null = null
let activeSymbols = new Set<string>()

export function useQuotes() {
  function loadCache() {
    if (cacheLoaded.value) return
    const cached = storageRawGet<QuoteCache>(kv.quoteCache)
    if (cached?.quotes && typeof cached.quotes === 'object') {
      quotes.value = cached.quotes
      lastUpdated.value = cached.updatedAt ?? null
    }
    cacheLoaded.value = true
  }

  function persistCache() {
    storageRawSet(kv.quoteCache, {
      quotes: quotes.value,
      updatedAt: lastUpdated.value ?? new Date().toISOString(),
    })
  }

  function getQuote(symbol: string): Quote | null {
    return quotes.value[symbol] ?? null
  }

  async function refresh(symbols: string[]): Promise<void> {
    let pending = [...new Set(symbols.filter(Boolean))].sort()
    // A request already in flight may not cover these symbols (e.g. the watchlist
    // asking while the portfolio refresh runs) — wait for it, then fetch the rest.
    while (activeRequest) {
      const covered = activeSymbols
      pending = pending.filter((s) => !covered.has(s))
      if (pending.length === 0) return activeRequest
      await activeRequest
    }
    if (pending.length === 0) return

    activeSymbols = new Set(pending)
    activeRequest = doRefresh(pending)
    try {
      await activeRequest
    } finally {
      activeRequest = null
      activeSymbols = new Set()
    }
  }

  async function doRefresh(unique: string[]): Promise<void> {
    refreshing.value = true
    fetching.value = true
    try {
      const res = await $fetch<{ data: Quote[]; errors: QuoteError[] }>('/api/quotes', {
        query: { symbols: unique.join(',') },
      })
      // The network is back — drop the global "unavailable" error.
      errors.value = errors.value.filter((e) => e.symbol !== '*')
      const map: Record<string, Quote> = { ...quotes.value }
      for (const q of res.data) {
        map[q.symbol] = q
        const idx = errors.value.findIndex((e) => e.symbol === q.symbol)
        if (idx !== -1) errors.value.splice(idx, 1)
      }
      quotes.value = map
      for (const err of res.errors) {
        if (!errors.value.some((e) => e.symbol === err.symbol)) {
          errors.value.push(err)
        }
      }
      lastUpdated.value = new Date().toISOString()
      persistCache()
    } catch {
      errors.value = [{ symbol: '*', code: 'MARKET_DATA_UNAVAILABLE', message: 'Market data is temporarily unavailable.' }]
    } finally {
      refreshing.value = false
      fetching.value = false
    }
  }

  function clearCache() {
    storageRemove(kv.quoteCache)
    quotes.value = {}
    lastUpdated.value = null
  }

  if (import.meta.client) onMounted(loadCache)

  return {
    quotes: readonly(quotes),
    errors: readonly(errors),
    fetching: readonly(fetching),
    refreshing: readonly(refreshing),
    lastUpdated: readonly(lastUpdated),
    cacheLoaded: readonly(cacheLoaded),
    getQuote,
    refresh,
    clearCache,
  }
}