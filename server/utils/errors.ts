export class MarketDataError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'MarketDataError'
    this.code = code
  }
}

export function normalizeYahooError(err: unknown, symbols?: string[]) {
  if (err instanceof MarketDataError) {
    return { symbols, code: err.code, message: err.message }
  }
  return {
    symbols,
    code: 'MARKET_DATA_UNAVAILABLE',
    message: 'Market data is temporarily unavailable.',
  }
}

export function createErrorResponse(symbol?: string) {
  return {
    code: 'MARKET_DATA_UNAVAILABLE',
    message: 'Market data is temporarily unavailable.',
    symbol,
  }
}