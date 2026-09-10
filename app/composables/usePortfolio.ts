import { portfolioFileSchema, holdingSchema } from '#shared/schemas/holding'
import type { Holding, PortfolioFile } from '#shared/types'
import { kv, storageGet, storageSet, storageRemove } from '~/lib/storage'
import { toast } from 'vue-sonner'
import { z } from 'zod'

export const DEFAULT_DEMO_HOLDINGS: Holding[] = [
  {
    id: 'demo-aapl',
    symbol: 'AAPL',
    quantity: 10,
    averageCost: 185.5,
    currency: 'USD',
    notes: 'Core tech position · Apple Inc.',
    createdAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'demo-nvda',
    symbol: 'NVDA',
    quantity: 15,
    averageCost: 118.2,
    currency: 'USD',
    notes: 'AI computing infrastructure · NVIDIA',
    createdAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'demo-spy',
    symbol: 'SPY',
    quantity: 5,
    averageCost: 512.0,
    currency: 'USD',
    notes: 'S&P 500 Index ETF',
    createdAt: '2026-02-10T00:00:00.000Z',
  },
  {
    id: 'demo-btc',
    symbol: 'BTC-USD',
    quantity: 0.25,
    averageCost: 63500.0,
    currency: 'USD',
    notes: 'Digital asset reserve · Bitcoin',
    createdAt: '2026-02-15T00:00:00.000Z',
  },
  {
    id: 'demo-bbca',
    symbol: 'BBCA.JK',
    quantity: 1000,
    averageCost: 9850,
    currency: 'IDR',
    notes: 'Bank Central Asia · IDX equity',
    createdAt: '2026-02-20T00:00:00.000Z',
  },
]

const DEMO_CLEARED_KEY = 'fastvest:demo_cleared'
const DEMO_DISMISSED_KEY = 'fastvest:demo_dismissed'

const holdings = ref<Holding[]>([])
const storageError = ref(false)
const loaded = ref(false)
const isDemoPortfolio = ref(false)
const isDemoDismissed = ref(false)

export function usePortfolio() {
  function persist() {
    storageSet(kv.portfolio, { holdings: holdings.value })
  }

  function load() {
    if (loaded.value) return
    if (typeof localStorage !== 'undefined') {
      if (localStorage.getItem(DEMO_DISMISSED_KEY) === 'true') {
        isDemoDismissed.value = true
      }
    }

    const raw = storageGet<{ holdings: Holding[] }>(kv.portfolio)
    if (raw && raw.holdings) {
      const parsed = z.array(holdingSchema).safeParse(raw.holdings)
      if (parsed.success) {
        holdings.value = parsed.data.map((h) => ({
          ...h,
          createdAt: h.createdAt ?? h.id,
        }))
        const isDemoIds = holdings.value.length === DEFAULT_DEMO_HOLDINGS.length &&
          holdings.value.every((h) => h.id.startsWith('demo-'))
        isDemoPortfolio.value = isDemoIds
      } else {
        storageError.value = true
      }
    } else {
      // First time launch: check if demo was cleared previously
      const demoCleared = typeof localStorage !== 'undefined' && localStorage.getItem(DEMO_CLEARED_KEY) === 'true'
      if (demoCleared) {
        holdings.value = []
        isDemoPortfolio.value = false
      } else {
        holdings.value = structuredClone(DEFAULT_DEMO_HOLDINGS)
        isDemoPortfolio.value = true
        persist()
      }
    }
    loaded.value = true
  }

  function addHolding(input: Omit<Holding, 'id' | 'createdAt'>): Holding {
    const holding = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }
    holdings.value = [holding, ...holdings.value]
    isDemoPortfolio.value = false
    persist()
    return holding
  }

  function updateHolding(id: string, patch: Partial<Holding>) {
    holdings.value = holdings.value.map((h) => (h.id === id ? { ...h, ...patch, id } : h))
    persist()
  }

  function removeHolding(id: string) {
    holdings.value = holdings.value.filter((h) => h.id !== id)
    if (holdings.value.length === 0) {
      isDemoPortfolio.value = false
      if (typeof localStorage !== 'undefined') localStorage.setItem(DEMO_CLEARED_KEY, 'true')
    }
    persist()
  }

  function clearDemoPortfolio() {
    holdings.value = []
    isDemoPortfolio.value = false
    if (typeof localStorage !== 'undefined') localStorage.setItem(DEMO_CLEARED_KEY, 'true')
    persist()
    toast.info('Sample portfolio cleared. Starting with empty portfolio.')
  }

  function loadDemoPortfolio() {
    holdings.value = structuredClone(DEFAULT_DEMO_HOLDINGS)
    isDemoPortfolio.value = true
    isDemoDismissed.value = false
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(DEMO_CLEARED_KEY)
      localStorage.removeItem(DEMO_DISMISSED_KEY)
    }
    persist()
    toast.success('Sample portfolio loaded.')
  }

  function dismissDemoBanner() {
    isDemoDismissed.value = true
    if (typeof localStorage !== 'undefined') localStorage.setItem(DEMO_DISMISSED_KEY, 'true')
  }

  function exportPortfolio() {
    const payload: PortfolioFile = {
      version: 1,
      exportedAt: new Date().toISOString(),
      holdings: holdings.value,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'fastvest-portfolio.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function importPortfolio(file: File): Promise<{ ok: boolean; message?: string }> {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const raw = JSON.parse(String(reader.result))
          const parsed = portfolioFileSchema.safeParse(raw)
          if (!parsed.success) {
            resolve({ ok: false, message: 'That file is not a valid Fastvest portfolio.' })
            return
          }
          holdings.value = structuredClone(parsed.data.holdings).map((h) => ({
            ...h,
            createdAt: h.createdAt ?? h.id,
          }))
          isDemoPortfolio.value = false
          if (typeof localStorage !== 'undefined') localStorage.setItem(DEMO_CLEARED_KEY, 'true')
          persist()
          resolve({ ok: true })
        } catch {
          resolve({ ok: false, message: 'That file could not be read as JSON.' })
        }
      }
      reader.onerror = () => resolve({ ok: false, message: 'That file could not be read.' })
      reader.readAsText(file)
    })
  }

  function resetPortfolio() {
    holdings.value = []
    isDemoPortfolio.value = false
    if (typeof localStorage !== 'undefined') localStorage.setItem(DEMO_CLEARED_KEY, 'true')
    storageRemove(kv.portfolio)
  }

  if (import.meta.client) onMounted(load)

  return {
    holdings: readonly(holdings),
    storageError: readonly(storageError),
    loaded: readonly(loaded),
    isDemoPortfolio: readonly(isDemoPortfolio),
    isDemoDismissed: readonly(isDemoDismissed),
    addHolding,
    updateHolding,
    removeHolding,
    exportPortfolio,
    importPortfolio,
    resetPortfolio,
    clearDemoPortfolio,
    loadDemoPortfolio,
    dismissDemoBanner,
  }
}


