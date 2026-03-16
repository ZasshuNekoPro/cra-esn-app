import { test, expect } from '@playwright/test';

test.describe('CRA Saisie (smoke)', () => {
  test.beforeEach(async ({ page }) => {
    // Login as employee
    await page.goto('/login');
    await page.fill('[name=email]', 'alice@example.com');
    await page.fill('[name=password]', 'password123');
    await page.click('[type=submit]');
    await page.waitForURL('**/dashboard');
  });

  test('should display monthly calendar grid after login as EMPLOYEE', async ({ page }) => {
    await page.goto('/cra/2026/3');
    await expect(page.locator('[data-testid=month-grid]')).toBeVisible();
  });

  test('should open entry modal when clicking on a working day', async ({ page }) => {
    await page.goto('/cra/2026/3');
    await page.locator('[data-testid=day-cell]:not([disabled])').first().click();
    await expect(page.locator('[role=dialog]')).toBeVisible();
  });

  test('should show "Soumettre" button when status is DRAFT', async ({ page }) => {
    await page.goto('/cra/2026/3');
    await expect(page.locator('button:has-text("Soumettre")')).toBeVisible();
  });
});
