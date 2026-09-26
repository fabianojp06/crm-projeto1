import { admin, exigirSupabaseLocal } from './helpers';

// Duas etapas: primeiro coleta todos os ids e só depois apaga.
// Apagar durante a paginação faria usuários pularem de página e escaparem da limpeza.
export default async function globalTeardown() {
  // A limpeza é por prefixo de e-mail e usa a service role: apontada para um Supabase
  // hospedado por engano, apagaria contas de verdade. Melhor falhar do que apagar.
  exigirSupabaseLocal();

  const ids: string[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    if (data.users.length === 0) break;
    for (const u of data.users) if (u.email?.startsWith('e2e+')) ids.push(u.id);
  }
  for (const id of ids) await admin.auth.admin.deleteUser(id);
}
