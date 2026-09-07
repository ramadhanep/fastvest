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
    const unique = [...new Set(symbols.filter(Boolean))].sort()
    if (unique.length === 0) return

    if (activeRequest) return activeRequest

    activeRequest = doRefresh(unique)
    try {
      await activeRequest
    } finally {
      activeRequest = null
    }
  }

  async function doRefresh(unique: string[]): Promise<void> {
    refreshing.value = true
    fetching.value = true
    try {
      const res = await $fetch<{ data: Quote[]; errors: QuoteError[] }>('/api/quotes', {
        query: { symbols: unique.join(',') },
      })
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