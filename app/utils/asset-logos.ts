const SUPABASE_BASE_URL = 'https://yjygsxwzkkjhvigedvdy.supabase.co/storage/v1/object/public'

export function getAssetLogoUrl(symbol: string): string | null {
  if (!symbol) return null
  const s = symbol.trim().toUpperCase()

  // Cash accounts (e.g. CASH-BCA-USD) -> initials only
  if (s.startsWith('CASH-')) {
    return null
  }

  // IDX stocks (e.g. BBCA.JK -> BBCA)
  if (s.endsWith('.JK')) {
    const name = s.replace('.JK', '')
    return `${SUPABASE_BASE_URL}/idx/${name}.png`
  }

  // Crypto pairs (e.g. BTC-USD -> btc)
  if (s.endsWith('-USD')) {
    const coin = s.replace('-USD', '').toLowerCase()
    return `https://www.bybit.com/bycsi-root/assets/image/coins/light/${coin}.svg`
  }

  // Indices (e.g. ^GSPC, ^IXIC)
  if (s.startsWith('^')) {
    return null
  }

  // US Stocks / ETFs (e.g. AAPL, NVDA, SPY)
  return `${SUPABASE_BASE_URL}/us/${s}.svg`
}

export function getSymbolInitials(symbol: string): string {
  // Cash accounts embed the bank name (e.g. CASH-BCA-USD -> "BC")
  if (symbol.startsWith('CASH-')) {
    const m = symbol.match(/^CASH-(.+)-([A-Z]{3})$/)
    if (m && m[1]) return m[1].slice(0, 2)
    return symbol.replace('CASH-', '').slice(0, 2) || 'CA'
  }
  const clean = symbol.replace('.JK', '').replace('-USD', '').replace('^', '')
  return clean.slice(0, 2)
}
