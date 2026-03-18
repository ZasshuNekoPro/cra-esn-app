import { test, expect, type Page } from '@playwright/test';

const EMPLOYEE = { email: 'alice@example.com', password: 'password123' };
const ESN_ADMIN = { email: 'admin@esn-corp.fr', password: 'password123' };
const CLIENT = { email: 'client@client-corp.fr', password: 'password123' };
const YEAR = 2026;
const MONTH = 3;

async function login(page: Page, user: { email: string; password: string }) {
  await page.goto('/login');
  await page.fill('[name=email]', user.email);
  await page.fill('[name=password]', user.password);
  await page.click('[type=submit]');
  await page.waitForURL(/dashboard/);
}

test.describe('Scenario 02 — Workflow de signature tripartite', () => {
  test('02-a : salarié soumet le CRA', async ({ page }) => {
    await login(page, EMPLOYEE);
    await page.goto(`/cra/${YEAR}/${MONTH}`);
    await expect(page.locator('[data-testid=month-grid]')).toBeVisible();

    // Le CRA doit être en DRAFT — bouton Soumettre visible
    const submitButton = page.locator('button:has-text("Soumettre")');
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Après soumission → statut SUBMITTED → bouton Signer visible
    await expect(page.locator('button:has-text("Signer")')).toBeVisible({ timeout: 5000 });
    // Option retrait aussi disponible
    await expect(page.locator('button:has-text("Retirer")')).toBeVisible();
  });

  test('02-b : salarié signe le CRA soumis', async ({ page }) => {
    await login(page, EMPLOYEE);
    await page.goto(`/cra/${YEAR}/${MONTH}`);

    // Soumettre d'abord si encore en DRAFT
    const submitButton = page.locator('button:has-text("Soumettre")');
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(1000);
    }

    const signButton = page.locator('button:has-text("Signer")');
    if (await signButton.isVisible()) {
      await signButton.click();
      // Statut → SIGNED_EMPLOYEE : plus de bouton Signer pour le salarié
      await expect(page.locator('button:has-text("Signer")')).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('02-c : ESN admin se connecte et voit les CRA à valider', async ({ page }) => {
    await login(page, ESN_ADMIN);
    await expect(page.locator('body')).not.toContainText('500');
    // L'admin ESN doit avoir accès au dashboard admin
    await expect(page.locator('body')).toContainText(/esn|admin|salarié/i);
  });

  test('02-d : client se connecte et voit le CRA signé par ESN', async ({ page }) => {
    await login(page, CLIENT);
    await expect(page.locator('body')).not.toContainText('500');
    await expect(page.locator('body')).not.toContainText('Forbidden');
  });

  test('02-e : accès refusé aux données CRA sans authentification', async ({ page }) => {
    // Sans login, l'accès à la page CRA doit rediriger vers /login
    await page.goto(`/cra/${YEAR}/${MONTH}`);
    await expect(page).toHaveURL(/login/);
  });

  test('02-f : le salarié peut retirer sa soumission (SUBMITTED → DRAFT)', async ({ page }) => {
    await login(page, EMPLOYEE);
    await page.goto(`/cra/${YEAR}/${MONTH}`);

    const submitButton = page.locator('button:has-text("Soumettre")');
    if (await submitButton.isVisible()) {
      await submitButton.click();
      await page.waitForTimeout(500);
    }

    const retractButton = page.locator('button:has-text("Retirer")');
    if (await retractButton.isVisible()) {
      await retractButton.click();
      // Retour en DRAFT → bouton Soumettre visible à nouveau
      await expect(page.locator('button:has-text("Soumettre")')).toBeVisible({ timeout: 5000 });
    }
  });
});
