export interface RecommendedAsset {
  symbol: string
  name: string
  category: 'popular' | 'tech' | 'etf' | 'crypto' | 'idx'
  currency: 'USD' | 'IDR'
  badge?: string
  exchange?: string
}

export interface RecommendationCategory {
  key: 'popular' | 'tech' | 'etf' | 'crypto' | 'idx'
  label: string
}

export const RECOMMENDED_CATEGORIES: RecommendationCategory[] = [
  { key: 'popular', label: 'Popular' },
  { key: 'tech', label: 'US Tech' },
  { key: 'etf', label: 'Index & ETF' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'idx', label: 'Indonesia IDX' },
]

export const RECOMMENDED_ASSETS: RecommendedAsset[] = [
  // Popular Curated
  { symbol: 'AAPL', name: 'Apple Inc.', category: 'popular', currency: 'USD', badge: 'Tech', exchange: 'NASDAQ' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', category: 'popular', currency: 'USD', badge: 'Semiconductors', exchange: 'NASDAQ' },
  { symbol: 'BTC-USD', name: 'Bitcoin', category: 'popular', currency: 'USD', badge: 'Crypto', exchange: 'CRYPTO' },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', category: 'popular', currency: 'USD', badge: 'S&P 500', exchange: 'NYSE' },
  { symbol: 'BBCA.JK', name: 'Bank Central Asia Tbk', category: 'popular', currency: 'IDR', badge: 'Banking', exchange: 'IDX' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', category: 'popular', currency: 'USD', badge: 'Automotive', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', category: 'popular', currency: 'USD', badge: 'Software', exchange: 'NASDAQ' },

  // US Tech
  { symbol: 'AAPL', name: 'Apple Inc.', category: 'tech', currency: 'USD', badge: 'Hardware', exchange: 'NASDAQ' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', category: 'tech', currency: 'USD', badge: 'GPU & AI', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', category: 'tech', currency: 'USD', badge: 'Cloud & AI', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', category: 'tech', currency: 'USD', badge: 'Internet', exchange: 'NASDAQ' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', category: 'tech', currency: 'USD', badge: 'E-Commerce', exchange: 'NASDAQ' },
  { symbol: 'META', name: 'Meta Platforms Inc.', category: 'tech', currency: 'USD', badge: 'Social', exchange: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla, Inc.', category: 'tech', currency: 'USD', badge: 'EV', exchange: 'NASDAQ' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', category: 'tech', currency: 'USD', badge: 'Chips', exchange: 'NASDAQ' },
  { symbol: 'TSM', name: 'Taiwan Semiconductor Mfg', category: 'tech', currency: 'USD', badge: 'Foundry', exchange: 'NYSE' },

  // Index & ETF
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', category: 'etf', currency: 'USD', badge: 'S&P 500', exchange: 'NYSE' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', category: 'etf', currency: 'USD', badge: 'Nasdaq 100', exchange: 'NASDAQ' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', category: 'etf', currency: 'USD', badge: 'Vanguard 500', exchange: 'NYSE' },
  { symbol: '^GSPC', name: 'S&P 500 Index', category: 'etf', currency: 'USD', badge: 'Benchmark', exchange: 'INDEX' },
  { symbol: '^IXIC', name: 'NASDAQ Composite', category: 'etf', currency: 'USD', badge: 'Composite', exchange: 'INDEX' },
  { symbol: '^JKSE', name: 'Jakarta Composite Index', category: 'etf', currency: 'IDR', badge: 'IHSG', exchange: 'INDEX' },

  // Crypto
  { symbol: 'BTC-USD', name: 'Bitcoin', category: 'crypto', currency: 'USD', badge: 'Store of Value', exchange: 'CRYPTO' },
  { symbol: 'ETH-USD', name: 'Ethereum', category: 'crypto', currency: 'USD', badge: 'Smart Contracts', exchange: 'CRYPTO' },
  { symbol: 'SOL-USD', name: 'Solana', category: 'crypto', currency: 'USD', badge: 'L1 Chain', exchange: 'CRYPTO' },
  { symbol: 'BNB-USD', name: 'Binance Coin', category: 'crypto', currency: 'USD', badge: 'Exchange Token', exchange: 'CRYPTO' },

  // Indonesia IDX
  { symbol: 'BBCA.JK', name: 'Bank Central Asia Tbk', category: 'idx', currency: 'IDR', badge: 'Banking', exchange: 'IDX' },
  { symbol: 'BBRI.JK', name: 'Bank Rakyat Indonesia Tbk', category: 'idx', currency: 'IDR', badge: 'Banking', exchange: 'IDX' },
  { symbol: 'BMRI.JK', name: 'Bank Mandiri Tbk', category: 'idx', currency: 'IDR', badge: 'Banking', exchange: 'IDX' },
  { symbol: 'TLKM.JK', name: 'Telkom Indonesia Tbk', category: 'idx', currency: 'IDR', badge: 'Telecom', exchange: 'IDX' },
  { symbol: 'ASII.JK', name: 'Astra International Tbk', category: 'idx', currency: 'IDR', badge: 'Conglomerate', exchange: 'IDX' },
  { symbol: 'GOTO.JK', name: 'GoTo Gojek Tokopedia Tbk', category: 'idx', currency: 'IDR', badge: 'Tech', exchange: 'IDX' },
  { symbol: 'BREN.JK', name: 'Barito Renewables Energy Tbk', category: 'idx', currency: 'IDR', badge: 'Energy', exchange: 'IDX' },
]
