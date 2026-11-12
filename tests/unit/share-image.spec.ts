import { describe, expect, it } from 'vitest'
import { topRows } from '~/utils/share-image'

describe('topRows', () => {
  it('keeps short lists sorted by weight', () => {
    const out = topRows([{ label: 'A', pct: 20, color: '#000' }, { label: 'B', pct: 80, color: '#111' }], 'Others')
    expect(out.map((r) => r.label)).toEqual(['B', 'A'])
  })

  it('folds the tail into Others and keeps the total', () => {
    const rows = Array.from({ length: 14 }, (_, i) => ({ label: `S${i}`, pct: 100 / 14, color: '#000' }))
    const out = topRows(rows, 'Others')
    expect(out).toHaveLength(10)
    expect(out.at(-1)?.label).toBe('Others')
    expect(out.reduce((s, r) => s + r.pct, 0)).toBeCloseTo(100)
  })
})
