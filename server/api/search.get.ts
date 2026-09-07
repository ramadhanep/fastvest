import { searchSymbols } from '../services/yahoo'
import { searchQuerySchema } from '#shared/schemas/holding'
import { normalizeYahooError } from '../utils/errors'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const parsed = searchQuerySchema.safeParse(query)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or missing q parameter.' })
  }

  try {
    return { results: await searchSymbols(parsed.data.q) }
  } catch (err) {
    const normalized = normalizeYahooError(err)
    throw createError({
      statusCode: 503,
      statusMessage: normalized.message,
      data: normalized,
    })
  }
})