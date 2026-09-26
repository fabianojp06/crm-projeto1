export const ETAPAS = ['contato', 'proposta', 'negociacao', 'fechado', 'perdido'] as const;

export type Etapa = (typeof ETAPAS)[number];

export const ROTULO_ETAPA: Record<Etapa, string> = {
  contato: 'Contato',
  proposta: 'Proposta',
  negociacao: 'Negociação',
  fechado: 'Fechado',
  perdido: 'Perdido',
};
