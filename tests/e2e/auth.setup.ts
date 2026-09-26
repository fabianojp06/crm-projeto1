import { test as setup } from '@playwright/test';
import {
  admin, emailUnico, entrarPelaTela, estado, exigirSupabaseLocal, salvarUsuarios, SENHA,
  type UsuarioTeste,
} from './helpers';

async function criar(nome: string): Promise<UsuarioTeste> {
  const email = emailUnico(nome);
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: SENHA,
    email_confirm: true, // a API de admin não confirma sozinha
    user_metadata: { nome: `Usuário ${nome}` },
  });
  if (error) throw error;
  return { id: data.user.id, email };
}

setup('cria os usuários A e B e salva as sessões', async ({ browser }) => {
  exigirSupabaseLocal();
  const usuarios = { a: await criar('A'), b: await criar('B') };
  salvarUsuarios(usuarios);
  for (const quem of ['a', 'b'] as const) {
    const contexto = await browser.newContext();
    const page = await contexto.newPage();
    await entrarPelaTela(page, usuarios[quem].email);
    await contexto.storageState({ path: estado(quem) });
    await contexto.close();
  }
});
