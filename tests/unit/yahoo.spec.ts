import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  quote: vi.fn(),
  search: vi.fn(),
  chart: vi.fn(),
}))

vi.mock('yahoo-finance2', () => ({
  default: vi.fn().mockImplementation(function MockYahooFinance() {
    return {
      quote: mocks.quote,
      search: mocks.search,
      chart: mocks.chart,
    }
  }),
}))

import { getQuotes, searchSymbols } from '../../server/services/yahoo'
import { MarketDataError } from '../../server/utils/errors'
import { cacheClear } from '../../server/services/cache'

describe('getQuotes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cacheClear()
  })

  it('deduplicates and uppercases symbols before a single request', async () => {
    mocks.quote.mockResolvedValue([
      { symbol: 'AAPL', regularMarketPrice: 240.12 },
    ])
    await getQuotes(['aapl', 'AAPL', 'AAPL', ''])
    expect(mocks.quote).toHaveBeenCalledTimes(1)
    expect(mocks.quote.mock.calls[0][0]).toEqual(['AAPL'])
  })

  it('normalizes quotes into a stable shape', async () => {
    mocks.quote.mockResolvedValue([
      {
        symbol: 'NVDA',
        shortName: 'NVIDIA Corporation',
        regularMarketPrice: 120.5,
        regularMarketPreviousClose: 118.0,
        regularMarketChange: 2.5,
        regularMarketChangePercent: 2.1186,
        currency: 'USD',
        marketState: 'REGULAR',
        regularMarketTime: 1700000000,
      },
    ])
    const { data, errors } = await getQuotes(['NVDA'])
    expect(errors).toEqual([])
    expect(data[0]).toEqual({
      symbol: 'NVDA',
      name: 'NVIDIA Corporation',
      price: 120.5,
      previousClose: 118,
      change: 2.5,
      changePercent: 2.1186,
      currency: 'USD',
      marketState: 'REGULAR',
      marketTime: '2023-11-14T22:13:20.000Z',
    })
  })

  it('derives change from price and previous close when absent', async () => {
    mocks.quote.mockResolvedValue([
      { symbol: 'AAPL', regularMarketPrice: 150, regularMarketPreviousClose: 140 },
    ])
    const { data } = await getQuotes(['AAPL'])
    expect(data[0].change).toBe(10)
    expect(data[0].changePercent).toBeCloseTo(7.1428, 2)
  })

  it('keeps failed symbols in errors and successful ones in data', async () => {
    mocks.quote.mockResolvedValue([
      { symbol: 'AAPL', regularMarketPrice: 150 },
      { symbol: 'BROKEN', error: { code: 'Bad Request', message: 'Not Found' } },
      { symbol: 'EMPTY' },
    ])
    const { data, errors } = await getQuotes(['AAPL', 'BROKEN', 'EMPTY'])
    expect(data.map((q) => q.symbol)).toEqual(['AAPL'])
    expect(errors).toEqual(['BROKEN', 'EMPTY'])
  })

  it('reports symbols Yahoo silently omits (invalid) as errors', async () => {
    mocks.quote.mockResolvedValue([
      { symbol: 'AAPL', regularMarketPrice: 150 },
      { symbol: 'MSFT', regularMarketPrice: 300 },
    ])
    const { data, errors } = await getQuotes(['AAPL', 'ZZZZBADXX', 'MSFT'])
    expect(data.map((q) => q.symbol)).toEqual(['AAPL', 'MSFT'])
    expect(errors).toEqual(['ZZZZBADXX'])
  })

  it('wraps upstream failures as MARKET_DATA_UNAVAILABLE', async () => {
    mocks.quote.mockRejectedValue(new Error('socket hang up'))
    await expect(getQuotes(['AAPL'])).rejects.toThrow(MarketDataError)
    await expect(getQuotes(['AAPL'])).rejects.toMatchObject({ code: 'MARKET_DATA_UNAVAILABLE' })
  })
})

describe('searchSymbols', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cacheClear()
  })

  it('uppercases symbols and maps fields', async () => {
    mocks.search.mockResolvedValue({
      quotes: [
        { symbol: 'nvda', longname: 'NVIDIA Corporation', exchange: 'NMS', quoteType: 'EQUITY' },
        { symbol: '', quoteType: 'EQUITY' },
      ],
    })
    const results = await searchSymbols('nvidia')
    expect(results).toEqual([
      { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NMS', type: 'EQUITY' },
    ])
  })

  it('wraps upstream failures as MARKET_DATA_UNAVAILABLE', async () => {
    mocks.search.mockRejectedValue(new Error('timeout'))
    await expect(searchSymbols('aapl')).rejects.toThrow(MarketDataError)
  })
})