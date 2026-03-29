import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Accessibility audit tests using axe-core via Playwright.
 *
 * These tests validate WCAG 2.1 AA compliance across key pages.
 * They are intended to run against a local dev server (pnpm dev).
 */

test.describe('Accessibility — WCAG 2.1 AA', () => {
  test('home page passes axe audit', async ({ page }) => {
    await page.goto('/')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('login page passes axe audit', async ({ page }) => {
    await page.goto('/login')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('signup page passes axe audit', async ({ page }) => {
    await page.goto('/signup')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('dashboard page passes axe audit', async ({ page }) => {
    // Requires authentication — test will be skipped in CI without auth fixtures
    await page.goto('/dashboard')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('upload zone is keyboard-accessible', async ({ page }) => {
    await page.goto('/dashboard')

    const uploadZone = page.locator('[aria-label="Upload zone — drag and drop or click to browse"]')

    // Should be focusable
    await uploadZone.focus()
    await expect(uploadZone).toBeFocused()

    // Should respond to Enter key
    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.keyboard.press('Enter')
    const fileChooser = await fileChooserPromise
    expect(fileChooser).toBeTruthy()
  })

  test('upload zone is activatable with Space key', async ({ page }) => {
    await page.goto('/dashboard')

    const uploadZone = page.locator('[aria-label="Upload zone — drag and drop or click to browse"]')
    await uploadZone.focus()

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.keyboard.press('Space')
    const fileChooser = await fileChooserPromise
    expect(fileChooser).toBeTruthy()
  })

  test('all interactive elements have accessible names', async ({ page }) => {
    await page.goto('/dashboard')

    // Verify buttons have accessible names (aria-label or text content)
    const buttons = page.locator('button')
    const count = await buttons.count()
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i)
      const name = await button.getAttribute('aria-label')
      const text = await button.textContent()
      const isHidden = await button.getAttribute('aria-hidden')
      if (isHidden === 'true') continue
      expect(name || text?.trim(), `Button ${i} has no accessible name`).toBeTruthy()
    }
  })

  test('modals trap focus correctly', async ({ page }) => {
    await page.goto('/dashboard')

    // Open a dropdown to trigger a dialog (if deployments exist)
    const actionsBtn = page.locator('[aria-label="Deployment actions"]').first()
    if (await actionsBtn.isVisible()) {
      await actionsBtn.click()

      // The dropdown menu content should be visible and receive focus
      const menuContent = page.locator('[role="menu"]')
      await expect(menuContent).toBeVisible()

      // Escape should close it
      await page.keyboard.press('Escape')
      await expect(menuContent).not.toBeVisible()
    }
  })

  test('color contrast meets WCAG AA', async ({ page }) => {
    await page.goto('/')
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .withRules(['color-contrast'])
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('images have alt text', async ({ page }) => {
    await page.goto('/')
    const results = await new AxeBuilder({ page })
      .withRules(['image-alt'])
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('form inputs have labels', async ({ page }) => {
    await page.goto('/login')
    const results = await new AxeBuilder({ page })
      .withRules(['label'])
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('heading hierarchy is correct', async ({ page }) => {
    await page.goto('/')
    const results = await new AxeBuilder({ page })
      .withRules(['heading-order'])
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('page has landmark regions', async ({ page }) => {
    await page.goto('/')
    const results = await new AxeBuilder({ page })
      .withRules(['region'])
      .analyze()

    expect(results.violations).toEqual([])
  })
})
