import type { Holding, HoldingMetrics, PortfolioSummary, Quote } from '#shared/types'

const DAY_MS = 24 * 60 * 60 * 1000

export function calculateHoldingMetrics(holding: Holding, quote: Quote | null | undefined): HoldingMetrics {
  // If explicitly marked as cash or symbol starts with "CASH-"
  if (holding.isCash || holding.symbol.startsWith('CASH-')) {
    const marketValue = holding.quantity // quantity represents cash amount
    const costBasis = holding.quantity
    return {
      marketValue,
      costBasis,
      pnl: 0,
      pnlPercent: 0,
      dayChange: 0,
      dayChangePercent: 0,
    }
  }

  const price = quote?.price ?? 0
  const marketValue = holding.quantity * price
  const costBasis = holding.quantity * holding.averageCost
  const pnl = marketValue - costBasis
  const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : undefined
  const prevClose = quote?.previousClose ?? quote?.price ?? 0
  const shareChange = quote?.change ?? (price > 0 && prevClose > 0 ? price - prevClose : 0)
  const dayChange = price === 0 ? 0 : holding.quantity * shareChange
  const dayChangePercent =
    quote?.changePercent !== undefined
      ? holding.quantity * quote.changePercent
      : prevClose > 0
        ? (dayChange / prevClose) * 100
        : 0
  return {
    marketValue,
    costBasis,
    pnl,
    pnlPercent,
    dayChange,
    dayChangePercent,
  }
}

export interface AllocationSlice {
  label: string
  value: number
  isCash: boolean
}

/**
 * Orders donut slices so no two groups interleave: all cash-like slices (including
 * digital assets flagged isCash) stay in one contiguous block at the end, and slices
 * sharing a symbol stay adjacent even when the portfolio lists that symbol twice.
 * Within a block, groups are ordered by combined value desc.
 */
export function orderAllocationSlices<T extends AllocationSlice>(slices: readonly T[]): T[] {
  const keyOf = (s: AllocationSlice) => `${s.isCash ? 1 : 0} ${s.label}`
  const totals = new Map<string, number>()
  for (const s of slices) {
    const k = keyOf(s)
    totals.set(k, (totals.get(k) ?? 0) + s.value)
  }
  return slices
    .map((slice, index) => ({ slice, index }))
    .sort((a, b) => {
      const ka = keyOf(a.slice)
      const kb = keyOf(b.slice)
      if (ka !== kb) {
        const cashA = a.slice.isCash ? 1 : 0
        const cashB = b.slice.isCash ? 1 : 0
        if (cashA !== cashB) return cashA - cashB
        return (totals.get(kb) ?? 0) - (totals.get(ka) ?? 0)
      }
      return a.index - b.index
    })
    .map((x) => x.slice)
}

export function calculatePortfolioSummary(
  holdings: readonly Holding[],
  quotesBySymbol: (symbol: string) => Quote | null | undefined,
  toUsd?: (value: number, currency: string) => number,
): PortfolioSummary {
  const metrics = holdings.map((h, i) => {
    const m = calculateHoldingMetrics(h, quotesBySymbol(h.symbol))
    const q = quotesBySymbol(h.symbol)
    const cur = q?.currency ?? h.currency ?? 'USD'
    const convert = toUsd ?? ((v: number) => v)
    return {
      ...m,
      marketValue: convert(m.marketValue, cur),
      costBasis: convert(m.costBasis, cur),
      pnl: convert(m.pnl, cur),
      dayChange: convert(m.dayChange, cur),
    }
  })
  const totalValue = metrics.reduce((s, m) => s + m.marketValue, 0)
  const totalCostBasis = metrics.reduce((s, m) => s + m.costBasis, 0)
  const totalPnl = totalValue - totalCostBasis
  const totalDayChange = metrics.reduce((s, m) => s + m.dayChange, 0)
  const totalPnlPercent = totalCostBasis > 0 ? (totalPnl / totalCostBasis) * 100 : undefined
  const totalDayChangePercent = totalValue > 0 ? (totalDayChange / totalValue) * 100 : 0
  return {
    totalValue,
    totalCostBasis,
    totalPnl,
    totalPnlPercent,
    totalDayChange,
    totalDayChangePercent,
    holdingsCount: holdings.length,
  }
}


