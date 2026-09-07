import { describe, it, expect } from 'vitest'
import {
  calculateHoldingMetrics,
  calculatePortfolioSummary,
} from '~/utils/calculations'
import type { Holding, Quote } from '#shared/types'

const holding: Holding = {
  id: '1',
  symbol: 'AAPL',
  quantity: 10,
  averageCost: 100,
  currency: 'USD',
  createdAt: '2026-01-01T00:00:00.000Z',
}

const quote: Quote = {
  symbol: 'AAPL',
  price: 150,
  previousClose: 145,
  change: 5,
  changePercent: 3.448,
  currency: 'USD',
}

describe('calculateHoldingMetrics', () => {
  it('computes market value, cost basis and P&L', () => {
    const m = calculateHoldingMetrics(holding, quote)
    expect(m.marketValue).toBe(1500)
    expect(m.costBasis).toBe(1000)
    expect(m.pnl).toBe(500)
    expect(m.pnlPercent).toBe(50)
  })

  it('reports undefined pnlPercent when cost basis is zero', () => {
    const zeroCost = { ...holding, averageCost: 0 }
    const m = calculateHoldingMetrics(zeroCost, quote)
    expect(m.pnlPercent).toBeUndefined()
    expect(m.marketValue).toBe(1500)
    expect(m.costBasis).toBe(0)
  })

  it('handles missing quote with price zero', () => {
    const m = calculateHoldingMetrics(holding, null)
    expect(m.marketValue).toBe(0)
    expect(m.pnl).toBe(-1000)
    expect(m.dayChange).toBe(0)
  })

  it('handles negative and zero quantities without NaN', () => {
    expect(calculateHoldingMetrics({ ...holding, quantity: 0 }, quote).marketValue).toBe(0)
    expect(calculateHoldingMetrics({ ...holding, quantity: -2 }, quote).pnl).toBeLessThan(0)
  })

  it('derives daily change from price and previous close when change is absent', () => {
    const q: Quote = { symbol: 'AAPL', price: 150, previousClose: 140 }
    const m = calculateHoldingMetrics(holding, q)
    expect(m.dayChange).toBe(100)
  })

  it('computes day change percent from previous close', () => {
    const m = calculateHoldingMetrics(holding, quote)
    expect(m.dayChange).toBe(50)
    expect(m.dayChangePercent).toBeCloseTo(34.4827, 2)
  })
})

describe('calculatePortfolioSummary', () => {
  it('aggregates holdings', () => {
    const holdings = [
      { ...holding, symbol: 'AAPL' },
      { ...holding, id: '2', symbol: 'NVDA', quantity: 1, averageCost: 500 },
    ]
    const quotes: Record<string, Quote> = {
      AAPL: { ...quote },
      NVDA: { symbol: 'NVDA', price: 1000, previousClose: 1000 },
    }
    const s = calculatePortfolioSummary(holdings, (sym) => quotes[sym] ?? null)
    // AAPL mv 1500, cost 1000; NVDA mv 1000, cost 500
    expect(s.totalValue).toBe(2500)
    expect(s.totalCostBasis).toBe(1500)
    expect(s.totalPnl).toBe(1000)
    expect(s.totalPnlPercent).toBeCloseTo(66.666, 1)
  })

  it('handles empty portfolio', () => {
    const s = calculatePortfolioSummary([], () => null)
    expect(s.totalValue).toBe(0)
    expect(s.totalPnlPercent).toBeUndefined()
    expect(s.holdingsCount).toBe(0)
  })

  it('undefined pnl percent when total cost is zero', () => {
    const s = calculatePortfolioSummary([{ ...holding, averageCost: 0 }], () => null)
    expect(s.totalPnlPercent).toBeUndefined()
  })
})