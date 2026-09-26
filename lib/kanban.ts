import { ETAPAS, type Etapa } from '@/lib/etapas';

export type NegocioCard = {
  id: string;
  titulo: string;
  valor: number;
  etapa: Etapa;
  posicao: number;
  cliente_id: string;
  clienteNome: string;
};

export function agruparPorEtapa<T extends { etapa: Etapa }>(itens: T[]): Record<Etapa, T[]> {
  const colunas = Object.fromEntries(ETAPAS.map((e) => [e, [] as T[]])) as Record<Etapa, T[]>;
  for (const item of itens) colunas[item.etapa].push(item);
  return colunas;
}
