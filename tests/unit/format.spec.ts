import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatPercent,
  formatQuantity,
  formatCompact,
  formatTimeAgo,
} from '~/utils/format'

describe('formatCurrency', () => {
  it('formats USD', () => {
    expect(formatCurrency(24821.32, 'USD')).toBe('$24,821.32')
  })
  it('formats negative values', () => {
    expect(formatCurrency(-482.1, 'USD')).toBe('-$482.10')
  })
  it('formats IDR with 2 decimals', () => {
    expect(formatCurrency(1500000, 'IDR')).toBe('Rp1,500,000.00')
  })
  it('renders dash for missing values', () => {
    expect(formatCurrency(undefined)).toBe('—')
    expect(formatCurrency(NaN)).toBe('—')
  })
})

describe('formatPercent', () => {
  it('adds plus sign for positive by default', () => {
    expect(formatPercent(1.98)).toBe('+1.98%')
  })
  it('renders negative without confusion', () => {
    expect(formatPercent(-2.5)).toBe('-2.50%')
  })
  it('handles zero/undefined', () => {
    expect(formatPercent(0)).toBe('+0.00%')
    expect(formatPercent(undefined)).toBe('—')
  })
})

describe('formatQuantity', () => {
  it('supports fractional shares', () => {
    expect(formatQuantity(0.125)).toBe('0.125')
  })
})

describe('formatCompact', () => {
  it('compacts large numbers', () => {
    expect(formatCompact(1_500_000)).toBe('1.5M')
  })
})

describe('formatTimeAgo', () => {
  it('renders relative time', () => {
    const now = new Date('2026-09-06T10:00:00Z')
    expect(formatTimeAgo('2026-09-06T09:30:00Z', now)).toBe('30m ago')
    expect(formatTimeAgo('2026-09-06T09:59:00Z', now)).toBe('1m ago')
    expect(formatTimeAgo('2026-09-05T08:00:00Z', now)).toBe('1d ago')
  })
})