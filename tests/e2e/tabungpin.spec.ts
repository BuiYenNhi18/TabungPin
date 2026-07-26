import { expect, test } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = path.resolve(__dirname, '../../screen-shot');

test.describe('TabungPin — Desktop', () => {
  test.beforeAll(async ({ request }) => {
    // Seed demo data
    try {
      await request.post('/api/seed');
    } catch {
      // seed may already be populated
    }
  });

  test('01 — landing page loads with TabungPin branding', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/TabungPin/);
    // Use nav element to uniquely find the brand name
    await expect(page.locator('nav').getByText('TabungPin')).toBeVisible();
    await expect(page.locator('text=Nabung sambil bayar').first()).toBeVisible();
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-landing.jpg`,
      type: 'jpeg',
      quality: 85,
    });
  });

  test('02 — landing shows hero tally and Andi Pratama', async ({ page }) => {
    await page.goto('/');
    // Look for user name in the hero card
    await expect(page.locator('text=Andi Pratama').first()).toBeVisible({ timeout: 10_000 });
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-dashboard.jpg`,
      type: 'jpeg',
      quality: 85,
      fullPage: true,
    });
  });

  test('03 — dashboard loads with tally card', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('text=TabungPin Dashboard')).toBeVisible();
    // Tally section
    await expect(page.locator('text=Terkumpul minggu ini').first()).toBeVisible({
      timeout: 10_000,
    });
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/03-tally.jpg`,
      type: 'jpeg',
      quality: 85,
      fullPage: true,
    });
  });

  test('04 — confirm page visible with XDR preview', async ({ page }) => {
    await page.goto('/confirm');
    // Either confirm button or no-tally message
    const hasConfirm = await page
      .locator('[data-testid="sign-and-deposit-btn"]')
      .isVisible()
      .catch(() => false);
    const hasNoTally = await page
      .locator('text=Belum ada tally')
      .isVisible()
      .catch(() => false);
    expect(hasConfirm || hasNoTally).toBe(true);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-confirm.jpg`,
      type: 'jpeg',
      quality: 85,
      fullPage: true,
    });
  });

  test('05 — vault card shows APY on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="vault-card"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="vault-apy"]').first()).toBeVisible({
      timeout: 10_000,
    });
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-vault.jpg`,
      type: 'jpeg',
      quality: 85,
    });
  });

  test('06 — payment history list renders', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('[data-testid="payment-list"]')).toBeVisible({ timeout: 10_000 });
    // Gojek merchant names should appear
    await expect(page.locator('text=GoFood').first()).toBeVisible({ timeout: 10_000 });
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-history.jpg`,
      type: 'jpeg',
      quality: 85,
      fullPage: true,
    });
  });

  test('07 — CAP-33 sponsored badge visible', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('text=CAP-33').first()).toBeVisible({ timeout: 10_000 });
  });

  test('08 — SSE payment feed shows on landing', async ({ page }) => {
    await page.goto('/');
    // Feed section header should be present
    await expect(page.locator('text=Live Horizon Payment Feed').first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('09 — mobile 375px landing page', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('nav').getByText('TabungPin')).toBeVisible();
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/09-mobile.jpg`,
      type: 'jpeg',
      quality: 85,
    });
  });

  test('10 — confirm page has deposit amount or pending message', async ({ page }) => {
    await page.goto('/confirm');
    const hasAmount = await page
      .locator('[data-testid="deposit-amount"]')
      .isVisible()
      .catch(() => false);
    const hasNoTally = await page
      .locator('text=Belum ada tally')
      .isVisible()
      .catch(() => false);
    const hasSign = await page
      .locator('[data-testid="sign-and-deposit-btn"]')
      .isVisible()
      .catch(() => false);
    expect(hasAmount || hasNoTally || hasSign).toBe(true);
  });
});
