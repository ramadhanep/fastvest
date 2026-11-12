import { describe, it, expect } from 'vitest'
import {
  calculateHoldingMetrics,
  calculatePortfolioSummary,
  orderAllocationSlices,
  calculatePortfolioRiskProfile,
  mergePosition,
  mergeDuplicateHoldings,
  remainingAfterSell,
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
    expect(m.dayChangePercent).toBeCloseTo(7.142, 2) // (150-140)/140
  })

  it('computes day change percent from previous close', () => {
    const m = calculateHoldingMetrics(holding, quote)
    expect(m.dayChange).toBe(50)
    expect(m.dayChangePercent).toBeCloseTo(3.448, 3) // per-share move, not × quantity
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

  it('does not count an unpriced holding as a 100% loss', () => {
    const holdings = [holding, { ...holding, id: '2', symbol: 'NEW' }]
    const s = calculatePortfolioSummary(holdings, (sym) => (sym === 'AAPL' ? quote : null))
    expect(s.totalPnl).toBe(500)
    expect(s.totalPnlPercent).toBe(50)
  })

  it('measures today against yesterday\'s value', () => {
    // AAPL: 10 × 150 now, +5 per share today → yesterday 1450
    const s = calculatePortfolioSummary([holding], () => quote)
    expect(s.totalDayChangePercent).toBeCloseTo((50 / 1450) * 100, 6)
  })

  it('undefined pnl percent when total cost is zero', () => {
    const s = calculatePortfolioSummary([{ ...holding, averageCost: 0 }], () => null)
    expect(s.totalPnlPercent).toBeUndefined()
  })
})

describe('calculatePortfolioRiskProfile', () => {
  it('weights crypto and concentration risk, then offsets cash', () => {
    const holdings = [
      { ...holding, symbol: 'AAPL', quantity: 6 },
      { ...holding, id: 'btc', symbol: 'BTC-USD', quantity: 1 },
      { ...holding, id: 'cash', symbol: 'CASH-USD', quantity: 500, isCash: true },
    ]
    const quotes: Record<string, Quote> = {
      AAPL: { symbol: 'AAPL', price: 100, currency: 'USD' },
      'BTC-USD': { symbol: 'BTC-USD', price: 100, currency: 'USD' },
      'CASH-USD': { symbol: 'CASH-USD', price: 1, currency: 'USD' },
    }
    const profile = calculatePortfolioRiskProfile(holdings, (symbol) => quotes[symbol] ?? null)
    expect(profile.score).toBe(40)
    expect(profile.level).toBe('moderatelyConservative')
    expect(profile.cryptoPct).toBeCloseTo(100 / 12) // 100 of 1200
    expect(profile.cashPct).toBeCloseTo(500 / 12) // 500 of 1200
  })

  it('returns conservative for an empty portfolio', () => {
    expect(calculatePortfolioRiskProfile([], () => null).level).toBe('conservative')
  })
})

describe('orderAllocationSlices', () => {
  const slice = (label: string, value: number, isCash = false) => ({ label, value, isCash })

  it('keeps all cash slices in one contiguous trailing block', () => {
    const out = orderAllocationSlices([
      slice('CASH-IDR', 100, true),
      slice('BTC-USD', 300),
      slice('AMZN', 200),
      slice('CASH-USD', 400, true),
    ])
    expect(out.map((s) => s.label)).toEqual(['BTC-USD', 'AMZN', 'CASH-USD', 'CASH-IDR'])
  })

  it('keeps duplicate symbols adjacent instead of splitting them', () => {
    const out = orderAllocationSlices([
      slice('BTC-USD', 100),
      slice('AMZN', 5000),
      slice('BTC-USD', 200),
      slice('CASH-IDR', 900, true),
    ])
    expect(out.map((s) => s.label)).toEqual(['AMZN', 'BTC-USD', 'BTC-USD', 'CASH-IDR'])
  })

  it('treats a digital asset flagged isCash as part of the cash block', () => {
    const out = orderAllocationSlices([
      slice('USDT-USD', 700, true),
      slice('AAPL', 900),
      slice('ETH-USD', 500),
    ])
    expect(out.map((s) => s.label)).toEqual(['AAPL', 'ETH-USD', 'USDT-USD'])
  })

  it('orders groups by combined value, stable inside a group', () => {
    const out = orderAllocationSlices([
      slice('SMALL', 10),
      slice('BIG', 5),
      slice('BIG', 500),
      slice('MID', 100),
    ])
    expect(out.map((s) => s.value)).toEqual([5, 500, 100, 10])
  })

  it('does not mutate the input', () => {
    const input = [slice('B', 1), slice('A', 2)]
    orderAllocationSlices(input)
    expect(input.map((s) => s.label)).toEqual(['B', 'A'])
  })
})
describe('mergePosition', () => {
  it('adds quantity and weights the average cost', () => {
    // 10 @ 100 + 30 @ 200 → 40 @ 175
    expect(mergePosition({ quantity: 10, averageCost: 100 }, { quantity: 30, averageCost: 200 })).toEqual({ quantity: 40, averageCost: 175 })
  })
})

describe('mergeDuplicateHoldings', () => {
  it('collapses same-symbol rows into one weighted position', () => {
    const out = mergeDuplicateHoldings([
      { ...holding, id: 'a', quantity: 10, averageCost: 100, createdAt: '2026-03-01T00:00:00.000Z' },
      { ...holding, id: 'x', symbol: 'MSFT', quantity: 1, averageCost: 400 },
      { ...holding, id: 'b', quantity: 30, averageCost: 200, createdAt: '2026-01-01T00:00:00.000Z', notes: 'later' },
    ])
    expect(out.map((h) => h.symbol)).toEqual(['AAPL', 'MSFT'])
    expect(out[0]).toMatchObject({ id: 'a', quantity: 40, averageCost: 175, createdAt: '2026-01-01T00:00:00.000Z', notes: 'later' })
  })
})

describe('remainingAfterSell', () => {
  it('subtracts without float drift and closes at zero', () => {
    expect(remainingAfterSell(0.3, 0.1)).toBe(0.2)
    expect(remainingAfterSell(10, 10)).toBe(0)
    expect(remainingAfterSell(10, 12)).toBe(0)
  })
})
