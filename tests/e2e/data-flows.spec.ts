import { expect, test } from '@playwright/test'
import { startEmpty, expectEmptyState, addHolding } from './helpers'

test.describe('Data flows', () => {
  test('export produces a valid portable JSON file', async ({ page }) => {
    await startEmpty(page)
    await addHolding(page, 'MSFT', '5', '400')

    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export JSON (unencrypted, legacy)' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('fastvest-portfolio.json')
    const raw = await (await import('node:fs/promises')).readFile(await download.path(), 'utf8')
    const parsed = JSON.parse(raw) as { version: number; holdings: { symbol: string }[] }
    expect(parsed.version).toBe(1)
    expect(parsed.holdings).toHaveLength(1)
    expect(parsed.holdings[0].symbol).toBe('MSFT')
  })

  test('import with confirmation replaces existing portfolio', async ({ page }) => {
    await startEmpty(page)
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    const payload = JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      holdings: [
        {
          id: 'imp-1',
          symbol: 'NVDA',
          quantity: 7,
          averageCost: 120,
          currency: 'USD',
          createdAt: new Date().toISOString(),
        },
      ],
    })

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Restore from backup' }).click()
    const chooser = await fileChooserPromise
    await chooser.setFiles({
      name: 'test.json',
      mimeType: 'application/json',
      buffer: Buffer.from(payload),
    })

    await page.getByRole('alertdialog').getByRole('button', { name: 'Import', exact: true }).click()
    await expect(page.getByText('Portfolio imported')).toBeVisible()
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Holdings' })).toBeVisible()
    await expect(page.getByText('NVDA', { exact: false }).first()).toBeVisible()
  })

  test('import of invalid file is rejected without overwriting', async ({ page }) => {
    await startEmpty(page)
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Restore from backup' }).click()
    const chooser = await fileChooserPromise
    await chooser.setFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{ "version": 99, "holdings": [] }'),
    })

    await page.getByRole('alertdialog').getByRole('button', { name: 'Import', exact: true }).click()
    await expect(page.getByText(/not a valid Fastvest portfolio/)).toBeVisible()
    await page.goto('/')
    await expectEmptyState(page)
  })

  test('transfer code round-trips a portfolio to another device', async ({ page, context }) => {
    await startEmpty(page)
    await addHolding(page, 'MSFT', '5', '400')

    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Move to another device' }).click()
    await page.getByLabel('Passphrase').fill('tiger-cat-42')
    await page.getByRole('button', { name: 'Create code', exact: true }).click()

    const textarea = page.locator('textarea[readonly]')
    await expect(textarea).toBeVisible()
    const code = (await textarea.inputValue()).trim()
    expect(code.startsWith('FV1B1-')).toBe(true)
    await page.keyboard.press('Escape')

    // Second device, clean storage.
    const other = await context.browser()!.newContext()
    const otherPage = await other.newPage()
    await otherPage.addInitScript((key) => localStorage.setItem(key, 'true'), 'fastvest:demo_cleared')
    await otherPage.goto('/settings')
    await otherPage.waitForLoadState('networkidle')
    await otherPage.getByRole('button', { name: 'Move to another device' }).click()

    // Simulate a chat app mangling the pasted text.
    const mangled = `  ${code.slice(0, 30)}\n${code.slice(30)}  `
    await otherPage.getByLabel('Paste backup code').fill(mangled)
    await otherPage.getByLabel('Passphrase').fill('tiger-cat-42')
    await otherPage.getByRole('button', { name: 'Restore' }).click()
    await expect(otherPage.getByText('Portfolio imported')).toBeVisible()
    await otherPage.goto('/')
    await expect(otherPage.getByText('MSFT', { exact: false }).first()).toBeVisible()
    await other.close()
  })

  test('transfer code rejects a wrong passphrase without overwriting', async ({ page }) => {
    await startEmpty(page)
    await addHolding(page, 'AAPL', '10', '150')
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Move to another device' }).click()
    await page.getByLabel('Passphrase').fill('right-passphrase')
    await page.getByRole('button', { name: 'Create code', exact: true }).click()
    const code = (await page.locator('textarea[readonly]').inputValue()).trim()

    await page.getByRole('button', { name: 'Receive' }).click()
    await page.getByLabel('Paste backup code').fill(code)
    await page.getByLabel('Passphrase').fill('wrong-passphrase')
    await page.getByRole('button', { name: 'Restore' }).click()
    await expect(page.getByRole('alert')).toContainText('Wrong passphrase')

    await page.goto('/')
    await expect(page.getByText('AAPL', { exact: false }).first()).toBeVisible()
  })

  test('reset clears holdings back to empty state', async ({ page }) => {
    await startEmpty(page)
    await addHolding(page, 'AAPL', '10', '150')

    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Clear all holdings and data' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Reset', exact: true }).click()
    await page.goto('/')
    await expectEmptyState(page)
  })
})

test.describe('Offline & persistence', () => {
  test('cached portfolio renders offline with indicator', async ({ page }) => {
    await startEmpty(page)
    await addHolding(page, 'AMD', '3', '100')
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    await page.context().setOffline(true)
    await expect(page.getByText(/Offline ·/).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Holdings' })).toBeVisible()

    await page.context().setOffline(false)
    await expect(page.getByText(/Offline ·/).first()).not.toBeVisible()
  })
})

test.describe('Empty state shields quotes', () => {
  test('dashboard renders without market data calls when empty', async ({ page }) => {
    await page.addInitScript((key) => {
      localStorage.setItem(key, 'true')
    }, 'fastvest:demo_cleared')
    const quoteRequests: string[] = []
    page.on('request', (req) => {
      if (req.url().includes('/api/quotes')) quoteRequests.push(req.url())
    })
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expectEmptyState(page)
    expect(quoteRequests).toHaveLength(0)
  })
})