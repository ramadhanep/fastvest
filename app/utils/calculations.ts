import type { Holding, HoldingMetrics, PortfolioSummary, Quote } from '#shared/types'

const DAY_MS = 24 * 60 * 60 * 1000

export function calculateHoldingMetrics(holding: Holding, quote: Quote | null | undefined): HoldingMetrics {
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

export function calculatePortfolioSummary(
  holdings: readonly Holding[],
  quotesBySymbol: (symbol: string) => Quote | null | undefined,
): PortfolioSummary {
  const metrics = holdings.map((h) => calculateHoldingMetrics(h, quotesBySymbol(h.symbol)))
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

export function formatTtlAge(date: string | number | Date): string {
  const ttl = Date.now() - new Date(date).getTime()
  if (ttl <= DAY_MS) return `${Math.max(1, Math.round(ttl / 60000))}m`
  const days = Math.floor(ttl / DAY_MS)
  return `${days}d`
}
