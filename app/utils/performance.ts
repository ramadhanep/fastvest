import type { ChartPoint } from '#shared/types'

const dayKey = (tsSeconds: number) => new Date(tsSeconds * 1000).toISOString().slice(0, 10)

export interface HistorySeriesInput {
  symbol: string
  points: ChartPoint[]
  startAt: string
  quantity: number
  currency: string
  isCash?: boolean
}

/**
 * Reconstructs a portfolio value-over-time series from per-symbol price
 * histories. Each non-cash holding contributes `price × quantity` from the
 * day it was created onward; cash holdings contribute a constant amount.
 * Values are converted to USD at latest exchange rates.
 */
export function buildPortfolioHistory(
  inputs: HistorySeriesInput[],
  toUsd: (value: number, currency: string) => number,
): ChartPoint[] {
  const cashConst = inputs
    .filter((s) => s.isCash)
    .reduce((sum, s) => sum + toUsd(s.quantity, s.currency), 0)

  const marketDays = new Set<string>()
  const byDay = new Map<string, number>()

  for (const s of inputs) {
    if (s.isCash) continue
    const startKey = dayKey(new Date(s.startAt).getTime() / 1000)
    for (const p of s.points) {
      const day = dayKey(p.timestamp)
      if (day < startKey) continue
      byDay.set(day, (byDay.get(day) ?? 0) + toUsd(p.close * s.quantity, s.currency))
      marketDays.add(day)
    }
  }

  const days = [...marketDays].sort()
  if (!days.length) return []

  return days.map((day) => ({
    timestamp: Math.floor(new Date(`${day}T00:00:00Z`).getTime() / 1000),
    close: (byDay.get(day) ?? 0) + cashConst,
  }))
}