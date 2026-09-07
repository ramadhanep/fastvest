import { ref, toRaw } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import type { SearchResult } from '#shared/types'
import { kv, storageRawGet, storageRawSet } from '~/lib/storage'

const MAX_RECENT = 8

export function useSymbolSearch() {
  const query = ref('')
  const results = ref<SearchResult[]>([])
  const searching = ref(false)
  const opened = ref(false)
  const recent = ref<SearchResult[]>([])

  function loadRecent() {
    const stored = storageRawGet<SearchResult[]>(kv.recentSearches)
    if (Array.isArray(stored)) recent.value = stored
  }
  loadRecent()

  function addRecent(r: SearchResult) {
    recent.value = [r, ...recent.value.filter((x) => x.symbol !== r.symbol)].slice(0, MAX_RECENT)
    storageRawSet(kv.recentSearches, toRaw(recent.value))
  }

  const debounced = useDebounceFn(async (q: string) => {
    if (!q.trim()) {
      results.value = []
      searching.value = false
      return
    }
    searching.value = true
    try {
      const res = await $fetch<{ results: SearchResult[] }>('/api/search', { query: { q: q.trim() } })
      results.value = res.results
    } catch {
      results.value = []
    } finally {
      searching.value = false
    }
  }, 250)

  function onInput(value: string) {
    query.value = value
    debounced(value)
  }

  function open() { opened.value = true }
  function close() { opened.value = false }

  function select(item: SearchResult) {
    addRecent(item)
    opened.value = false
    query.value = ''
    results.value = []
  }

  function clearRecent() {
    recent.value = []
    storageRawSet(kv.recentSearches, [])
  }

  return {
    query,
    results,
    searching,
    opened,
    recent,
    onInput,
    open,
    close,
    select,
    clearRecent,
  }
}
