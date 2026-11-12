import { kv, storageRawGet, storageRawSet } from '~/lib/storage'

const rates = ref<Record<string, number>>({ USD: 1 })
const loaded = ref(false)
let pending: Promise<void> | null = null

// Last known rates survive reloads and offline launches; live rates replace them.
if (import.meta.client) {
  const cached = storageRawGet<Record<string, number>>(kv.fxRates)
  if (cached && typeof cached === 'object') rates.value = { ...cached, USD: 1 }
}

export function useExchangeRates() {
  function ensureLoaded(): Promise<void> {
    if (loaded.value) return Promise.resolve()
    // Every card calls this on mount — share one request.
    pending ??= $fetch<Record<string, number>>('/api/exchange-rates')
      .then((res) => {
        rates.value = { USD: 1, ...res }
        loaded.value = true
        storageRawSet(kv.fxRates, rates.value)
      })
      .catch(() => {
        // keep cached/defaults; retry on next mount
      })
      .finally(() => {
        pending = null
      })
    return pending
  }

  // Unknown rate counts as 0, never 1:1 — treating IDR as USD inflates totals ~16,000x.
  function toUsd(value: number, currency: string): number {
    if (!currency || currency === 'USD') return value
    const rate = rates.value[currency]
    return rate ? value * rate : 0
  }

  function fromUsd(value: number, target: string): number {
    if (!target || target === 'USD') return value
    const rate = rates.value[target]
    return rate ? value / rate : value
  }

  return { rates: readonly(rates), loaded: readonly(loaded), ensureLoaded, toUsd, fromUsd }
}
