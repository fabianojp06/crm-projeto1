import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const opcoes = { auth: { persistSession: false, autoRefreshToken: false } };

export const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, opcoes);

export const SENHA = 'senha-teste-123';

export async function novoUsuario(metadata: Record<string, unknown> = { nome: 'Pessoa Teste' }) {
  const email = `e2e+db-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@exemplo.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: SENHA,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) throw error;
  const cliente = createClient(url, publishable, opcoes);
  const login = await cliente.auth.signInWithPassword({ email, password: SENHA });
  if (login.error) throw login.error;
  return { id: data.user.id, email, cliente };
}

export async function apagarUsuario(id: string) {
  await admin.auth.admin.deleteUser(id);
}

export async function novoCliente(cliente: SupabaseClient, nome = 'Cliente Teste') {
  const { data, error } = await cliente.from('clientes').insert({ nome }).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function novoNegocio(
  cliente: SupabaseClient,
  n: { cliente_id: string; etapa: string; posicao: number; titulo?: string; valor?: number },
) {
  const { data, error } = await cliente
    .from('negocios')
    .insert({ titulo: 'Negócio', valor: 100, ...n })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}
