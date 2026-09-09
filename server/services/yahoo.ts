import yahooFinance from 'yahoo-finance2'
import type { ChartPoint, Quote, SearchResult } from '#shared/types'
import { MarketDataError } from '../utils/errors'
import { cacheGet, cacheSet } from './cache'

const yf = new yahooFinance({ suppressNotices: ['yahooSurvey'] as never })

const TIMEOUT_MS = 8_000

async function withTimeout<T>(fn: () => Promise<T>): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fn()
  } catch (err) {
    if (controller.signal.aborted) {
      throw new MarketDataError('MARKET_DATA_TIMEOUT', 'Market data request timed out.')
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}

function normalizeQuote(raw: Record<string, unknown>): Quote {
  const price = raw.regularMarketPrice as number | undefined
  const previousClose = raw.regularMarketPreviousClose as number | undefined
  const change =
    (raw.regularMarketChange as number | undefined) ??
    (price !== undefined && previousClose !== undefined ? price - previousClose : undefined)
  const changePercent =
    (raw.regularMarketChangePercent as number | undefined) ??
    (previousClose && price !== undefined ? (change! / previousClose) * 100 : undefined)

  return {
    symbol: String(raw.symbol),
    name: (raw.shortName as string) ?? (raw.longName as string) ?? undefined,
    price,
    previousClose,
    change,
    changePercent,
    currency: (raw.currency as string) ?? undefined,
    marketState: (raw.marketState as string) ?? undefined,
    marketTime: raw.regularMarketTime
      ? new Date(Number(raw.regularMarketTime) * 1000).toISOString()
      : undefined,
  }
}

export interface QuoteRawResponse {
  symbol: string
  quote?: Record<string, unknown>
  error?: { code?: string; message?: string }
}

interface ChartQuoteRaw {
  close?: number
  date?: string | Date
}

interface ChartResult {
  quotes?: ChartQuoteRaw[]
  meta?: { currency?: string }
}

export async function getQuotes(symbols: string[]): Promise<{ data: Quote[]; errors: Quote['symbol'][] }> {
  const unique = [...new Set(symbols.filter(Boolean).map((s) => s.toUpperCase()))]
  const cacheKey = `quotes:${unique.slice().sort().join(',')}`

  const cached = cacheGet<Quote[]>(cacheKey) as Quote[] | undefined
  if (cached) return { data: cached, errors: [] }

  try {
    const raw = await withTimeout(() =>
      yf.quote(unique as Parameters<typeof yf.quote>[0] as never),
    )
    const rows = (Array.isArray(raw) ? raw : [raw]) as QuoteRawResponse[]
    const data: Quote[] = []
    const errors: string[] = []

    const errored = new Set<string>()
    for (const row of rows) {
      const sym = String(row.symbol).toUpperCase()
      if (row.error) {
        errored.add(sym)
        errors.push(row.symbol)
        continue
      }
      const quote = normalizeQuote(row.quote ?? (row as unknown as Record<string, unknown>))
      if (!quote.price && !quote.marketState) {
        errored.add(sym)
        errors.push(row.symbol)
        continue
      }
      data.push(quote)
    }

    for (const sym of unique) {
      if (!data.some((q) => q.symbol.toUpperCase() === sym) && !errored.has(sym)) {
        errors.push(sym)
      }
    }

    cacheSet(cacheKey, data, 15)
    return { data, errors }
  } catch (err) {
    if (err instanceof MarketDataError) throw err
    throw new MarketDataError('MARKET_DATA_UNAVAILABLE', 'Market data is temporarily unavailable.')
  }
}

export async function searchSymbols(query: string): Promise<SearchResult[]> {
  const cacheKey = `search:${query.toLowerCase().trim()}`
  const cached = cacheGet<SearchResult[]>(cacheKey)
  if (cached) return cached

  try {
    const raw = await withTimeout(() => yf.search(query))
    const quotes = raw.quotes ?? []
    const results: SearchResult[] = quotes
      .map((r) => ({
        symbol: String(r.symbol).toUpperCase(),
        name: (r.longname ?? r.shortname ?? String(r.symbol)) as string,
        exchange: (r.exchDisp ?? r.exchange ?? '') as string,
        type: (r.quoteType ?? r.typeDisp ?? '') as string,
      }))
      .filter((r) => r.symbol)

    cacheSet(cacheKey, results, 300)
    return results
  } catch (err) {
    if (err instanceof MarketDataError) throw err
    throw new MarketDataError('MARKET_DATA_UNAVAILABLE', 'Market data is temporarily unavailable.')
  }
}

const RANGE_SECONDS: Record<string, number> = {
  '1d': 24 * 3600,
  '5d': 5 * 24 * 3600,
  '1mo': 30 * 24 * 3600,
  '3mo': 90 * 24 * 3600,
  '6mo': 182 * 24 * 3600,
  '1y': 365 * 24 * 3600,
  '2y': 2 * 365 * 24 * 3600,
  '5y': 5 * 365 * 24 * 3600,
  ytd: Math.floor((Date.now() - Date.UTC(new Date().getUTCFullYear(), 0, 1)) / 1000),
  max: undefined as unknown as number,
}

const INTERVAL: Record<string, string> = {
  '1d': '5m',
  '5d': '1d',
  '1mo': '1d',
  '3mo': '1d',
  '6mo': '1d',
  '1y': '1d',
  '2y': '1wk',
  '5y': '1wk',
  ytd: '1d',
  max: '1mo',
}

export async function getChart(symbol: string, range: string): Promise<{ points: ChartPoint[]; currency: string }> {
  const cacheKey = `chart:${symbol.toUpperCase()}:${range}`
  const cached = cacheGet<{ points: ChartPoint[]; currency: string }>(cacheKey)
  if (cached) return cached

  const period2 = Math.floor(Date.now() / 1000)
  const period1 = RANGE_SECONDS[range] === undefined
    ? 30 * 365 * 24 * 3600
    : period2 - RANGE_SECONDS[range]
  const interval = INTERVAL[range] ?? '1d'

  try {
    const raw = await withTimeout<ChartResult>(() =>
      yf.chart(symbol as never, { period1, period2, interval } as never),
    )
    const points: ChartPoint[] = []
    for (const q of raw.quotes ?? []) {
      if (!q.close || !q.date) continue
      points.push({ timestamp: Math.floor(new Date(q.date).getTime() / 1000), close: q.close })
    }
    const result = { points, currency: (raw.meta?.currency as string) ?? 'USD' }
    cacheSet(cacheKey, result, 60)
    return result
  } catch (err) {
    if (err instanceof MarketDataError) throw err
    throw new MarketDataError('MARKET_DATA_UNAVAILABLE', 'Market data is temporarily unavailable.')
  }
}