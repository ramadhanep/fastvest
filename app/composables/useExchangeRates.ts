const rates = ref<Record<string, number>>({ USD: 1 })
const loaded = ref(false)

export function useExchangeRates() {
  async function ensureLoaded() {
    if (loaded.value) return
    try {
      const res = await $fetch<Record<string, number>>('/api/exchange-rates')
      rates.value = { USD: 1, ...res }
      loaded.value = true
    } catch {
      // keep defaults; retry on next mount
    }
  }

  function toUsd(value: number, currency: string): number {
    if (!currency || currency === 'USD') return value
    const rate = rates.value[currency]
    return rate ? value * rate : value
  }

  function fromUsd(value: number, target: string): number {
    if (!target || target === 'USD') return value
    const rate = rates.value[target]
    return rate ? value / rate : value
  }

  return { rates: readonly(rates), loaded: readonly(loaded), ensureLoaded, toUsd, fromUsd }
}
