'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { FALHA_MOVER, lerCampos, NEGOCIO_NAO_EXISTE, ESTADO_SESSAO_EXPIRADA, type EstadoForm } from '@/lib/acoes';
import type { Etapa } from '@/lib/etapas';
import { mensagemErroMover } from '@/lib/kanban';
import { errosDeCampo, moverSchema, negocioSchema } from '@/lib/schemas';
import { createClient, obterUsuario } from '@/lib/supabase/server';

function revalidar() {
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/clientes');
  revalidatePath('/dashboard/funil');
}

// Fim da coluna: coalesce(max(posicao), -1) + 1.
async function proximaPosicao(supabase: SupabaseClient, etapa: Etapa): Promise<number> {
  const { data } = await supabase
    .from('negocios')
    .select('posicao')
    .eq('etapa', etapa)
    .order('posicao', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? data.posicao + 1 : 0;
}

export async function salvarNegocio(_prev: EstadoForm, fd: FormData): Promise<EstadoForm> {
  if (!(await obterUsuario())) return ESTADO_SESSAO_EXPIRADA;
  const valores = lerCampos(fd, ['id', 'titulo', 'valor', 'cliente_id', 'etapa']);
  const r = negocioSchema.safeParse(valores);
  if (!r.success) return { ok: false, erros: errosDeCampo(r.error), valores };

  const supabase = await createClient();
  let erro: unknown = null;

  if (valores.id) {
    const { data: atual } = await supabase.from('negocios').select('etapa').eq('id', valores.id).maybeSingle();
    if (!atual) return { ok: false, mensagem: NEGOCIO_NAO_EXISTE, valores };
    // Mudou de etapa: vai para o fim da nova coluna. Senão, mantém a posição.
    const dados =
      atual.etapa === r.data.etapa
        ? r.data
        : { ...r.data, posicao: await proximaPosicao(supabase, r.data.etapa) };
    // .select() para saber quantas linhas casaram: sem isso, um negócio apagado em
    // outra aba faria o update afetar 0 linhas e mesmo assim dizer "salvo".
    const { data, error } = await supabase
      .from('negocios')
      .update(dados)
      .eq('id', valores.id)
      .select('id');
    if (!error && !data?.length) return { ok: false, mensagem: NEGOCIO_NAO_EXISTE, valores };
    erro = error;
  } else {
    const posicao = await proximaPosicao(supabase, r.data.etapa);
    ({ error: erro } = await supabase.from('negocios').insert({ ...r.data, posicao }));
  }
  if (erro) return { ok: false, mensagem: 'Não foi possível salvar o negócio', valores };

  revalidar();
  return { ok: true };
}

export async function excluirNegocio(id: string): Promise<EstadoForm> {
  if (!(await obterUsuario())) return ESTADO_SESSAO_EXPIRADA;
  if (!z.uuid().safeParse(id).success) return { ok: false, mensagem: NEGOCIO_NAO_EXISTE };
  const supabase = await createClient();
  const { data, error } = await supabase.from('negocios').delete().eq('id', id).select('id');
  if (error) return { ok: false, mensagem: 'Não foi possível excluir o negócio' };
  if (!data?.length) return { ok: false, mensagem: NEGOCIO_NAO_EXISTE };
  revalidar();
  return { ok: true };
}

export async function moverNegocio(id: string, etapa: Etapa, ids: string[]): Promise<EstadoForm> {
  if (!(await obterUsuario())) return ESTADO_SESSAO_EXPIRADA;
  const r = moverSchema.safeParse({ id, etapa, ids });
  if (!r.success) return { ok: false, mensagem: FALHA_MOVER };

  const supabase = await createClient();
  const { error } = await supabase.rpc('mover_negocio', {
    p_id: r.data.id,
    p_etapa: r.data.etapa,
    p_ids: r.data.ids,
  });
  // Decide pelo código do erro, nunca pelo texto.
  if (error) return { ok: false, mensagem: mensagemErroMover(error.code) };

  revalidar();
  return { ok: true };
}
