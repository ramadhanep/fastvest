import { describe, it, expect } from 'vitest'
import { buildPortfolioHistory } from '~/utils/performance'
import type { ChartPoint } from '#shared/types'

const pts = (...closes: number[]): ChartPoint[] =>
  closes.map((close, i) => ({
    timestamp: (new Date('2026-01-01T00:00:00Z').getTime() / 1000) + i * 86400,
    close,
  }))

const toUsd = (v: number, _cur: string) => v

describe('buildPortfolioHistory', () => {
  it('returns empty when no market data exists', () => {
    expect(buildPortfolioHistory([], toUsd)).toEqual([])
  })

  it('sums price × quantity per day across symbols', () => {
    const out = buildPortfolioHistory(
      [
        { symbol: 'AAPL', points: pts(100, 110, 120), startAt: '2026-01-01T00:00:00Z', quantity: 2, currency: 'USD' },
        { symbol: 'NVDA', points: pts(50, 60, 70), startAt: '2026-01-01T00:00:00Z', quantity: 1, currency: 'USD' },
      ],
      toUsd,
    )
    expect(out.map((p) => p.close)).toEqual([250, 280, 310])
  })

  it('ignores history before a holding start date', () => {
    const out = buildPortfolioHistory(
      [
        { symbol: 'AAPL', points: pts(100, 110, 120), startAt: '2026-01-03T00:00:00Z', quantity: 2, currency: 'USD' },
      ],
      toUsd,
    )
    expect(out.map((p) => p.close)).toEqual([240])
    expect(out[0]?.timestamp).toBe(new Date('2026-01-03T00:00:00Z').getTime() / 1000)
  })

  it('adds cash holdings as a flat constant contribution', () => {
    const out = buildPortfolioHistory(
      [
        { symbol: 'AAPL', points: pts(100, 110), startAt: '2026-01-01T00:00:00Z', quantity: 1, currency: 'USD' },
        { symbol: 'CASH-IDR', isCash: true, startAt: '2026-01-01T00:00:00Z', quantity: 5000, currency: 'IDR' },
      ],
      (v, cur) => (cur === 'IDR' ? v / 16000 : v),
    )
    expect(out.map((p) => p.close)).toEqual([100 + 5000 / 16000, 110 + 5000 / 16000])
  })
})