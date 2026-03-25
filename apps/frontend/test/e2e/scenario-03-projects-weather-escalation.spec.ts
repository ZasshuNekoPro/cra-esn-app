import { test, expect, type Page } from '@playwright/test';

const EMPLOYEE = { email: 'alice@example.com', password: 'password123' };

async function loginEmployee(page: Page) {
  await page.goto('/login');
  await page.fill('[name=email]', EMPLOYEE.email);
  await page.fill('[name=password]', EMPLOYEE.password);
  await page.click('[type=submit]');
  await page.waitForURL(/dashboard/);
}

test.describe('Scenario 03 — Météo projet et gestion des états', () => {
  test.beforeEach(async ({ page }) => {
    await loginEmployee(page);
  });

  test('03-a : afficher la liste des projets', async ({ page }) => {
    await page.goto('/projects');
    await expect(page.locator('body')).not.toContainText('500');
    // Au moins un projet doit être affiché (seed: "Module Congés")
    await expect(page.locator('a[href*="/projects/"]').first()).toBeVisible();
  });

  test('03-b : afficher le détail d\'un projet avec la météo', async ({ page }) => {
    await page.goto('/projects');
    const firstProject = page.locator('a[href*="/projects/"]').first();
    await firstProject.click();
    await page.waitForURL(/\/projects\/[a-z0-9-]+$/);

    await expect(page.locator('h1, h2').first()).toBeVisible();
    await expect(page.locator('body')).toContainText(/météo|weather/i);
  });

  test('03-c : saisir une météo SUNNY', async ({ page }) => {
    await page.goto('/projects');
    const firstProject = page.locator('a[href*="/projects/"]').first();
    await firstProject.click();
    await page.waitForURL(/\/projects\/[a-z0-9-]+$/);

    const weatherButton = page.locator('button:has-text("Saisir météo")');
    await expect(weatherButton).toBeVisible();
    await weatherButton.click();

    await expect(page.locator('button:has-text("Ensoleillé")')).toBeVisible();
    await page.click('button:has-text("Ensoleillé")');
    await page.click('button:has-text("Enregistrer")');

    await expect(page.locator('body')).not.toContainText('Erreur inattendue');
  });

  test('03-d : saisir une météo RAINY avec commentaire obligatoire', async ({ page }) => {
    await page.goto('/projects');
    const firstProject = page.locator('a[href*="/projects/"]').first();
    await firstProject.click();
    await page.waitForURL(/\/projects\/[a-z0-9-]+$/);

    const weatherButton = page.locator('button:has-text("Saisir météo")');
    await expect(weatherButton).toBeVisible();
    await weatherButton.click();

    await page.click('button:has-text("Pluvieux")');

    // Le champ commentaire doit devenir visible/obligatoire pour RAINY
    const commentField = page.locator('textarea');
    await expect(commentField).toBeVisible();
    await commentField.fill('Blocage sur la livraison V2 — attente validation client');

    await page.click('button:has-text("Enregistrer")');
    await expect(page.locator('body')).not.toContainText('Erreur inattendue');
  });

  test('03-e : saisir une météo STORM avec commentaire', async ({ page }) => {
    await page.goto('/projects');
    const firstProject = page.locator('a[href*="/projects/"]').first();
    await firstProject.click();
    await page.waitForURL(/\/projects\/[a-z0-9-]+$/);

    const weatherButton = page.locator('button:has-text("Saisir météo")');
    await expect(weatherButton).toBeVisible();
    await weatherButton.click();

    await page.click('button:has-text("Orageux")');

    const commentField = page.locator('textarea');
    await expect(commentField).toBeVisible();
    await commentField.fill('Alerte critique : dépendance bloquante non résolue depuis 5 jours');

    await page.click('button:has-text("Enregistrer")');
    await expect(page.locator('body')).not.toContainText('Erreur inattendue');
  });

  test('03-f : RAINY sans commentaire → validation bloquée', async ({ page }) => {
    await page.goto('/projects');
    const firstProject = page.locator('a[href*="/projects/"]').first();
    await firstProject.click();
    await page.waitForURL(/\/projects\/[a-z0-9-]+$/);

    const weatherButton = page.locator('button:has-text("Saisir météo")');
    await expect(weatherButton).toBeVisible();
    await weatherButton.click();

    await page.click('button:has-text("Pluvieux")');

    // Tenter d'enregistrer sans commentaire
    await page.click('button:has-text("Enregistrer")');

    // Le formulaire doit rester visible (erreur de validation ou champ requis)
    await expect(page.locator('button:has-text("Enregistrer")')).toBeVisible();
  });

  test('03-g : ajouter un commentaire de projet', async ({ page }) => {
    await page.goto('/projects');
    const firstProject = page.locator('a[href*="/projects/"]').first();
    await firstProject.click();
    await page.waitForURL(/\/projects\/[a-z0-9-]+$/);

    const commentTextarea = page.locator('textarea').last();
    await expect(commentTextarea).toBeVisible();
    await commentTextarea.fill('Avancement nominal cette semaine, RAS.');

    await page.click('button:has-text("Publier")');
    await expect(page.locator('body')).toContainText('Avancement nominal cette semaine');
  });

  test('03-h : afficher la présentation du projet', async ({ page }) => {
    await page.goto('/projects');
    const firstProject = page.locator('a[href*="/projects/"]').first();
    const href = await firstProject.getAttribute('href');
    if (href) {
      await page.goto(`${href}/presentation`);
      await expect(page.locator('body')).not.toContainText('500');
      await expect(page.locator('body')).toContainText(/projet|mission|jalon/i);
    }
  });
});
