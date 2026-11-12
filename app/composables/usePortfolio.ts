import { portfolioFileSchema, holdingSchema } from '#shared/schemas/holding'
import type { Holding, PortfolioFile } from '#shared/types'
import { kv, storageGet, storageSet, storageRemove } from '~/lib/storage'
import { BackupError, decodeBackup, encodeBackup, isBackupCode } from '~/lib/backup'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import { useWatchlist } from './useWatchlist'
import { mergePosition } from '~/utils/calculations'

export type ImportErrorCode = 'encrypted' | 'format' | 'read' | 'weakPass' | 'wrongPass' | 'corrupt'

export interface ImportResult {
  ok: boolean
  code?: ImportErrorCode
  /** Raw container text when the caller must ask for a passphrase. */
  backupCode?: string
}

const { t } = useI18n()

export const DEFAULT_DEMO_HOLDINGS: Holding[] = [
  {
    id: 'demo-aapl',
    symbol: 'AAPL',
    quantity: 10,
    averageCost: 185.5,
    currency: 'USD',
    notes: 'Core tech position · Apple Inc.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'demo-nvda',
    symbol: 'NVDA',
    quantity: 15,
    averageCost: 118.2,
    currency: 'USD',
    notes: 'AI computing infrastructure · NVIDIA',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'demo-spy',
    symbol: 'SPY',
    quantity: 5,
    averageCost: 512.0,
    currency: 'USD',
    notes: 'S&P 500 Index ETF',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'demo-btc',
    symbol: 'BTC-USD',
    quantity: 0.25,
    averageCost: 63500.0,
    currency: 'USD',
    notes: 'Digital asset reserve · Bitcoin',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'demo-bbca',
    symbol: 'BBCA.JK',
    quantity: 1000,
    averageCost: 9850,
    currency: 'IDR',
    notes: 'Bank Central Asia · IDX equity',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'demo-cash-bca',
    symbol: 'CASH-BCA-IDR',
    name: 'BCA Tabungan',
    quantity: 25000000,
    averageCost: 1,
    currency: 'IDR',
    notes: 'Cash reserve',
    isCash: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
]

// Older files may lack createdAt. The id is only usable when it is itself a date;
// a UUID there became "Invalid Date", which Intl.DateTimeFormat throws on.
function createdAtOf(h: { id: string; createdAt?: string }): string {
  if (h.createdAt) return h.createdAt
  return Number.isFinite(Date.parse(h.id)) ? new Date(h.id).toISOString() : new Date().toISOString()
}

// randomUUID only exists in secure contexts; a phone hitting the dev server over
// plain http on the LAN doesn't have it.
function newId(): string {
  return crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

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
          createdAt: createdAtOf(h),
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
    // A second buy of a held symbol tops up that position instead of creating a
    // duplicate row the detail page can't show.
    const existing = holdings.value.find((h) => h.symbol === input.symbol)
    if (existing) {
      const merged: Holding = {
        ...existing,
        // A real purchase on top of a demo row makes it the user's own — drop the
        // demo- id so the demo detector and "clear demo" leave it alone.
        id: existing.id.startsWith('demo-') ? newId() : existing.id,
        ...mergePosition(existing, input),
        notes: existing.notes ?? input.notes,
      }
      holdings.value = holdings.value.map((h) => (h.id === existing.id ? merged : h))
      isDemoPortfolio.value = false
      persist()
      return merged
    }
    const holding = {
      ...input,
      id: newId(),
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
      useWatchlist().resetDemoWatchlist()
    }
    persist()
  }

  function clearDemoPortfolio() {
    holdings.value = []
    isDemoPortfolio.value = false
    if (typeof localStorage !== 'undefined') localStorage.setItem(DEMO_CLEARED_KEY, 'true')
    useWatchlist().resetDemoWatchlist()
    persist()
    toast.info(t('toastSampleCleared'))
  }

  function loadDemoPortfolio() {
    holdings.value = structuredClone(DEFAULT_DEMO_HOLDINGS)
    isDemoPortfolio.value = true
    isDemoDismissed.value = false
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(DEMO_CLEARED_KEY)
      localStorage.removeItem(DEMO_DISMISSED_KEY)
    }
    useWatchlist().loadDemoWatchlist()
    persist()
    toast.success(t('toastSampleLoaded'))
  }

  function dismissDemoBanner() {
    isDemoDismissed.value = true
    if (typeof localStorage !== 'undefined') localStorage.setItem(DEMO_DISMISSED_KEY, 'true')
  }

  function buildPayload(): PortfolioFile {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      holdings: holdings.value,
    }
  }

  function applyHoldings(next: z.infer<typeof holdingSchema>[]) {
    holdings.value = structuredClone(next).map((h) => ({
      ...h,
      createdAt: createdAtOf(h),
    }))
    isDemoPortfolio.value = false
    if (typeof localStorage !== 'undefined') localStorage.setItem(DEMO_CLEARED_KEY, 'true')
    useWatchlist().resetDemoWatchlist()
    persist()
  }

  function download(content: string, filename: string, type: string) {
    const url = URL.createObjectURL(new Blob([content], { type }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  function exportPortfolio() {
    download(JSON.stringify(buildPayload(), null, 2), 'fastvest-portfolio.json', 'application/json')
  }

  function saveBackupFile(code: string) {
    download(code, 'fastvest-backup.fvenc', 'text/plain')
  }

  function buildBackupCode(passphrase: string): Promise<string> {
    return encodeBackup(buildPayload(), passphrase)
  }

  async function applyBackupCode(code: string, passphrase: string): Promise<ImportResult> {
    let raw: unknown
    try {
      raw = await decodeBackup(code, passphrase)
    } catch (e) {
      return { ok: false, code: e instanceof BackupError ? e.code : 'corrupt' }
    }
    const parsed = portfolioFileSchema.safeParse(raw)
    if (!parsed.success) return { ok: false, code: 'format' }
    applyHoldings(parsed.data.holdings)
    return { ok: true }
  }

  async function importPortfolio(file: File): Promise<ImportResult> {
    let text: string
    try {
      text = await file.text()
    } catch {
      return { ok: false, code: 'read' }
    }
    if (isBackupCode(text)) return { ok: false, code: 'encrypted', backupCode: text }
    try {
      const parsed = portfolioFileSchema.safeParse(JSON.parse(text))
      if (!parsed.success) return { ok: false, code: 'format' }
      applyHoldings(parsed.data.holdings)
      return { ok: true }
    } catch {
      return { ok: false, code: 'format' }
    }
  }

  function resetPortfolio() {
    holdings.value = []
    isDemoPortfolio.value = false
    if (typeof localStorage !== 'undefined') localStorage.setItem(DEMO_CLEARED_KEY, 'true')
    useWatchlist().resetDemoWatchlist()
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
    saveBackupFile,
    buildBackupCode,
    applyBackupCode,
    importPortfolio,
    resetPortfolio,
    clearDemoPortfolio,
    loadDemoPortfolio,
    dismissDemoBanner,
  }
}


