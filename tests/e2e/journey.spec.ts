import { expect, test } from '@playwright/test'

test.describe('Critical journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      localStorage.setItem('fastvest:demo_cleared', 'true')
    })
    await page.reload()
    await page.waitForLoadState('networkidle')
  })

  test('default demo portfolio loads initially and can be cleared to empty state', async ({ page }) => {
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Portofolio Contoh (Demo)')).toBeVisible()
    await expect(page.locator('h2', { hasText: 'Holdings' })).toBeVisible()
    await expect(page.getByText('AAPL', { exact: false }).first()).toBeVisible()

    // Click "Mulai dari Kosong" to clear demo portfolio and enter empty state
    await page.getByRole('button', { name: 'Mulai dari Kosong' }).click()
    await expect(page.getByText('Your portfolio is empty')).toBeVisible()
  })

  test('empty state → add → reload persists → edit → delete', async ({ page }, testInfo) => {
    const mobile = testInfo.project.name.includes('mobile')
    const holdingRow = mobile
      ? page.locator('div.p-4', { hasText: 'AAPL' }).filter({ has: page.locator('button', { hasText: '@' }) }).first()
      : page.locator('table tbody tr', { hasText: 'AAPL' }).first()
    const qty15 = mobile
      ? page.locator('div.p-4', { hasText: '15 @ 150' }).first()
      : page.locator('table tbody tr td', { hasText: /^15$/ })

    await expect(page.getByText('Your portfolio is empty')).toBeVisible()

    await page.getByRole('button', { name: 'Add holding' }).first().click()
    const search = page.getByPlaceholder('Search symbol, e.g. AAPL or NVDA')
    await search.fill('AAPL')
    await search.press('Enter')

    await page.getByLabel('Quantity').fill('10')
    await page.getByLabel('Average cost').fill('150')
    await page.getByRole('button', { name: 'Add holding' }).last().click()

    await expect(page.locator('h2', { hasText: 'Holdings' })).toBeVisible()
    await expect(holdingRow).toBeVisible()

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h2', { hasText: 'Holdings' })).toBeVisible()
    await expect(holdingRow).toBeVisible()

    await page.getByRole('button', { name: 'Actions for AAPL' }).click()
    await page.getByRole('menuitem', { name: 'View & edit' }).click()
    await page.getByRole('button', { name: 'Edit' }).click()
    await page.getByLabel('Quantity').fill('15')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(qty15).toBeVisible()

    await page.getByRole('button', { name: 'Actions for AAPL' }).click()
    await page.getByRole('menuitem', { name: 'Delete' }).click()
    await page.getByRole('button', { name: 'Delete' }).click()
    await expect(page.getByText('Your portfolio is empty')).toBeVisible()
  })

  test('empty state blocks quotes but app stays usable', async ({ page }) => {
    await expect(page.getByText('Your portfolio is empty')).toBeVisible()
    await expect(page.getByText(/no account needed/i)).toBeVisible()
  })
})

test.describe('Theme', () => {
  test('theme toggle switches dark class', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Dark' }).click()
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    expect(isDark).toBe(true)
  })
})