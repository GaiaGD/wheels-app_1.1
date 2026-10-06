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

  test('desktop: departure left of arrival, same top region (1280x800)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/flight/AA100')
    const depSection = page.locator('section[aria-label="Departure"]')
    const arrSection = page.locator('section[aria-label="Arrival"]')
    await expect(depSection).toBeVisible()
    await expect(arrSection).toBeVisible()
    const dep = await depSection.boundingBox()
    const arr = await arrSection.boundingBox()
    expect(dep && arr).toBeTruthy()
    const centre = (b: { y: number; height: number }) => b.y + b.height / 2
    expect(Math.abs(centre(dep!) - centre(arr!))).toBeLessThan(80)
    expect(arr!.x).toBeGreaterThan(dep!.x + dep!.width)
  })

  test('phone: departure above arrival, both inside the width (390x844)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/flight/AA100')
    const depSection = page.locator('section[aria-label="Departure"]')
    const arrSection = page.locator('section[aria-label="Arrival"]')
    await expect(depSection).toBeVisible()
    await expect(arrSection).toBeVisible()
    const dep = await depSection.boundingBox()
    const arr = await arrSection.boundingBox()
    expect(dep && arr).toBeTruthy()
    expect(dep!.y + dep!.height).toBeLessThanOrEqual(arr!.y)
    for (const b of [dep!, arr!]) {
      expect(b.x).toBeGreaterThanOrEqual(0)
      expect(b.x + b.width).toBeLessThanOrEqual(390)
    }
  })

  test('1000x800 uses the phone layout: departure above arrival', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 800 })
    await page.goto('/flight/AA100')
    await expect(page.locator('section[aria-label="Departure"]')).toBeVisible()
    const dep = await page.locator('section[aria-label="Departure"]').boundingBox()
    const arr = await page.locator('section[aria-label="Arrival"]').boundingBox()
    expect(dep && arr).toBeTruthy()
    expect(dep!.y + dep!.height).toBeLessThanOrEqual(arr!.y)
  })

  for (const width of [1100, 1280, 1400]) {
    test(`desktop ${width}x800: cards left/right, pill and path strip clear of both`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/flight/AA100')
      const box = async (sel: string) => {
        await expect(page.locator(sel).first()).toBeVisible()
        const b = await page.locator(sel).first().boundingBox()
        expect(b, sel).toBeTruthy()
        return b!
      }
      const dep = await box('section[aria-label="Departure"]')
      const arr = await box('section[aria-label="Arrival"]')
      const pill = await box('[role="status"]')
      const path = await box('section[aria-label="Flight path"]')
      expect(arr.x).toBeGreaterThanOrEqual(dep.x + dep.width)
      const overlaps = (a: typeof dep, b: typeof dep) =>
        a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
      for (const [name, b] of [['pill', pill], ['path strip', path]] as const) {
        expect(overlaps(b, dep), `${name} overlaps departure`).toBe(false)
        expect(overlaps(b, arr), `${name} overlaps arrival`).toBe(false)
        expect(b.x).toBeGreaterThanOrEqual(dep.x + dep.width)
        expect(b.x + b.width).toBeLessThanOrEqual(arr.x)
      }
    })
  }

  for (const size of [
    { width: 390, height: 844 },
    { width: 1280, height: 800 },
  ]) {
    test(`route map is visible at ${size.width}x${size.height}`, async ({ page }) => {
      await page.setViewportSize(size)
      await page.goto('/flight/AA100')
      const map = page.locator('[aria-label="Flight route map"]')
      await expect(map).toBeVisible({ timeout: 30_000 })
      // The canvas needs WebGL; give it time to load the map chunk and create it.
      await expect(map.locator('canvas')).toHaveCount(1, { timeout: 30_000 })
    })
  }
})
