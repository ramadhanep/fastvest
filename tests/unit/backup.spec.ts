// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { BackupError, decodeBackup, encodeBackup, isBackupCode, normalizeCode } from '~/lib/backup'

const payload = {
  version: 1,
  exportedAt: '2026-01-01T00:00:00.000Z',
  holdings: Array.from({ length: 60 }, (_, i) => ({
    id: `h${i}`,
    symbol: 'AAPL',
    quantity: 10,
    averageCost: 185.5,
    currency: 'USD',
    notes: 'Core tech position · Apple Inc.',
    createdAt: '2026-01-01T00:00:00.000Z',
  })),
}

describe('backup codec', () => {
  it('round-trips a portfolio', async () => {
    const code = await encodeBackup(payload, 'correct horse')
    expect(code.startsWith('FV1B1-')).toBe(true)
    expect(await decodeBackup(code, 'correct horse')).toEqual(payload)
  })

  it('survives the junk a chat app injects while copying', async () => {
    const code = await encodeBackup(payload, 'pw1234')
    const mangled = `  ${code.slice(0, 20)}\n\n  ${code.slice(20).replace(/-/g, '-')}   `
    expect(await decodeBackup(mangled, 'pw1234')).toEqual(payload)
  })

  it('rejects a wrong passphrase without corrupting anything', async () => {
    const code = await encodeBackup(payload, 'pw1234')
    await expect(decodeBackup(code, 'nope9999')).rejects.toMatchObject({ code: 'wrongPass' })
  })

  it('rejects a tampered code', async () => {
    const code = await encodeBackup(payload, 'pw1234')
    const i = code.length - 5
    const flipped = code[i] === 'A' ? 'B' : 'A'
    await expect(decodeBackup(code.slice(0, i) + flipped + code.slice(i + 1), 'pw1234')).rejects.toBeInstanceOf(BackupError)
  })

  it('never emits base64 + / = characters that break paste', async () => {
    const code = await encodeBackup(payload, 'pw1234')
    expect(code).toMatch(/^FV1B1-[A-Za-z0-9_-]+$/)
  })

  it('rejects weak and non-backup input', async () => {
    await expect(encodeBackup(payload, 'ab')).rejects.toMatchObject({ code: 'weakPass' })
    await expect(decodeBackup('{"version":1}', 'pw1234')).rejects.toMatchObject({ code: 'format' })
  })

  it('detects legacy JSON as not a backup code', () => {
    expect(isBackupCode(JSON.stringify(payload))).toBe(false)
    expect(normalizeCode('{"a": 1}')).toBe('a1')
  })

  it('produces a different code every time (random salt + iv)', async () => {
    const a = await encodeBackup(payload, 'pw1234')
    const b = await encodeBackup(payload, 'pw1234')
    expect(a).not.toBe(b)
    expect(await decodeBackup(b, 'pw1234')).toEqual(payload)
  })

  it('is much smaller than the raw JSON', async () => {
    const raw = JSON.stringify(payload).length
    const code = await encodeBackup(payload, 'pw1234')
    expect(code.length).toBeLessThan(raw)
  })
})
