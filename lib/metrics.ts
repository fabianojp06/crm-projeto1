import { ETAPAS, ROTULO_ETAPA, type Etapa } from '@/lib/etapas';

export type Indicadores = {
  totalClientes: number;
  negociosAbertos: number;
  valorAberto: number;
  valorGanho: number;
  porEtapa: { etapa: Etapa; rotulo: string; valor: number }[];
};

// Soma em centavos para não acumular erro de ponto flutuante.
export function somarValores(valores: number[]): number {
  return valores.reduce((c, v) => c + Math.round(v * 100), 0) / 100;
}

const ABERTAS: Etapa[] = ['contato', 'proposta', 'negociacao'];

export function calcularIndicadores(
  totalClientes: number,
  negocios: { etapa: Etapa; valor: number }[],
): Indicadores {
  const abertos = negocios.filter((n) => ABERTAS.includes(n.etapa));
  return {
    totalClientes,
    negociosAbertos: abertos.length,
    valorAberto: somarValores(abertos.map((n) => n.valor)),
    valorGanho: somarValores(negocios.filter((n) => n.etapa === 'fechado').map((n) => n.valor)),
    porEtapa: ETAPAS.map((etapa) => ({
      etapa,
      rotulo: ROTULO_ETAPA[etapa],
      valor: somarValores(negocios.filter((n) => n.etapa === etapa).map((n) => n.valor)),
    })),
  };
}
