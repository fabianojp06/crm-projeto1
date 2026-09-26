import { afterAll, describe, expect, it } from 'vitest';
import { admin, apagarUsuario, novoCliente, novoNegocio, novoUsuario } from './helpers';

const criados: string[] = [];
async function usuario(metadata?: Record<string, unknown>) {
  const u = await novoUsuario(metadata);
  criados.push(u.id);
  return u;
}
afterAll(async () => {
  for (const id of criados) await apagarUsuario(id);
});

describe('trigger de perfil', () => {
  it('usa o nome do metadado', async () => {
    const u = await usuario({ nome: 'Ana Souza' });
    const { data } = await u.cliente.from('profiles').select('nome').single();
    expect(data?.nome).toBe('Ana Souza');
  });

  it('nome em branco ou ausente vira o começo do e-mail', async () => {
    const branco = await usuario({ nome: '   ' });
    const semNome = await usuario({});
    const p1 = await branco.cliente.from('profiles').select('nome').single();
    const p2 = await semNome.cliente.from('profiles').select('nome').single();
    expect(p1.data?.nome).toBe(branco.email.split('@')[0]);
    expect(p2.data?.nome).toBe(semNome.email.split('@')[0]);
  });
});

describe('isolamento por usuário (RLS)', () => {
  it('B não lê nem altera clientes de A', async () => {
    const a = await usuario();
    const b = await usuario();
    const idA = await novoCliente(a.cliente, 'Secreto de A');

    const leitura = await b.cliente.from('clientes').select('id').eq('id', idA);
    expect(leitura.data).toEqual([]);

    const alteracao = await b.cliente.from('clientes').update({ nome: 'hack' }).eq('id', idA).select();
    expect(alteracao.data).toEqual([]);

    const { data } = await admin.from('clientes').select('nome').eq('id', idA).single();
    expect(data?.nome).toBe('Secreto de A');
  });

  it('B não consegue ligar um negócio ao cliente de A (FK composta)', async () => {
    const a = await usuario();
    const b = await usuario();
    const idA = await novoCliente(a.cliente);
    const { data, error } = await b.cliente
      .from('negocios')
      .insert({ cliente_id: idA, titulo: 'Invasão', valor: 1, etapa: 'contato', posicao: 0 })
      .select();
    expect(error?.code).toBe('23503');
    expect(data).toBeNull();
  });

  it('user_id é preenchido pelo banco', async () => {
    const a = await usuario();
    const id = await novoCliente(a.cliente);
    const { data } = await admin.from('clientes').select('user_id').eq('id', id).single();
    expect(data?.user_id).toBe(a.id);
  });
});

describe('regras das tabelas', () => {
  it('excluir cliente apaga os negócios dele', async () => {
    const a = await usuario();
    const c = await novoCliente(a.cliente);
    const n = await novoNegocio(a.cliente, { cliente_id: c, etapa: 'contato', posicao: 0 });
    await a.cliente.from('clientes').delete().eq('id', c);
    const { data } = await admin.from('negocios').select('id').eq('id', n);
    expect(data).toEqual([]);
  });

  it('rejeita valor negativo e etapa desconhecida', async () => {
    const a = await usuario();
    const c = await novoCliente(a.cliente);
    const negativo = await a.cliente
      .from('negocios')
      .insert({ cliente_id: c, titulo: 'x', valor: -1, etapa: 'contato', posicao: 0 });
    const etapa = await a.cliente
      .from('negocios')
      .insert({ cliente_id: c, titulo: 'x', valor: 1, etapa: 'ganho', posicao: 0 });
    expect(negativo.error?.code).toBe('23514');
    expect(etapa.error?.code).toBe('23514');
  });

  it('excluir o usuário apaga perfil, clientes e negócios', async () => {
    const a = await novoUsuario();
    const c = await novoCliente(a.cliente);
    await novoNegocio(a.cliente, { cliente_id: c, etapa: 'contato', posicao: 0 });
    await apagarUsuario(a.id);
    const perfis = await admin.from('profiles').select('id').eq('id', a.id);
    const clientes = await admin.from('clientes').select('id').eq('user_id', a.id);
    const negocios = await admin.from('negocios').select('id').eq('user_id', a.id);
    expect([perfis.data, clientes.data, negocios.data]).toEqual([[], [], []]);
  });
});
