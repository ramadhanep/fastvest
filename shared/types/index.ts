export type Currency = string

export interface Holding {
  id: string
  symbol: string
  quantity: number
  averageCost: number
  currency?: string
  notes?: string
  createdAt: string
}

export interface Quote {
  symbol: string
  name?: string
  price?: number
  previousClose?: number
  change?: number
  changePercent?: number
  currency?: string
  marketState?: string
  marketTime?: string
}

export interface SearchResult {
  symbol: string
  name: string
  exchange: string
  type: string
}

export interface ChartPoint {
  timestamp: number
  close: number
}

export interface ChartData {
  symbol: string
  currency: string
  points: ChartPoint[]
}

export interface HoldingMetrics {
  marketValue: number
  costBasis: number
  pnl: number
  pnlPercent: number | undefined
  dayChange: number
  dayChangePercent: number
}

export interface PortfolioSummary {
  totalValue: number
  totalCostBasis: number
  totalPnl: number
  totalPnlPercent: number | undefined
  totalDayChange: number
  totalDayChangePercent: number
  holdingsCount: number
}

export interface QuoteError {
  symbol: string
  code?: string
  message?: string
}

export interface QuotesResponse {
  data: Quote[]
  errors: QuoteError[]
}

export interface PortfolioFile {
  version: number
  exportedAt: string
  holdings: Holding[]
}

export type SortKey = 'weight' | 'value' | 'pnl' | 'day' | 'symbol'