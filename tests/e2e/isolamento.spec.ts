import { expect, test } from '@playwright/test';
import { admin, clienteAnonimo, estado, lerUsuarios, SENHA, URL_BASE } from './helpers';

test('B não vê o cliente de A e o banco recusa ligar negócio a ele', async ({ browser }) => {
  const usuarios = lerUsuarios();
  const nome = `Cliente de A ${Date.now()}`;

  const ctxA = await browser.newContext({ storageState: estado('a') });
  const pageA = await ctxA.newPage();
  await pageA.goto(`${URL_BASE}/dashboard/clientes`);
  await pageA.getByRole('button', { name: 'Novo cliente' }).click();
  await pageA.getByRole('dialog').getByLabel('Nome').fill(nome);
  await pageA.getByRole('dialog').getByRole('button', { name: 'Salvar' }).click();
  await expect(pageA.getByRole('cell', { name: nome })).toBeVisible();
  await ctxA.close();

  const ctxB = await browser.newContext({ storageState: estado('b') });
  const pageB = await ctxB.newPage();
  await pageB.goto(`${URL_BASE}/dashboard/clientes?q=${encodeURIComponent('Cliente de A')}`);
  await expect(pageB.getByRole('heading', { name: 'Clientes' })).toBeVisible();
  await expect(pageB.getByText(nome)).toHaveCount(0);
  await ctxB.close();

  // A tela de B nunca oferece o cliente de A, então testamos direto no banco com a sessão de B.
  const { data: doA } = await admin.from('clientes').select('id').eq('nome', nome).single();
  const b = clienteAnonimo();
  const login = await b.auth.signInWithPassword({ email: usuarios.b.email, password: SENHA });
  expect(login.error).toBeNull();

  const { data, error } = await b
    .from('negocios')
    .insert({ cliente_id: doA!.id, titulo: 'Invasão', valor: 1, etapa: 'contato', posicao: 0 })
    .select();
  expect(error?.code).toBe('23503');
  expect(data).toBeNull();

  const { count } = await admin
    .from('negocios')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', usuarios.b.id)
    .eq('titulo', 'Invasão');
  expect(count).toBe(0);
});
