import { describe, expect, it } from 'vitest'
import { holdingSchema, portfolioFileSchema, quotesQuerySchema } from '#shared/schemas/holding'

describe('holdingSchema', () => {
  it('accepts a valid holding', () => {
    const res = holdingSchema.safeParse({
      id: '1',
      symbol: ' aapl ',
      quantity: 10,
      averageCost: 100,
    })
    expect(res.success).toBe(true)
    expect(res.success && res.data.symbol).toBe('AAPL')
  })

  it('rejects zero or negative quantity', () => {
    expect(holdingSchema.safeParse({ id: '1', symbol: 'AAPL', quantity: 0, averageCost: 1 }).success).toBe(false)
    expect(holdingSchema.safeParse({ id: '1', symbol: 'AAPL', quantity: -1, averageCost: 1 }).success).toBe(false)
  })

  it('rejects negative average cost', () => {
    expect(holdingSchema.safeParse({ id: '1', symbol: 'AAPL', quantity: 1, averageCost: -5 }).success).toBe(false)
  })

  it('allows zero average cost holdings', () => {
    expect(holdingSchema.safeParse({ id: '1', symbol: 'AAPL', quantity: 1, averageCost: 0 }).success).toBe(true)
  })
})

describe('portfolioFileSchema', () => {
  it('accepts version 1 export files', () => {
    const res = portfolioFileSchema.safeParse({
      version: 1,
      exportedAt: '2026-09-06T00:00:00.000Z',
      holdings: [{ id: '1', symbol: 'NVDA', quantity: 2, averageCost: 800 }],
    })
    expect(res.success).toBe(true)
  })

  it('rejects unsupported versions', () => {
    expect(
      portfolioFileSchema.safeParse({ version: 99, exportedAt: '2026-01-01T00:00:00.000Z', holdings: [] }).success,
    ).toBe(false)
  })

  it('rejects missing fields', () => {
    expect(portfolioFileSchema.safeParse({ version: 1, holdings: [] }).success).toBe(false)
  })
})

describe('quotesQuerySchema', () => {
  it('splits comma separated symbols and trims', () => {
    const r = quotesQuerySchema.parse({ symbols: '  AAPL , NVDA , AAPL ' })
    expect(r.symbols).toEqual(['AAPL', 'NVDA', 'AAPL'])
  })

  it('rejects empty symbol lists', () => {
    expect(quotesQuerySchema.safeParse({ symbols: ',,' }).success).toBe(false)
  })
})