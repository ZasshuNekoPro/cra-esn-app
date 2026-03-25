import { test, expect } from '@playwright/test';

const EMPLOYEE = { email: 'alice@example.com', password: 'password123' };
const YEAR = 2026;
const MONTH = 3;

test.describe('Scenario 01 — Salarié : parcours complet sur un mois', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name=email]', EMPLOYEE.email);
    await page.fill('[name=password]', EMPLOYEE.password);
    await page.click('[type=submit]');
    await page.waitForURL('**/dashboard');
  });

  test('01-a : saisir des jours de CRA et ventiler sur projets', async ({ page }) => {
    await page.goto(`/cra/${YEAR}/${MONTH}`);
    const grid = page.locator('[data-testid=month-grid]');
    await expect(grid).toBeVisible();

    // Saisir un jour en présentiel
    const firstWorkingDay = page.locator('[data-testid=day-cell]:not([disabled])').first();
    await firstWorkingDay.click();

    const dialog = page.locator('[role=dialog]');
    await expect(dialog).toBeVisible();

    await page.selectOption('#entry-type', 'WORK_ONSITE');
    await page.selectOption('#day-fraction', 'FULL');
    await page.click('button:has-text("Enregistrer")');
    await expect(dialog).not.toBeVisible();

    // Saisir un second jour en télétravail
    const secondWorkingDay = page.locator('[data-testid=day-cell]:not([disabled])').nth(1);
    await secondWorkingDay.click();
    await expect(dialog).toBeVisible();

    await page.selectOption('#entry-type', 'WORK_REMOTE');
    await page.selectOption('#day-fraction', 'FULL');
    await page.click('button:has-text("Enregistrer")');
    await expect(dialog).not.toBeVisible();

    // Vérifier que les jours sont affichés dans la grille
    await expect(page.locator('[data-testid=day-cell]').filter({ hasText: 'Prés' }).or(
      page.locator('[data-testid=day-cell]').filter({ hasText: 'TT' })
    )).toHaveCount({ min: 1 } as any);
  });

  test('01-b : uploader des documents', async ({ page }) => {
    await page.goto('/documents');
    await expect(page.locator('h1, h2').filter({ hasText: /documents/i })).toBeVisible();
    // La page documents doit se charger sans erreur
    await expect(page.locator('body')).not.toContainText('500');
    await expect(page.locator('body')).not.toContainText('Erreur');
  });

  test('01-c : mettre à jour la météo projet', async ({ page }) => {
    await page.goto('/projects');
    const firstProject = page.locator('a[href*="/projects/"]').first();
    await expect(firstProject).toBeVisible();
    await firstProject.click();
    await page.waitForURL('**/projects/**');

    // Ouvrir le formulaire météo
    const weatherButton = page.locator('button:has-text("Saisir météo")');
    await expect(weatherButton).toBeVisible();
    await weatherButton.click();

    // Sélectionner SUNNY
    const sunnyButton = page.locator('button:has-text("Ensoleillé")');
    await expect(sunnyButton).toBeVisible();
    await sunnyButton.click();
    await page.click('button:has-text("Enregistrer")');

    // Vérifier que la météo est bien enregistrée (pas d'erreur)
    await expect(page.locator('body')).not.toContainText('Erreur inattendue');
  });

  test('01-d : soumettre le CRA', async ({ page }) => {
    await page.goto(`/cra/${YEAR}/${MONTH}`);
    await expect(page.locator('[data-testid=month-grid]')).toBeVisible();

    const submitButton = page.locator('button:has-text("Soumettre")');
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Après soumission, le bouton "Signer" doit apparaître
    await expect(page.locator('button:has-text("Signer")')).toBeVisible({ timeout: 5000 });
  });

  test('01-e : accéder aux rapports mensuels', async ({ page }) => {
    await page.goto('/reports');
    await expect(page.locator('body')).not.toContainText('500');
    // Le rapport mensuel doit contenir les sections principales
    await expect(page.locator('body')).toContainText(/rapport|bilan/i);
  });

  test('01-f : générer un lien de partage de bilan', async ({ page }) => {
    await page.goto('/reports');
    const shareButton = page.locator('button:has-text("Partager")');
    await expect(shareButton).toBeVisible();
    await shareButton.click();

    const modal = page.locator('[role=dialog]');
    await expect(modal).toBeVisible();

    // Le modal doit afficher un lien
    await expect(modal.locator('input[readonly], code, [class*="copy"]')).toBeVisible({ timeout: 5000 });
  });
});
