import { type Page, expect } from '@playwright/test'

export const DEMO_CLEARED_KEY = 'fastvest:demo_cleared'

export async function startEmpty(page: Page) {
  await page.addInitScript((key) => {
    localStorage.setItem(key, 'true')
  }, DEMO_CLEARED_KEY)
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}

export async function expectEmptyState(page: Page) {
  await expect(page.getByRole('heading', { name: 'Your portfolio' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add Holding' })).toBeVisible()
}

export async function addHolding(page: Page, symbol: string, quantity: string, cost: string) {
  await page.getByRole('button', { name: 'Add Holding' }).first().click()
  const dialog = page.getByRole('dialog')
  const search = dialog.getByPlaceholder('Search symbol, e.g. NVDA, BBCA, BTC...')
  await search.fill(symbol)
  await search.press('Enter')
  await dialog.getByLabel('Quantity').fill(quantity)
  await dialog.getByLabel('Average cost').fill(cost)
  await dialog.getByRole('button', { name: 'Add Holding' }).click()
}