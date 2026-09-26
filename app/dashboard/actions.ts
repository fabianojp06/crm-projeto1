'use server';

import { revalidatePath } from 'next/cache';
import { ESTADO_SESSAO_EXPIRADA, type EstadoForm } from '@/lib/acoes';
import { createClient, obterUsuario } from '@/lib/supabase/server';

export async function gerarDadosExemplo(): Promise<EstadoForm> {
  if (!(await obterUsuario())) return ESTADO_SESSAO_EXPIRADA;
  const supabase = await createClient();
  const { error } = await supabase.rpc('gerar_dados_exemplo');
  if (error) return { ok: false, mensagem: 'Não foi possível gerar os dados de exemplo' };
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/clientes');
  revalidatePath('/dashboard/funil');
  return { ok: true };
}
