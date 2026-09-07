const currencySymbol: Record<string, string> = {
  USD: '$',
  IDR: 'Rp',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  SGD: 'S$',
  HKD: 'HK$',
}

export function formatCurrency(value: number | undefined | null, currency = 'USD'): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return '—'
  const negative = value < 0
  const abs = Math.abs(value)
  const symbol = currencySymbol[currency] ?? ''
  const isIdr = currency === 'IDR'
  const digits = isIdr && abs < 10000
    ? 2
    : isIdr
      ? 0
      : 2

  return `${negative ? '-' : ''}${symbol}${abs.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`
}

export function formatCompact(value: number | undefined | null): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return '—'
  return Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatPercent(
  value: number | undefined | null,
  digits = 2,
  showSign = true,
): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return '—'
  const sign = showSign && value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(digits)}%`
}

export function formatQuantity(value: number | undefined | null): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 8 }).format(value)
}

export function formatNumber(value: number | undefined | null): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return '—'
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export function formatDate(ts: number | string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(ts))
}

export function formatTime(ts: number | string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(ts))
}

export function formatTimeAgo(ts: number | string | Date, now = new Date()): string {
  const diff = now.getTime() - new Date(ts).getTime()
  if (diff < 60_000) return 'just now'
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}