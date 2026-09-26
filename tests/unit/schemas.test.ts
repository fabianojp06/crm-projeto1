import { describe, expect, it } from 'vitest';
import { lerCampos } from '@/lib/acoes';
import {
  cadastroSchema, clienteSchema, errosDeCampo, loginSchema, moverSchema, negocioSchema,
} from '@/lib/schemas';

const U1 = '3f1e9c2a-8b7d-4c1e-9a2b-1c2d3e4f5a6b';
const U2 = '7a6b5c4d-3e2f-4a1b-8c9d-0e1f2a3b4c5d';

describe('clienteSchema', () => {
  it('aceita só o nome e converte opcionais vazios em null', () => {
    const r = clienteSchema.parse({ nome: '  Ana ', email: '', telefone: '', empresa: '' });
    expect(r).toEqual({ nome: 'Ana', email: null, telefone: null, empresa: null });
  });
  it('exige nome', () => {
    const r = clienteSchema.safeParse({ nome: '  ', email: '', telefone: '', empresa: '' });
    expect(r.success).toBe(false);
    if (!r.success) expect(errosDeCampo(r.error).nome).toEqual(['Nome é obrigatório']);
  });
  it('valida e-mail quando informado', () => {
    const r = clienteSchema.safeParse({ nome: 'Ana', email: 'ana@', telefone: '', empresa: '' });
    expect(r.success).toBe(false);
    if (!r.success) expect(errosDeCampo(r.error).email).toEqual(['E-mail inválido']);
  });
});

describe('negocioSchema', () => {
  const base = { titulo: 'Site', valor: '1.500,50', etapa: 'contato', cliente_id: U1 };
  it('converte o valor pelo parseValorBRL', () => {
    expect(negocioSchema.parse(base)).toEqual({ ...base, valor: 1500.5 });
  });
  it('valor vazio é obrigatório', () => {
    const r = negocioSchema.safeParse({ ...base, valor: '' });
    expect(r.success).toBe(false);
    if (!r.success) expect(errosDeCampo(r.error).valor).toEqual(['Valor é obrigatório']);
  });
  it('rejeita valor acima do máximo', () => {
    const r = negocioSchema.safeParse({ ...base, valor: '10.000.000.000,00' });
    expect(r.success).toBe(false);
    if (!r.success) expect(errosDeCampo(r.error).valor).toEqual(['Valor máximo é 9.999.999.999,99']);
  });
  it('aceita o valor máximo', () => {
    expect(negocioSchema.parse({ ...base, valor: '9.999.999.999,99' }).valor).toBe(9999999999.99);
  });
  it('rejeita etapa desconhecida, título vazio e cliente ausente', () => {
    const r = negocioSchema.safeParse({ titulo: '', valor: '1', etapa: 'ganho', cliente_id: '' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = errosDeCampo(r.error);
      expect(e.titulo).toEqual(['Título é obrigatório']);
      expect(e.etapa).toEqual(['Etapa inválida']);
      expect(e.cliente_id).toEqual(['Selecione um cliente']);
    }
  });
});

describe('login e cadastro', () => {
  it('cadastro exige nome, e-mail válido e senha de 6+', () => {
    const r = cadastroSchema.safeParse({ nome: '', email: 'x', senha: '12345' });
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = errosDeCampo(r.error);
      expect(e.nome).toEqual(['Nome é obrigatório']);
      expect(e.email).toEqual(['E-mail inválido']);
      expect(e.senha).toEqual(['A senha precisa ter pelo menos 6 caracteres']);
    }
  });
  it('login aceita credenciais preenchidas', () => {
    expect(loginSchema.parse({ email: 'a@b.com', senha: 'x' })).toEqual({ email: 'a@b.com', senha: 'x' });
  });
});

describe('moverSchema', () => {
  it('aceita lista única que contém o id', () => {
    expect(moverSchema.safeParse({ id: U1, etapa: 'proposta', ids: [U2, U1] }).success).toBe(true);
  });
  it('rejeita ids repetidos', () => {
    expect(moverSchema.safeParse({ id: U1, etapa: 'proposta', ids: [U1, U2, U1] }).success).toBe(false);
  });
  it('rejeita lista sem o id movido', () => {
    expect(moverSchema.safeParse({ id: U1, etapa: 'proposta', ids: [U2] }).success).toBe(false);
  });
  it('rejeita item que não é uuid', () => {
    expect(moverSchema.safeParse({ id: U1, etapa: 'proposta', ids: [U1, 'x'] }).success).toBe(false);
  });
});

describe('lerCampos', () => {
  it('lê strings e usa "" para ausentes', () => {
    const fd = new FormData();
    fd.set('nome', 'Ana');
    expect(lerCampos(fd, ['nome', 'email'])).toEqual({ nome: 'Ana', email: '' });
  });
});
