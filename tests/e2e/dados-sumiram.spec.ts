import { expect, test } from '@playwright/test';
import { admin, estado } from './helpers';

test.use({ storageState: estado('a') });

// Escrever numa linha que sumiu tem de avisar, nunca dizer "salvo".
// O mover_negocio já faz isso (P0002); o CRUD precisa fazer igual.

test('editar um cliente apagado em outra aba avisa, em vez de dizer que salvou', async ({ page }) => {
  const nome = `Some Cliente ${Date.now()}`;

  await page.goto('/dashboard/clientes');
  await page.getByRole('button', { name: 'Novo cliente' }).click();
  const dialogo = page.getByRole('dialog');
  await dialogo.getByLabel('Nome').fill(nome);
  await dialogo.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('cell', { name: nome })).toBeVisible();

  // Abre a edição e, com o modal aberto, a linha some (a "outra aba").
  await page.getByRole('row', { name: nome }).getByRole('button', { name: 'Editar' }).click();
  await expect(dialogo.getByLabel('Nome')).toHaveValue(nome);
  const { error } = await admin.from('clientes').delete().eq('nome', nome);
  expect(error).toBeNull();

  await dialogo.getByLabel('Nome').fill(`${nome} editado`);
  await dialogo.getByRole('button', { name: 'Salvar' }).click();

  await expect(dialogo.getByText('Este cliente não existe mais')).toBeVisible();
  await expect(page.getByText('Cliente salvo')).toHaveCount(0);
});

test('excluir um negócio já apagado em outra aba avisa, em vez de dizer que excluiu', async ({ page }) => {
  const sufixo = Date.now();
  const nomeCliente = `Cliente Some ${sufixo}`;
  const titulo = `Negócio Some ${sufixo}`;

  await page.goto('/dashboard/clientes');
  await page.getByRole('button', { name: 'Novo cliente' }).click();
  const dialogo = page.getByRole('dialog');
  await dialogo.getByLabel('Nome').fill(nomeCliente);
  await dialogo.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByRole('cell', { name: nomeCliente })).toBeVisible();

  await page.goto('/dashboard/funil');
  await page.getByRole('button', { name: 'Novo negócio' }).click();
  await dialogo.getByLabel('Título').fill(titulo);
  await dialogo.getByLabel('Valor').fill('100');
  await dialogo.getByLabel('Cliente').selectOption({ label: nomeCliente });
  await dialogo.getByRole('button', { name: 'Salvar' }).click();
  await expect(dialogo).toBeHidden();

  // Abre o card e, com o modal aberto, o negócio some.
  // A alça se chama "Arrastar <titulo>"; o corpo do card começa pelo próprio título.
  await page.getByTestId('coluna-contato').getByRole('button', { name: new RegExp(`^${titulo}`) }).click();
  await expect(dialogo.getByLabel('Título')).toHaveValue(titulo);
  const { error } = await admin.from('negocios').delete().eq('titulo', titulo);
  expect(error).toBeNull();

  await dialogo.getByRole('button', { name: 'Excluir' }).first().click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir' }).click();

  await expect(page.getByText('Este negócio não existe mais')).toBeVisible();
  await expect(page.getByText('Negócio excluído')).toHaveCount(0);
});
