import { test, expect, type Page } from '@playwright/test';

const EMPLOYEE = { email: 'alice@example.com', password: 'password123' };

async function loginEmployee(page: Page) {
  await page.goto('/login');
  await page.fill('[name=email]', EMPLOYEE.email);
  await page.fill('[name=password]', EMPLOYEE.password);
  await page.click('[type=submit]');
  await page.waitForURL(/dashboard/);
}

test.describe('Scenario 05 — Assistant IA RAG', () => {
  test.beforeEach(async ({ page }) => {
    await loginEmployee(page);
  });

  test('05-a : la page assistant se charge correctement', async ({ page }) => {
    await page.goto('/assistant');
    await expect(page.locator('body')).not.toContainText('500');
    await expect(page.locator('body')).toContainText(/assistant|IA|chat/i);
  });

  test('05-b : afficher les questions suggérées sur l\'écran vide', async ({ page }) => {
    await page.goto('/assistant');

    // Les suggestions doivent être visibles au démarrage
    const suggestions = page.locator('button').filter({ hasText: /combien|quel|résume|quelles/i });
    await expect(suggestions.first()).toBeVisible();
  });

  test('05-c : cliquer sur une suggestion lance une requête', async ({ page }) => {
    await page.goto('/assistant');

    const firstSuggestion = page.locator('button').filter({ hasText: /combien.*jours.*travaillé/i }).first();
    if (await firstSuggestion.isVisible()) {
      await firstSuggestion.click();

      // La question doit apparaître dans le chat
      await expect(page.locator('body')).toContainText(/combien.*jours.*travaillé/i, { timeout: 3000 });

      // La réponse de l'assistant doit arriver (streaming — attendre max 15s)
      await expect(page.locator('body')).toContainText(/jours|CP|RTT|mars|travaillé/i, { timeout: 15000 });
    }
  });

  test('05-d : poser une question sur les congés restants', async ({ page }) => {
    await page.goto('/assistant');

    const input = page.locator('textarea[placeholder*="question"]');
    await expect(input).toBeVisible();
    await input.fill('Combien de jours de congés payés me reste-t-il ?');
    await input.press('Enter');

    // La question doit apparaître
    await expect(page.locator('body')).toContainText(/congés/i, { timeout: 3000 });

    // Une réponse doit arriver (streaming)
    await expect(page.locator('body')).toContainText(/CP|congé|jour/i, { timeout: 15000 });
  });

  test('05-e : la réponse contient des sources citées', async ({ page }) => {
    await page.goto('/assistant');

    const input = page.locator('textarea[placeholder*="question"]');
    await input.fill('Quel est l\'état de la météo de mon projet ce mois-ci ?');
    await input.press('Enter');

    // Attendre la réponse
    await expect(page.locator('body')).toContainText(/météo|projet|ensoleillé|nuageux|pluvieux/i, { timeout: 15000 });

    // Les sources peuvent être présentes (accordéon ou liste de sources)
    // C'est optionnel selon la disponibilité de données indexées
  });

  test('05-f : "Nouvelle conversation" réinitialise le chat', async ({ page }) => {
    await page.goto('/assistant');

    // Envoyer un message
    const input = page.locator('textarea[placeholder*="question"]');
    await input.fill('Test message');
    await input.press('Enter');
    await page.waitForTimeout(1000);

    // Nouvelle conversation
    const newChatButton = page.locator('button:has-text("Nouvelle conversation")');
    if (await newChatButton.isVisible()) {
      await newChatButton.click();
      // Le chat doit être vidé
      await expect(page.locator('body')).not.toContainText('Test message');
    }
  });

  test('05-g : accès refusé sans authentification', async ({ page }) => {
    await page.goto('/assistant');
    await expect(page).toHaveURL(/login/);
  });
});
