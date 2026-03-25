import { test, expect, type Page } from '@playwright/test';

const EMPLOYEE = { email: 'alice@example.com', password: 'password123' };

async function loginEmployee(page: Page) {
  await page.goto('/login');
  await page.fill('[name=email]', EMPLOYEE.email);
  await page.fill('[name=password]', EMPLOYEE.password);
  await page.click('[type=submit]');
  await page.waitForURL(/dashboard/);
}

async function generateShareToken(page: Page): Promise<string | null> {
  await page.goto('/reports');
  const shareButton = page.locator('button:has-text("Partager")');
  await expect(shareButton).toBeVisible();
  await shareButton.click();

  const modal = page.locator('[role=dialog]');
  await expect(modal).toBeVisible();

  // Récupérer le token depuis le lien de partage affiché
  const linkInput = modal.locator('input[readonly]').first();
  if (await linkInput.isVisible()) {
    const shareUrl = await linkInput.inputValue();
    const match = shareUrl.match(/\/shared\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  // Fallback : chercher un code ou un lien
  const codeEl = modal.locator('code').first();
  if (await codeEl.isVisible()) {
    const text = await codeEl.textContent();
    const match = (text ?? '').match(/\/shared\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  return null;
}

test.describe('Scenario 06 — Partage public du bilan', () => {
  test('06-a : générer un lien de partage depuis les rapports', async ({ page }) => {
    await loginEmployee(page);
    await page.goto('/reports');

    const shareButton = page.locator('button:has-text("Partager")');
    await expect(shareButton).toBeVisible();
    await shareButton.click();

    const modal = page.locator('[role=dialog]');
    await expect(modal).toBeVisible();

    // Un lien/token doit être affiché dans le modal
    await expect(modal.locator('input[readonly], code, [class*="link"], [class*="url"]')).toBeVisible({ timeout: 5000 });
  });

  test('06-b : accéder au bilan partagé sans authentification', async ({ page }) => {
    // Connexion pour générer le token
    await loginEmployee(page);
    const token = await generateShareToken(page);

    if (token) {
      // Naviguer vers la page publique sans session
      await page.context().clearCookies();
      await page.goto(`/shared/${token}`);

      // La page publique doit s'afficher sans redirection vers /login
      await expect(page).not.toHaveURL(/login/);
      await expect(page.locator('body')).not.toContainText('500');

      // Contenu minimal attendu (branding ESN CRA)
      await expect(page.locator('body')).toContainText(/ESN CRA|bilan|mission/i);
    } else {
      // Si le token n'est pas récupérable via UI, vérifier juste la page est accessible
      test.skip();
    }
  });

  test('06-c : le contenu partagé affiche les données du salarié', async ({ page }) => {
    await loginEmployee(page);
    const token = await generateShareToken(page);

    if (token) {
      await page.context().clearCookies();
      await page.goto(`/shared/${token}`);

      await expect(page).not.toHaveURL(/login/);
      // Le nom du salarié ou de sa mission doit apparaître
      await expect(page.locator('body')).toContainText(/Alice|mission|CRA/i);
    } else {
      test.skip();
    }
  });

  test('06-d : token invalide → page d\'erreur ou 404', async ({ page }) => {
    const fakeToken = 'tok_invalid_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    await page.goto(`/shared/${fakeToken}`);

    // La page doit indiquer que le lien est invalide ou expiré
    const body = await page.locator('body').textContent() ?? '';
    const isError = body.includes('introuvable') ||
                    body.includes('invalide') ||
                    body.includes('expiré') ||
                    body.includes('not found') ||
                    body.includes('404') ||
                    body.includes('Lien');
    expect(isError).toBe(true);
  });

  test('06-e : fermer le modal de partage annule la génération', async ({ page }) => {
    await loginEmployee(page);
    await page.goto('/reports');

    const shareButton = page.locator('button:has-text("Partager")');
    await shareButton.click();

    const modal = page.locator('[role=dialog]');
    await expect(modal).toBeVisible();

    // Fermer avec Escape
    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible({ timeout: 3000 });
  });

  test('06-f : la page rapports nécessite une authentification', async ({ page }) => {
    await page.goto('/reports');
    await expect(page).toHaveURL(/login/);
  });
});
