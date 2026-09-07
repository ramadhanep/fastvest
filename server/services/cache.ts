interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const ttlSeconds = 20

const store = new Map<string, CacheEntry<unknown>>()

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    store.delete(key)
    return null
  }
  return entry.value as T
}

export function cacheSet<T>(key: string, value: T, ttl = ttlSeconds): void {
  store.set(key, { value, expiresAt: Date.now() + ttl * 1000 })
  if (store.size > 500) {
    const now = Date.now()
    for (const [k, e] of store) {
      if (now > e.expiresAt) store.delete(k)
    }
  }
}

export function cacheClear(): void {
  store.clear()
}