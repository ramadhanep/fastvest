import { z } from 'zod'

export const holdingSchema = z.object({
  id: z.string().min(1),
  symbol: z.string().trim().min(1).max(20).transform((s) => s.toUpperCase()),
  quantity: z.number().positive('Quantity must be greater than 0'),
  averageCost: z.number().min(0, 'Average cost cannot be negative'),
  currency: z.string().optional().default('USD'),
  notes: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  isCash: z.boolean().optional().default(false),
})

export const portfolioFileSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().datetime(),
  holdings: z.array(holdingSchema),
})

export const quotesQuerySchema = z.object({
  symbols: z
    .string()
    .min(1)
    .transform((s) =>
      s
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    )
    .refine((arr) => arr.length > 0, 'At least one symbol is required'),
})

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(60),
})

export const chartQuerySchema = z.object({
  symbol: z.string().trim().min(1).max(20),
  range: z
    .enum(['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', 'ytd', 'max'])
    .default('1y'),
})

export type HoldingInput = z.infer<typeof holdingSchema>