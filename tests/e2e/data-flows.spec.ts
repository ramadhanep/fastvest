import { expect, test } from '@playwright/test'

test.describe('Data flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('fastvest:demo_cleared', 'true')
    })
    await page.reload()
    await page.waitForLoadState('networkidle')
  })

  test('export produces a valid portable JSON file', async ({ page }) => {
    await page.getByRole('button', { name: 'Add holding' }).first().click()
    await page.getByPlaceholder('Search symbol, e.g. AAPL or NVDA').fill('MSFT')
    await page.getByPlaceholder('Search symbol, e.g. AAPL or NVDA').press('Enter')
    await page.getByLabel('Quantity').fill('5')
    await page.getByLabel('Average cost').fill('400')
    await page.getByRole('button', { name: 'Add holding' }).last().click()
    await expect(page.locator('h2', { hasText: 'Holdings' })).toBeVisible()

    await page.goto('/settings')
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export portfolio' }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('fastvest-portfolio.json')
    const path = await download.path()
    const file = await import('node:fs/promises')
    const raw = await file.readFile(path, 'utf8')
    const parsed = JSON.parse(raw)
    expect(parsed.version).toBe(1)
    expect(parsed.holdings).toHaveLength(1)
    expect(parsed.holdings[0].symbol).toBe('MSFT')
  })

  test('import with confirmation replaces existing portfolio', async ({ page }) => {
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
    await page.getByRole('button', { name: 'Import portfolio' }).click()
    const chooser = await fileChooserPromise
    await chooser.setFiles({
      name: 'test.json',
      mimeType: 'application/json',
      buffer: Buffer.from(payload),
    })

    await page.getByRole('button', { name: 'Import' }).click()
    await expect(page.getByText('Portfolio imported')).toBeVisible()
    await page.goto('/')
    await expect(page.locator('h2', { hasText: 'Holdings' })).toBeVisible()
    await expect(page.getByText('NVDA', { exact: false }).first()).toBeVisible()
  })

  test('import of invalid file is rejected without overwriting', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: 'Import portfolio' }).click()
    const chooser = await fileChooserPromise
    await chooser.setFiles({
      name: 'bad.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{ "version": 99, "holdings": [] }'),
    })
    await page.getByRole('button', { name: 'Import' }).click()
    await expect(page.getByText(/not a valid Fastvest portfolio/)).toBeVisible()
  })

  test('reset clears holdings back to empty state', async ({ page }) => {
    await page.getByRole('button', { name: 'Add holding' }).first().click()
    await page.getByPlaceholder('Search symbol, e.g. AAPL or NVDA').fill('AAPL')
    await page.getByPlaceholder('Search symbol, e.g. AAPL or NVDA').press('Enter')
    await page.getByLabel('Quantity').fill('10')
    await page.getByLabel('Average cost').fill('150')
    await page.getByRole('button', { name: 'Add holding' }).last().click()
    await expect(page.locator('h2', { hasText: 'Holdings' })).toBeVisible()

    await page.goto('/settings')
    await page.getByRole('button', { name: 'Reset portfolio' }).click()
    await page.getByRole('button', { name: 'Reset' }).click()
    await page.goto('/')
    await expect(page.getByText('Your portfolio is empty')).toBeVisible()
  })
})

test.describe('Offline & persistence', () => {
  test('cached portfolio renders offline with indicator', async ({ page, context }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('fastvest:demo_cleared', 'true')
    })
    await page.reload()
    await page.waitForLoadState('networkidle')

    await page.getByRole('button', { name: 'Add holding' }).first().click()
    await page.getByPlaceholder('Search symbol, e.g. AAPL or NVDA').fill('AMD')
    await page.getByPlaceholder('Search symbol, e.g. AAPL or NVDA').press('Enter')
    await page.getByLabel('Quantity').fill('3')
    await page.getByLabel('Average cost').fill('100')
    await page.getByRole('button', { name: 'Add holding' }).last().click()
    await expect(page.locator('h2', { hasText: 'Holdings' })).toBeVisible()
    await page.waitForTimeout(1000)

    await context.setOffline(true)
    await page.waitForTimeout(500)
    await expect(page.getByText(/Offline · cached prices/)).toBeVisible()
    await expect(page.locator('h2', { hasText: 'Holdings' })).toBeVisible()

    await context.setOffline(false)
    await page.waitForTimeout(500)
  })
})

test.describe('Empty state shields quotes', () => {
  test('dashboard renders without market data calls when empty', async ({ page }) => {
    const quoteRequests: string[] = []
    page.on('request', (req) => {
      if (req.url().includes('/api/quotes')) quoteRequests.push(req.url())
    })
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('fastvest:demo_cleared', 'true')
    })
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Your portfolio is empty')).toBeVisible()
    expect(quoteRequests).toHaveLength(0)
  })
})
