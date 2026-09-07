import { describe, expect, it } from 'vitest'
import { cacheGet, cacheSet, cacheClear } from '../../server/services/cache'

describe('server cache', () => {
  it('returns stored values before expiry', () => {
    cacheSet('a', { x: 1 }, 60)
    expect(cacheGet('a')).toEqual({ x: 1 })
  })

  it('expires entries after ttl', () => {
    cacheClear()
    cacheSet('a', { x: 1 }, 0.001)
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(cacheGet('a')).toBeNull()
        resolve(null)
      }, 20)
    })
  })

  it('returns null for unknown keys', () => {
    expect(cacheGet('missing')).toBeNull()
  })

  it('clears all entries', () => {
    cacheClear()
    cacheSet('a', 1)
    cacheSet('b', 2)
    cacheClear()
    expect(cacheGet('a')).toBeNull()
    expect(cacheGet('b')).toBeNull()
  })
})