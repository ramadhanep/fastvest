import { describe, expect, it } from 'vitest'
import { MarketDataError, normalizeYahooError, createErrorResponse } from '../../server/utils/errors'

describe('normalizeYahooError', () => {
  it('passes through MarketDataError code and message', () => {
    const err = new MarketDataError('MARKET_DATA_TIMEOUT', 'Market data request timed out.')
    expect(normalizeYahooError(err, ['AAPL'])).toEqual({
      symbols: ['AAPL'],
      code: 'MARKET_DATA_TIMEOUT',
      message: 'Market data request timed out.',
    })
  })

  it('maps unknown errors to MARKET_DATA_UNAVAILABLE', () => {
    expect(normalizeYahooError(new Error('boom'))).toEqual({
      symbols: undefined,
      code: 'MARKET_DATA_UNAVAILABLE',
      message: 'Market data is temporarily unavailable.',
    })
  })

  it('never leaks upstream error details', () => {
    const normalized = normalizeYahooError(new Error('RAW_YAHOO_INTERNAL_XYZ'))
    expect(normalized.message).toBe('Market data is temporarily unavailable.')
    expect(normalized.message).not.toContain('RAW_YAHOO_INTERNAL_XYZ')
  })
})

describe('createErrorResponse', () => {
  it('builds a stable application-level error shape', () => {
    expect(createErrorResponse('AAPL')).toEqual({
      code: 'MARKET_DATA_UNAVAILABLE',
      message: 'Market data is temporarily unavailable.',
      symbol: 'AAPL',
    })
  })
})