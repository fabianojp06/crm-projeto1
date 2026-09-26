import { describe, expect, it } from 'vitest';
import { agruparPorEtapa, aplicarMovimento, localizarDestino, mensagemErroMover } from '@/lib/kanban';

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

type Item = { id: string; etapa: 'contato' | 'proposta' | 'negociacao' | 'fechado' | 'perdido' };
const quadro = () =>
  agruparPorEtapa<Item>([
    { id: 'a', etapa: 'contato' },
    { id: 'b', etapa: 'contato' },
    { id: 'c', etapa: 'contato' },
    { id: 'p', etapa: 'proposta' },
  ]);
const ids = (c: Record<string, Item[]>, e: string) => c[e].map((n) => n.id);

describe('localizarDestino', () => {
  it('coluna vazia ou área da coluna vai para o fim', () => {
    expect(localizarDestino(quadro(), 'coluna:fechado')).toEqual({ etapa: 'fechado', indice: 0 });
    expect(localizarDestino(quadro(), 'coluna:contato')).toEqual({ etapa: 'contato', indice: 3 });
  });
  it('sobre um card usa a posição dele', () => {
    expect(localizarDestino(quadro(), 'p')).toEqual({ etapa: 'proposta', indice: 0 });
    expect(localizarDestino(quadro(), 'c')).toEqual({ etapa: 'contato', indice: 2 });
  });
  it('id desconhecido devolve null', () => {
    expect(localizarDestino(quadro(), 'zzz')).toBeNull();
  });
});

describe('aplicarMovimento', () => {
  it('move para outra coluna antes do card de destino', () => {
    const r = aplicarMovimento(quadro(), 'a', 'proposta', 0)!;
    expect(ids(r.colunas, 'contato')).toEqual(['b', 'c']);
    expect(ids(r.colunas, 'proposta')).toEqual(['a', 'p']);
    expect(r.colunas.proposta[0].etapa).toBe('proposta');
    expect(r.idsDestino).toEqual(['a', 'p']);
  });
  it('move para coluna vazia', () => {
    const r = aplicarMovimento(quadro(), 'b', 'fechado', 0)!;
    expect(ids(r.colunas, 'fechado')).toEqual(['b']);
    expect(r.idsDestino).toEqual(['b']);
  });
  it('reordena dentro da mesma coluna (para baixo e para cima)', () => {
    expect(ids(aplicarMovimento(quadro(), 'a', 'contato', 2)!.colunas, 'contato')).toEqual(['b', 'c', 'a']);
    expect(ids(aplicarMovimento(quadro(), 'c', 'contato', 0)!.colunas, 'contato')).toEqual(['c', 'a', 'b']);
  });
  it('soltar no mesmo lugar devolve null (nada é gravado)', () => {
    expect(aplicarMovimento(quadro(), 'b', 'contato', 1)).toBeNull();
  });
  it('índice além do fim vai para o fim', () => {
    expect(ids(aplicarMovimento(quadro(), 'a', 'contato', 99)!.colunas, 'contato')).toEqual(['b', 'c', 'a']);
  });
  it('não altera o quadro original', () => {
    const q = quadro();
    aplicarMovimento(q, 'a', 'proposta', 0);
    expect(ids(q, 'contato')).toEqual(['a', 'b', 'c']);
  });
  it('id desconhecido devolve null', () => {
    expect(aplicarMovimento(quadro(), 'zzz', 'contato', 0)).toBeNull();
  });
});

describe('mensagemErroMover', () => {
  it('P0002 vira "não existe mais"; o resto é genérico', () => {
    expect(mensagemErroMover('P0002')).toBe('Este negócio não existe mais');
    expect(mensagemErroMover('40001')).toBe('Não foi possível mover o negócio, tente de novo');
    expect(mensagemErroMover(undefined)).toBe('Não foi possível mover o negócio, tente de novo');
  });
});
