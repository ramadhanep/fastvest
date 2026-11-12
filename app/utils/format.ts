const currencySymbol: Record<string, string> = {
  USD: '$',
  IDR: 'Rp',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  SGD: 'S$',
  HKD: 'HK$',
  MYR: 'RM',
}

export function formatCurrency(value: number | undefined | null, currency = 'USD'): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return '—'
  const negative = value < 0
  const abs = Math.abs(value)
  const symbol = currencySymbol[currency] ?? ''

  // Special rounding for IDR (round up, no decimals)
  if (currency === 'IDR') {
    return `${negative ? '-' : ''}${symbol}${Math.round(abs).toLocaleString('en-US')}`
  }

  return `${negative ? '-' : ''}${symbol}${abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

// Dates follow the app language; numbers stay en-US on purpose (one grouping style app-wide).
// Invalid input returns '—' — Intl.DateTimeFormat throws on an Invalid Date.
function formatDateTime(ts: number | string | Date, locale: string, opts: Intl.DateTimeFormatOptions): string {
  const d = new Date(ts)
  return Number.isFinite(d.getTime()) ? new Intl.DateTimeFormat(locale, opts).format(d) : '—'
}

export function formatDate(ts: number | string | Date, locale = 'en'): string {
  return formatDateTime(ts, locale, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatTime(ts: number | string | Date, locale = 'en'): string {
  return formatDateTime(ts, locale, { hour: 'numeric', minute: '2-digit' })
}

const AGO = {
  en: { now: 'just now', m: (n: number) => `${n}m ago`, h: (n: number) => `${n}h ago`, d: (n: number) => `${n}d ago` },
  id: { now: 'baru saja', m: (n: number) => `${n} mnt lalu`, h: (n: number) => `${n} jam lalu`, d: (n: number) => `${n} hr lalu` },
}

export function formatTimeAgo(ts: number | string | Date, now = new Date(), locale: 'en' | 'id' = 'en'): string {
  const words = AGO[locale]
  const diff = now.getTime() - new Date(ts).getTime()
  if (diff < 60_000) return words.now
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return words.m(mins)
  const hours = Math.floor(mins / 60)
  if (hours < 24) return words.h(hours)
  return words.d(Math.floor(hours / 24))
}