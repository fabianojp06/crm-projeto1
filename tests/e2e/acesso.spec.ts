import { expect, test } from '@playwright/test';
import { emailUnico, SENHA } from './helpers';

test('cadastro → dashboard → sair → volta para /login', async ({ page }) => {
  await page.goto('/cadastro');
  await page.getByLabel('Nome').fill('Pessoa Cadastro');
  await page.getByLabel('E-mail').fill(emailUnico('cadastro'));
  await page.getByLabel('Senha').fill(SENHA);
  await page.getByRole('button', { name: 'Criar conta' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Pessoa Cadastro')).toBeVisible();
  await expect(page.getByText('Seu CRM está vazio')).toBeVisible();

  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('sem sessão, o dashboard redireciona para /login', async ({ page }) => {
  for (const rota of ['/dashboard', '/dashboard/clientes', '/dashboard/funil', '/']) {
    await page.goto(rota);
    await expect(page).toHaveURL(/\/login$/);
  }
});
