import { beforeEach, describe, expect, it } from 'vitest'
import { kv, storageGet, storageSet, storageRemove } from '~/lib/storage'

describe('storage layer', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('round-trips prefixed values', () => {
    storageSet('portfolio', { holdings: [] })
    expect(localStorage.getItem('fastvest:portfolio')).toContain('"version":1')
    expect(storageGet('portfolio')).toEqual({ holdings: [] })
  })

  it('returns null for missing keys', () => {
    expect(storageGet('nope')).toBeNull()
  })

  it('recovers from corrupted JSON', () => {
    localStorage.setItem('fastvest:portfolio', '{not json')
    expect(storageGet('portfolio')).toBeNull()
  })

  it('ignores data without a version number', () => {
    localStorage.setItem('fastvest:portfolio', JSON.stringify({ holdings: [] }))
    expect(storageGet('portfolio')).toBeNull()
  })

  it('supports removal', () => {
    storageSet('portfolio', { holdings: [] })
    storageRemove('portfolio')
    expect(storageGet('portfolio')).toBeNull()
  })

  it('exposes the known keys', () => {
    expect(Object.keys(kv).sort()).toEqual([
      'portfolio',
      'preferences',
      'quoteCache',
      'recentSearches',
    ])
  })
})