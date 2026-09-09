import yahooFinance from 'yahoo-finance2'
import { cacheGet, cacheSet } from '../services/cache'

const yf = new yahooFinance({ suppressNotices: ['yahooSurvey'] as never })

const PAIRS: Record<string, string> = {
  IDR: 'IDR=X',
  JPY: 'JPY=X',
  EUR: 'EURUSD=X',
  GBP: 'GBPUSD=X',
  HKD: 'HKDUSD=X',
  SGD: 'SGDUSD=X',
}

const INVERTED = new Set(['IDR', 'JPY'])
const CODES = Object.keys(PAIRS)

export default defineEventHandler(async () => {
  const cacheKey = 'exchange:usd:v2'
  const cached = cacheGet<Record<string, number>>(cacheKey)
  if (cached) return cached

  const usdPerUnit: Record<string, number> = { USD: 1 }

  try {
    const raw = await yf.quote(Object.values(PAIRS) as never)
    const rows = Array.isArray(raw) ? raw : [raw]
    for (const row of rows) {
      const price = (row as Record<string, unknown>).regularMarketPrice as number | undefined
      if (!price) continue
      const sym = String((row as Record<string, unknown>).symbol)
      const code = CODES.find((k) => PAIRS[k] === sym)
      if (code) usdPerUnit[code] = INVERTED.has(code) ? 1 / price : price
    }
  } catch {
    // keep whatever resolved
  }

  if (CODES.some((code) => usdPerUnit[code] === undefined)) return usdPerUnit
  cacheSet(cacheKey, usdPerUnit, 3600)
  return usdPerUnit
})