import { describe, expect, it } from 'vitest';
import { ETAPAS, ROTULO_ETAPA } from '@/lib/etapas';
import { formatarBRL, formatarNumeroBR } from '@/lib/format';

const semNbsp = (s: string) => s.replace(/\s/g, ' ');

describe('etapas', () => {
  it('estão na ordem do kanban', () => {
    expect(ETAPAS).toEqual(['contato', 'proposta', 'negociacao', 'fechado', 'perdido']);
    expect(ETAPAS.map((e) => ROTULO_ETAPA[e])).toEqual([
      'Contato', 'Proposta', 'Negociação', 'Fechado', 'Perdido',
    ]);
  });
});

describe('formatarBRL', () => {
  it('formata em reais com duas casas', () => {
    expect(semNbsp(formatarBRL(1500.5))).toBe('R$ 1.500,50');
    expect(semNbsp(formatarBRL(0))).toBe('R$ 0,00');
  });
});

describe('formatarNumeroBR', () => {
  it('formata sem símbolo, para preencher o campo de valor', () => {
    expect(formatarNumeroBR(1500.5)).toBe('1.500,50');
    expect(formatarNumeroBR(3)).toBe('3,00');
  });
});
