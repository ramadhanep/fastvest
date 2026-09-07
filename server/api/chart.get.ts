import { getChart } from '../services/yahoo'
import { chartQuerySchema } from '#shared/schemas/holding'
import { normalizeYahooError } from '../utils/errors'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const parsed = chartQuerySchema.safeParse(query)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid symbol or range parameter.' })
  }

  try {
    const chart = await getChart(parsed.data.symbol, parsed.data.range)
    return {
      symbol: parsed.data.symbol.toUpperCase(),
      currency: chart.currency,
      points: chart.points,
    }
  } catch (err) {
    const normalized = normalizeYahooError(err, [parsed.data.symbol])
    throw createError({
      statusCode: 503,
      statusMessage: normalized.message,
      data: normalized,
    })
  }
})