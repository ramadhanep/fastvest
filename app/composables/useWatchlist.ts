import { kv, storageRawGet, storageRawSet, storageRemove } from '~/lib/storage'

export interface WatchItem {
  symbol: string
  name?: string
}

export const DEFAULT_DEMO_WATCHLIST: WatchItem[] = [
  { symbol: 'TSLA', name: 'Tesla, Inc.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'ETH-USD', name: 'Ethereum USD' },
]

const DEMO_CLEARED_KEY = 'fastvest:demo_cleared'

const items = ref<WatchItem[]>([])

export function useWatchlist() {
  function load() {
    const stored = storageRawGet<WatchItem[]>(kv.watchlist)
    if (Array.isArray(stored)) {
      items.value = stored.filter((w) => w && typeof w.symbol === 'string')
      return
    }
    if (typeof localStorage !== 'undefined' && localStorage.getItem(DEMO_CLEARED_KEY) !== 'true') {
      items.value = structuredClone(DEFAULT_DEMO_WATCHLIST)
      persist()
    }
  }

  function persist() {
    storageRawSet(kv.watchlist, items.value)
  }

  function has(symbol: string): boolean {
    return items.value.some((w) => w.symbol === symbol)
  }

  function add(item: WatchItem) {
    if (has(item.symbol)) return
    items.value = [...items.value, item]
    persist()
  }

  function remove(symbol: string) {
    items.value = items.value.filter((w) => w.symbol !== symbol)
    persist()
  }

  function resetDemoWatchlist() {
    items.value = []
    storageRemove(kv.watchlist)
  }

  function loadDemoWatchlist() {
    items.value = structuredClone(DEFAULT_DEMO_WATCHLIST)
    persist()
  }

  if (import.meta.client) load()

  return {
    items: readonly(items),
    has,
    add,
    remove,
    resetDemoWatchlist,
    loadDemoWatchlist,
  }
}