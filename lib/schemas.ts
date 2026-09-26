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
