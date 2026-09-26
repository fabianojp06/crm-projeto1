import { z } from 'zod';
import { ETAPAS } from '@/lib/etapas';

// Formatos aceitos para o campo de valor (spec, seção 8).
const RE_BR = /^(0|[1-9]\d*|[1-9]\d{0,2}(\.\d{3})+)(,\d{1,2})?$/;
const RE_PONTO = /^(0|[1-9]\d*)\.\d{1,2}$/;

export type ResultadoValor = { ok: true; valor: number } | { ok: false; erro: string };

export function parseValorBRL(texto: string): ResultadoValor {
  const limpo = texto.replace(/R\$/gi, '').replace(/\s/g, '');
  if (limpo === '') return { ok: false, erro: 'Valor é obrigatório' };
  if (RE_PONTO.test(limpo)) return { ok: true, valor: Number(limpo) };
  if (RE_BR.test(limpo)) {
    return { ok: true, valor: Number(limpo.replace(/\./g, '').replace(',', '.')) };
  }
  return { ok: false, erro: 'Valor inválido. Use o formato 1.500,50' };
}

// Escapa os curingas do ILIKE. O `*` não é tratado: limitação aceita na spec.
export function escaparBusca(q: string): string {
  return q.replace(/[\\%_]/g, (c) => `\\${c}`);
}

const opcional = z.string().trim().transform((v) => (v === '' ? null : v));

export const clienteSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório'),
  email: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .pipe(z.email('E-mail inválido').nullable()),
  telefone: opcional,
  empresa: opcional,
});

export const negocioSchema = z.object({
  titulo: z.string().trim().min(1, 'Título é obrigatório'),
  valor: z
    .string()
    .transform((texto, ctx) => {
      const r = parseValorBRL(texto);
      if (!r.ok) {
        ctx.addIssue({ code: 'custom', message: r.erro });
        return z.NEVER;
      }
      return r.valor;
    })
    .pipe(z.number().min(0).max(9999999999.99, 'Valor máximo é 9.999.999.999,99')),
  etapa: z.enum(ETAPAS, 'Etapa inválida'),
  cliente_id: z.uuid('Selecione um cliente'),
});

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail'),
  senha: z.string().min(1, 'Informe a senha'),
});

export const cadastroSchema = z.object({
  nome: z.string().trim().min(1, 'Nome é obrigatório'),
  email: z.string().trim().pipe(z.email('E-mail inválido')),
  senha: z.string().min(6, 'A senha precisa ter pelo menos 6 caracteres'),
});

export const moverSchema = z
  .object({
    id: z.uuid(),
    etapa: z.enum(ETAPAS),
    ids: z.array(z.uuid()).refine((a) => new Set(a).size === a.length, 'Lista com ids repetidos'),
  })
  .refine((d) => d.ids.includes(d.id), 'A lista precisa conter o negócio movido');

export function errosDeCampo(erro: z.ZodError): Record<string, string[] | undefined> {
  return z.flattenError(erro).fieldErrors as Record<string, string[] | undefined>;
}
