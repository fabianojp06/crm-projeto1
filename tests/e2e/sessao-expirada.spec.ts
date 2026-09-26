import { expect, test } from '@playwright/test';
import { estado } from './helpers';

test.use({ storageState: estado('a') });

// Quando a sessão cai com a página aberta, a pessoa não pode ficar presa
// tomando toast a cada clique: ela tem de ser levada ao login.
test('sessão perdida com a página aberta leva ao login, não só um toast', async ({ page, context }) => {
  await page.goto('/dashboard/clientes');
  await expect(page.getByRole('heading', { name: 'Clientes' })).toBeVisible();

  // A sessão cai enquanto a página segue aberta.
  await context.clearCookies();

  await page.getByRole('button', { name: 'Novo cliente' }).click();
  const dialogo = page.getByRole('dialog');
  await dialogo.getByLabel('Nome').fill('Não deve salvar');
  await dialogo.getByRole('button', { name: 'Salvar' }).click();

  await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 });
});
