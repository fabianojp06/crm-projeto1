import { afterAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { apagarUsuario, novoCliente, novoNegocio, novoUsuario } from './helpers';

const criados: string[] = [];
async function usuario() {
  const u = await novoUsuario();
  criados.push(u.id);
  return u;
}
afterAll(async () => {
  for (const id of criados) await apagarUsuario(id);
});

async function coluna(cliente: SupabaseClient, etapa: string) {
  const { data } = await cliente
    .from('negocios')
    .select('id, posicao')
    .eq('etapa', etapa)
    .order('posicao')
    .order('created_at')
    .order('id');
  return data ?? [];
}

describe('mover_negocio', () => {
  it('muda a etapa e renumera a coluna de destino na ordem recebida', async () => {
    const { cliente } = await usuario();
    const c = await novoCliente(cliente);
    const x = await novoNegocio(cliente, { cliente_id: c, etapa: 'contato', posicao: 0 });
    const p1 = await novoNegocio(cliente, { cliente_id: c, etapa: 'proposta', posicao: 0 });
    const p2 = await novoNegocio(cliente, { cliente_id: c, etapa: 'proposta', posicao: 1 });

    const { error } = await cliente.rpc('mover_negocio', {
      p_id: x, p_etapa: 'proposta', p_ids: [p1, x, p2],
    });
    expect(error).toBeNull();
    expect(await coluna(cliente, 'proposta')).toEqual([
      { id: p1, posicao: 0 }, { id: x, posicao: 1 }, { id: p2, posicao: 2 },
    ]);
    expect(await coluna(cliente, 'contato')).toEqual([]);
  });

  it('coluna vazia: o card fica na posição 0', async () => {
    const { cliente } = await usuario();
    const c = await novoCliente(cliente);
    const x = await novoNegocio(cliente, { cliente_id: c, etapa: 'contato', posicao: 5 });
    await cliente.rpc('mover_negocio', { p_id: x, p_etapa: 'fechado', p_ids: [x] });
    expect(await coluna(cliente, 'fechado')).toEqual([{ id: x, posicao: 0 }]);
  });

  it('deduplica a lista, ignora ids de outra coluna e põe os que faltam no fim', async () => {
    const { cliente } = await usuario();
    const c = await novoCliente(cliente);
    const x = await novoNegocio(cliente, { cliente_id: c, etapa: 'proposta', posicao: 0 });
    const y = await novoNegocio(cliente, { cliente_id: c, etapa: 'proposta', posicao: 1 });
    const novo = await novoNegocio(cliente, { cliente_id: c, etapa: 'proposta', posicao: 0 });
    const outra = await novoNegocio(cliente, { cliente_id: c, etapa: 'perdido', posicao: 7 });

    // Lista desatualizada: y repetido, "outra" é de outra coluna, "novo" ficou de fora.
    await cliente.rpc('mover_negocio', { p_id: y, p_etapa: 'proposta', p_ids: [y, outra, x, y] });

    expect(await coluna(cliente, 'proposta')).toEqual([
      { id: y, posicao: 0 }, { id: x, posicao: 1 }, { id: novo, posicao: 2 },
    ]);
    expect(await coluna(cliente, 'perdido')).toEqual([{ id: outra, posicao: 7 }]);
  });

  it('negócio inexistente ou de outro usuário devolve P0002', async () => {
    const a = await usuario();
    const b = await usuario();
    const c = await novoCliente(a.cliente);
    const deA = await novoNegocio(a.cliente, { cliente_id: c, etapa: 'contato', posicao: 0 });

    const r = await b.cliente.rpc('mover_negocio', { p_id: deA, p_etapa: 'fechado', p_ids: [deA] });
    expect(r.error?.code).toBe('P0002');
    expect(await coluna(a.cliente, 'contato')).toEqual([{ id: deA, posicao: 0 }]);
  });
});

describe('gerar_dados_exemplo', () => {
  it('cria 10 clientes e 15 negócios com posições 0..n-1 por etapa', async () => {
    const { cliente } = await usuario();
    const { error } = await cliente.rpc('gerar_dados_exemplo');
    expect(error).toBeNull();

    const clientes = await cliente.from('clientes').select('id');
    const negocios = await cliente.from('negocios').select('etapa, posicao');
    expect(clientes.data).toHaveLength(10);
    expect(negocios.data).toHaveLength(15);

    const porEtapa = new Map<string, number[]>();
    for (const n of negocios.data ?? []) {
      porEtapa.set(n.etapa, [...(porEtapa.get(n.etapa) ?? []), n.posicao]);
    }
    expect(porEtapa.size).toBe(5);
    for (const posicoes of porEtapa.values()) {
      expect([...posicoes].sort((p, q) => p - q)).toEqual(posicoes.map((_, i) => i));
    }
  });

  it('não faz nada se a conta já tem clientes, nem com chamadas simultâneas', async () => {
    const { cliente } = await usuario();
    await Promise.all([cliente.rpc('gerar_dados_exemplo'), cliente.rpc('gerar_dados_exemplo')]);
    await cliente.rpc('gerar_dados_exemplo');
    const { data } = await cliente.from('clientes').select('id');
    expect(data).toHaveLength(10);
  });
});
