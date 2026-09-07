import { getQuotes } from '../services/yahoo'
import { quotesQuerySchema } from '#shared/schemas/holding'
import { normalizeYahooError } from '../utils/errors'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const parsed = quotesQuerySchema.safeParse(query)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or missing symbols parameter.' })
  }

  const symbols = parsed.data.symbols
  try {
    const { data, errors } = await getQuotes(symbols)
    return {
      data,
      errors: errors.map((symbol) => ({
        symbol,
        code: 'MARKET_DATA_UNAVAILABLE',
        message: 'Market data is temporarily unavailable.',
      })),
    }
  } catch (err) {
    const normalized = normalizeYahooError(err, symbols)
    throw createError({
      statusCode: 503,
      statusMessage: normalized.message,
      data: normalized,
    })
  }
})