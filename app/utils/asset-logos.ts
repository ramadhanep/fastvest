const SUPABASE_BASE_URL = 'https://yjygsxwzkkjhvigedvdy.supabase.co/storage/v1/object/public'

export function getAssetLogoUrl(symbol: string): string | null {
  if (!symbol) return null
  const s = symbol.trim().toUpperCase()

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
  const clean = symbol.replace('.JK', '').replace('-USD', '').replace('^', '')
  return clean.slice(0, 2)
}
