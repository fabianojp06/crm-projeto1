import { describe, expect, it } from 'vitest';
import { agruparPorEtapa } from '@/lib/kanban';

describe('agruparPorEtapa', () => {
  it('cria as 5 colunas e mantém a ordem recebida', () => {
    const r = agruparPorEtapa([
      { id: 'a', etapa: 'proposta' as const },
      { id: 'b', etapa: 'contato' as const },
      { id: 'c', etapa: 'proposta' as const },
    ]);
    expect(Object.keys(r)).toEqual(['contato', 'proposta', 'negociacao', 'fechado', 'perdido']);
    expect(r.proposta.map((n) => n.id)).toEqual(['a', 'c']);
    expect(r.fechado).toEqual([]);
  });
});
