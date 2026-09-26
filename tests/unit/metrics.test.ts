import { describe, expect, it } from 'vitest';
import { calcularIndicadores, somarValores } from '@/lib/metrics';

describe('calcularIndicadores', () => {
  it('lista vazia zera tudo e mostra as 5 etapas', () => {
    const r = calcularIndicadores(0, []);
    expect(r).toMatchObject({ totalClientes: 0, negociosAbertos: 0, valorAberto: 0, valorGanho: 0 });
    expect(r.porEtapa.map((p) => [p.etapa, p.rotulo, p.valor])).toEqual([
      ['contato', 'Contato', 0],
      ['proposta', 'Proposta', 0],
      ['negociacao', 'Negociação', 0],
      ['fechado', 'Fechado', 0],
      ['perdido', 'Perdido', 0],
    ]);
  });

  it('separa abertos, ganhos e perdidos', () => {
    const r = calcularIndicadores(3, [
      { etapa: 'contato', valor: 100 },
      { etapa: 'proposta', valor: 200 },
      { etapa: 'negociacao', valor: 300 },
      { etapa: 'fechado', valor: 1000 },
      { etapa: 'perdido', valor: 5000 },
    ]);
    expect(r.totalClientes).toBe(3);
    expect(r.negociosAbertos).toBe(3);
    expect(r.valorAberto).toBe(600);
    expect(r.valorGanho).toBe(1000);
    expect(r.porEtapa.find((p) => p.etapa === 'perdido')?.valor).toBe(5000);
  });

  it('soma decimais sem erro de ponto flutuante', () => {
    const r = calcularIndicadores(1, [
      { etapa: 'contato', valor: 0.1 },
      { etapa: 'contato', valor: 0.2 },
    ]);
    expect(r.valorAberto).toBe(0.3);
    expect(somarValores([1500.5, 0.25, 0.25])).toBe(1501);
  });
});
