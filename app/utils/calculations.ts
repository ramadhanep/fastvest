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
  // A percent move is per share — position size must not scale it.
  const dayChangePercent =
    quote?.changePercent !== undefined
      ? quote.changePercent
      : prevClose > 0
        ? (shareChange / prevClose) * 100
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

export type RiskLevel = 'conservative' | 'moderatelyConservative' | 'moderate' | 'aggressive' | 'veryAggressive'

export interface PortfolioRiskProfile {
  score: number
  level: RiskLevel
  equityPct: number
  cryptoPct: number
  cashPct: number
  largestHoldingPct: number
}

function riskWeight(symbol: string, isCash: boolean) {
  if (isCash) return 0
  if (/-(USD|USDT|USDC)$/.test(symbol) || /^(BTC|ETH|SOL|XRP|ADA|DOGE)/.test(symbol)) return 90
  if (/^(SPY|VOO|IVV|VTI|VT|BND|AGG|IEF|TLT|LQD)/.test(symbol)) return 45
  return 65
}

export function calculatePortfolioRiskProfile(
  holdings: readonly Holding[],
  getQuote: (symbol: string) => Quote | null | undefined,
  toUsd: (value: number, currency: string) => number = (value) => value,
): PortfolioRiskProfile {
  const positions = holdings.map((holding) => {
    const quote = getQuote(holding.symbol)
    const currency = quote?.currency ?? holding.currency ?? 'USD'
    const value = Math.max(0, toUsd(calculateHoldingMetrics(holding, quote).marketValue, currency))
    const isCash = !!holding.isCash || holding.symbol.startsWith('CASH-')
    return { value, isCash, symbol: holding.symbol, weight: riskWeight(holding.symbol, isCash) }
  }).filter((position) => position.value > 0)
  const total = positions.reduce((sum, position) => sum + position.value, 0)
  if (!total) return { score: 0, level: 'conservative', equityPct: 0, cryptoPct: 0, cashPct: 0, largestHoldingPct: 0 }

  const pct = (value: number) => (value / total) * 100
  const cashPct = pct(positions.filter((p) => p.isCash).reduce((sum, p) => sum + p.value, 0))
  const cryptoPct = pct(positions.filter((p) => !p.isCash && riskWeight(p.symbol, false) === 90).reduce((sum, p) => sum + p.value, 0))
  const equityPct = 100 - cashPct
  const largestHoldingPct = Math.max(...positions.map((p) => pct(p.value)))
  const weightedRisk = positions.reduce((sum, p) => sum + p.value * p.weight, 0) / total
  const concentrationPenalty = largestHoldingPct > 60 ? 20 : largestHoldingPct > 40 ? 10 : 0
  const cashAdjustment = cashPct > 20 ? 10 : 0
  const score = Math.round(Math.min(100, Math.max(0, weightedRisk + concentrationPenalty - cashAdjustment)))
  const level: RiskLevel = score < 25 ? 'conservative' : score < 50 ? 'moderatelyConservative' : score < 70 ? 'moderate' : score < 85 ? 'aggressive' : 'veryAggressive'
  return { score, level, equityPct, cryptoPct, cashPct, largestHoldingPct }
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
  // Return only counts positions with a value; an unpriced holding (quote still
  // loading or failed) would otherwise read as a 100% loss.
  const priced = metrics.filter((m) => m.marketValue > 0)
  const pricedCost = priced.reduce((s, m) => s + m.costBasis, 0)
  const totalPnl = priced.reduce((s, m) => s + m.pnl, 0)
  const totalDayChange = metrics.reduce((s, m) => s + m.dayChange, 0)
  const totalPnlPercent = pricedCost > 0 ? (totalPnl / pricedCost) * 100 : undefined
  // Today's move relative to yesterday's value, not today's.
  const previousValue = totalValue - totalDayChange
  const totalDayChangePercent = previousValue > 0 ? (totalDayChange / previousValue) * 100 : 0
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



/**
 * Buying more of a symbol you already hold: quantities add, cost becomes the
 * quantity-weighted average (what a broker shows). Cash simply adds up.
 */
export function mergePosition(
  existing: Pick<Holding, 'quantity' | 'averageCost'>,
  added: Pick<Holding, 'quantity' | 'averageCost'>,
): { quantity: number; averageCost: number } {
  const quantity = existing.quantity + added.quantity
  const averageCost =
    quantity > 0
      ? (existing.quantity * existing.averageCost + added.quantity * added.averageCost) / quantity
      : existing.averageCost
  return { quantity, averageCost }
}

/**
 * Collapse rows that share a symbol (saved before adds were merged, or from an
 * imported file) into one position. Keeps the first row's id, the earliest
 * createdAt, and the first non-empty notes.
 */
export function mergeDuplicateHoldings<T extends Holding>(holdings: readonly T[]): T[] {
  const bySymbol = new Map<string, T>()
  for (const h of holdings) {
    const prev = bySymbol.get(h.symbol)
    if (!prev) {
      bySymbol.set(h.symbol, h)
      continue
    }
    bySymbol.set(h.symbol, {
      ...prev,
      ...mergePosition(prev, h),
      notes: prev.notes || h.notes,
      createdAt: [prev.createdAt, h.createdAt].filter(Boolean).sort()[0],
    })
  }
  return [...bySymbol.values()]
}

/**
 * Units left after selling `sold` of `held`. Rounded to 8 decimals so 0.3 − 0.1
 * leaves 0.2 (not 0.19999999999999998); 0 means the position is closed.
 */
export function remainingAfterSell(held: number, sold: number): number {
  return Math.max(0, Math.round((held - sold) * 1e8) / 1e8)
}
