const STORAGE_PREFIX = 'fastvest:'

export interface Stored<T> {
  version: number
  data: T
}

const SCHEMA_VERSION = 1

const migrations: Record<number, (raw: unknown) => unknown> = {
  1: (raw) => raw,
}

function safeParse<T>(key: string): Stored<T> | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    const parsed = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object') return null
    if (typeof parsed.version !== 'number') return null
    return parsed as Stored<T>
  } catch {
    return null
  }
}

export function storageGet<T>(key: string): T | null {
  const stored = safeParse<unknown>(STORAGE_PREFIX + key)
  if (!stored) return null
  let current = stored.data
  for (let v = stored.version; v < SCHEMA_VERSION; v++) {
    const migrate = migrations[v + 1]
    if (!migrate) break
    current = migrate(current)
  }
  return current as T
}

export function storageSet<T>(key: string, data: T): void {
  const wrapper: Stored<T> = { version: SCHEMA_VERSION, data }
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(wrapper))
}

export function storageRemove(key: string): void {
  localStorage.removeItem(STORAGE_PREFIX + key)
}

export function storageRawGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function storageRawSet(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}

export const kv = {
  portfolio: 'portfolio',
  preferences: 'preferences',
  quoteCache: 'quote-cache',
  recentSearches: 'recent-searches',
} as const

export { SCHEMA_VERSION }