import { expect, test } from '@playwright/test';
import { estado } from './helpers';

test.use({ storageState: estado('a') });

test('erro de validação mantém o que foi digitado', async ({ page }) => {
  await page.goto('/dashboard/clientes');
  await page.getByRole('button', { name: 'Novo cliente' }).click();
  const dialogo = page.getByRole('dialog');
  await dialogo.getByLabel('Nome').fill('Nome Preservado');
  await dialogo.getByLabel('E-mail').fill('invalido@');
  await dialogo.getByRole('button', { name: 'Salvar' }).click();

  await expect(dialogo.getByText('E-mail inválido')).toBeVisible();
  await expect(dialogo.getByLabel('Nome')).toHaveValue('Nome Preservado');
});

test('cria cliente e negócio, move o negócio e a mudança persiste', async ({ page }) => {
  const sufixo = Date.now();
  const nomeCliente = `Cliente ${sufixo}`;
  const titulo = `Negócio ${sufixo}`;

  await page.goto('/dashboard/clientes');
  await page.getByRole('button', { name: 'Novo cliente' }).click();
  const dialogo = page.getByRole('dialog');
  await dialogo.getByLabel('Nome').fill(nomeCliente);
  await dialogo.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('cell', { name: nomeCliente })).toBeVisible();

  await page.goto('/dashboard/funil');
  await page.getByRole('button', { name: 'Novo negócio' }).click();
  await dialogo.getByLabel('Título').fill(titulo);
  await dialogo.getByLabel('Valor').fill('1.500,50');
  await expect(dialogo.getByText(/^=\sR\$\s1\.500,50$/)).toBeVisible(); // \s cobre o espaço não separável
  await dialogo.getByLabel('Cliente').selectOption({ label: nomeCliente });
  await dialogo.getByRole('button', { name: 'Salvar' }).click();
  await expect(dialogo).toBeHidden();

  const contato = page.getByTestId('coluna-contato');
  const proposta = page.getByTestId('coluna-proposta');
  await expect(contato.getByText(titulo)).toBeVisible();

  // arrastar pela alça (só ela tem os listeners do dnd-kit), em passos, para o dnd-kit
  // reconhecer o movimento
  const alca = contato.getByRole('button', { name: `Arrastar ${titulo}` });
  const alvo = (await proposta.boundingBox())!;
  await alca.hover();
  await page.mouse.down();
  await page.mouse.move(alvo.x + alvo.width / 2, alvo.y + alvo.height / 2, { steps: 15 });
  const gravacao = page.waitForResponse(
    (r) => r.request().method() === 'POST' && r.url().includes('/dashboard/funil'),
  );
  await page.mouse.up();
  await gravacao;

  await page.reload();
  await expect(proposta.getByText(titulo)).toBeVisible();
  await expect(contato.getByText(titulo)).toHaveCount(0);
});
