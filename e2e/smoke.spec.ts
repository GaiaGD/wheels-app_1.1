import { expect, test } from '@playwright/test'

test('route search → pick a flight → flight page', async ({ page }) => {
  await page.goto('/search?dep=JFK&arr=LAX&airline=AA')
  await expect(page.getByRole('heading', { name: /2 flights found/i })).toBeVisible()
  await page.getByRole('link', { name: /AA100/ }).click()
  await expect(page).toHaveURL(/\/flight\/AA100/)
  await expect(page.getByRole('status')).toContainText('In the air')
  await expect(page.getByRole('heading', { name: 'AA100' })).toBeVisible()
})

test('flight number search from the home page', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: /flight number/i }).click()
  await page.getByLabel('Flight number').fill('LH400')
  await page.getByRole('button', { name: 'Search' }).click()
  await expect(page.getByRole('status')).toContainText('Landed')
})

test('an unknown flight shows a friendly message, not a crash', async ({ page }) => {
  await page.goto('/flight/ZZ999')
  await expect(page.getByRole('heading', { name: 'No flight found' })).toBeVisible()
  await page.getByRole('link', { name: /search again/i }).click()
  await expect(page).toHaveURL('/')
})

test('mock mode shows the demo banner', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('note')).toContainText('Demo data')
})

test('home page works with the keyboard only', async ({ page }) => {
  await page.goto('/')
  const flightTab = page.getByRole('tab', { name: /flight number/i })
  await page.keyboard.press('Tab')
  // Tab until the flight-number tab has focus (tabs are reachable by keyboard).
  for (let i = 0; i < 6 && !(await flightTab.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press('Tab')
  }
  await expect(flightTab).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(flightTab).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Tab')
  await expect(page.getByLabel('Flight number')).toBeFocused()
  await page.keyboard.type('AA100')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/flight\/AA100/)
  await expect(page.getByRole('heading', { name: 'AA100' })).toBeVisible()
})

test.describe('layout', () => {
  test('no horizontal overflow at 360px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 })
    for (const path of ['/', '/flight/AA100']) {
      await page.goto(path)
      await expect(page.getByRole('main')).toBeVisible()
      if (path !== '/') await expect(page.getByRole('status')).toBeVisible() // wait past the loading shell
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      expect(overflow, `no horizontal scroll on ${path}`).toBe(true)
    }
  })

  test('departure and arrival sit side by side at 1280px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/flight/AA100')
    const depSection = page.locator('section[aria-label="Departure"]')
    const arrSection = page.locator('section[aria-label="Arrival"]')
    await expect(depSection).toBeVisible()
    await expect(arrSection).toBeVisible()
    const dep = await depSection.boundingBox()
    const arr = await arrSection.boundingBox()
    expect(dep && arr).toBeTruthy()
    expect(Math.abs(dep!.y - arr!.y)).toBeLessThan(40)
    expect(arr!.x).toBeGreaterThan(dep!.x + dep!.width)
  })
})
