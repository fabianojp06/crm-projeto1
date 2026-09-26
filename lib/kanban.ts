import { FALHA_MOVER, NEGOCIO_NAO_EXISTE } from '@/lib/acoes';
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

const PREFIXO_COLUNA = 'coluna:';

export function localizarDestino(
  colunas: Record<Etapa, { id: string }[]>,
  overId: string,
): { etapa: Etapa; indice: number } | null {
  if (overId.startsWith(PREFIXO_COLUNA)) {
    const etapa = overId.slice(PREFIXO_COLUNA.length) as Etapa;
    return etapa in colunas ? { etapa, indice: colunas[etapa].length } : null;
  }
  for (const etapa of ETAPAS) {
    const indice = colunas[etapa].findIndex((n) => n.id === overId);
    if (indice >= 0) return { etapa, indice };
  }
  return null;
}

export function aplicarMovimento<T extends { id: string; etapa: Etapa }>(
  colunas: Record<Etapa, T[]>,
  id: string,
  etapaDestino: Etapa,
  indiceDestino: number,
): { colunas: Record<Etapa, T[]>; idsDestino: string[] } | null {
  const origem = ETAPAS.find((e) => colunas[e].some((n) => n.id === id));
  if (!origem) return null;
  const indiceOrigem = colunas[origem].findIndex((n) => n.id === id);

  const novas = Object.fromEntries(ETAPAS.map((e) => [e, [...colunas[e]]])) as Record<Etapa, T[]>;
  const [item] = novas[origem].splice(indiceOrigem, 1);
  const destino = novas[etapaDestino];
  const indice = Math.min(Math.max(indiceDestino, 0), destino.length);

  if (origem === etapaDestino && indice === indiceOrigem) return null;

  destino.splice(indice, 0, { ...item, etapa: etapaDestino });
  return { colunas: novas, idsDestino: destino.map((n) => n.id) };
}

export function mensagemErroMover(codigo?: string): string {
  return codigo === 'P0002' ? NEGOCIO_NAO_EXISTE : FALHA_MOVER;
}
