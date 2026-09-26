'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { CLIENTE_NAO_EXISTE, lerCampos, ESTADO_SESSAO_EXPIRADA, type EstadoForm } from '@/lib/acoes';
import { clienteSchema, errosDeCampo } from '@/lib/schemas';
import { createClient, obterUsuario } from '@/lib/supabase/server';

function revalidar() {
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/clientes');
  revalidatePath('/dashboard/funil');
}

export async function salvarCliente(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  if (!(await obterUsuario())) return ESTADO_SESSAO_EXPIRADA;
  const valores = lerCampos(fd, ['id', 'nome', 'email', 'telefone', 'empresa']);
  const r = clienteSchema.safeParse(valores);
  if (!r.success) return { ok: false, erros: errosDeCampo(r.error), valores };

  const supabase = await createClient();
  if (valores.id) {
    // .select() para saber quantas linhas foram afetadas: o PostgREST devolve
    // error null quando o update não casa nada, e aí "salvo" seria mentira.
    const { data, error } = await supabase
      .from('clientes')
      .update(r.data)
      .eq('id', valores.id)
      .select('id');
    if (error) return { ok: false, mensagem: 'Não foi possível salvar o cliente', valores };
    if (!data?.length) return { ok: false, mensagem: CLIENTE_NAO_EXISTE, valores };
  } else {
    const { error } = await supabase.from('clientes').insert(r.data);
    if (error) return { ok: false, mensagem: 'Não foi possível salvar o cliente', valores };
  }

  revalidar();
  return { ok: true };
}

export async function excluirCliente(id: string): Promise<EstadoForm> {
  if (!(await obterUsuario())) return ESTADO_SESSAO_EXPIRADA;
  // Server Action é um endpoint HTTP público: valide o argumento, como moverNegocio faz.
  if (!z.uuid().safeParse(id).success) return { ok: false, mensagem: 'Não foi possível excluir o cliente' };
  const supabase = await createClient();
  const { data, error } = await supabase.from('clientes').delete().eq('id', id).select('id');
  if (error) return { ok: false, mensagem: 'Não foi possível excluir o cliente' };
  if (!data?.length) return { ok: false, mensagem: CLIENTE_NAO_EXISTE };
  revalidar();
  return { ok: true };
}
