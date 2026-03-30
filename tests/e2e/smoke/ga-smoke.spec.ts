import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

test.describe('GA Smoke Tests', () => {
  test('landing page loads under 3s', async ({ page }) => {
    const start = Date.now();
    await page.goto(BASE_URL);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
    await expect(page).toHaveTitle(/DropSites/);
  });

  test('/mcp page renders', async ({ page }) => {
    await page.goto(`${BASE_URL}/mcp`);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('/pricing page renders', async ({ page }) => {
    await page.goto(`${BASE_URL}/pricing`);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('/login page renders', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await expect(page.locator('form')).toBeVisible();
  });

  test('health endpoint returns 200', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    expect(response.status()).toBe(200);
  });

  test('/blog page renders', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog`);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('/blog/mcp-launch renders', async ({ page }) => {
    await page.goto(`${BASE_URL}/blog/mcp-launch`);
    await expect(page.locator('h1')).toContainText('Claude');
  });
});
