import { expect, test } from '@playwright/test'
import { startEmpty, expectEmptyState, addHolding } from './helpers'

test.describe('Critical journey', () => {
  test('first launch loads demo portfolio and can be dismissed', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Sample data loaded')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Holdings' })).toBeVisible()
    await expect(page.getByText('AAPL', { exact: false }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Dismiss' }).click()
    await expect(page.getByText('Sample data loaded')).not.toBeVisible()
  })

  test('portfolio persists across reloads', async ({ page }) => {
    await startEmpty(page)
    await addHolding(page, 'MSFT', '5', '400')

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Holdings' })).toBeVisible()
    await expect(page.getByText('MSFT', { exact: false }).first()).toBeVisible()

    await page.reload()
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Holdings' })).toBeVisible()
    await expect(page.getByText('MSFT', { exact: false }).first()).toBeVisible()
  })

  test('empty state → add → detail → edit → delete → empty', async ({ page }) => {
    await startEmpty(page)
    await expectEmptyState(page)

    await addHolding(page, 'AAPL', '10', '150')
    await expect(page).toHaveURL(/\/holding\/AAPL/)
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible()

    await page.getByRole('button', { name: 'Edit' }).click()
    const editor = page.getByRole('dialog')
    await editor.getByLabel('Quantity').fill('15')
    await editor.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('15', { exact: true }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await page.getByRole('button', { name: 'Delete AAPL' }).click()
    await expectEmptyState(page)
  })

  test('empty state blocks quotes but app stays usable', async ({ page }) => {
    await startEmpty(page)
    await expectEmptyState(page)
    await page.getByRole('button', { name: 'Add Holding' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
  })
})

test.describe('Theme', () => {
  test('theme toggle switches dark class', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Dark', exact: true }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await page.getByRole('button', { name: 'Light', exact: true }).click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })
})