'use client';

import { CardNegocio } from '@/components/crm/card-negocio';
import { ROTULO_ETAPA, type Etapa } from '@/lib/etapas';
import { formatarBRL } from '@/lib/format';
import type { NegocioCard } from '@/lib/kanban';
import { somarValores } from '@/lib/metrics';

export function ColunaKanban({
  etapa,
  negocios,
  aoAbrir,
}: {
  etapa: Etapa;
  negocios: NegocioCard[];
  aoAbrir: (n: NegocioCard) => void;
}) {
  return (
    <section
      data-testid={`coluna-${etapa}`}
      aria-label={ROTULO_ETAPA[etapa]}
      className="flex min-h-64 flex-col gap-2 rounded-lg border bg-muted/40 p-3"
    >
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">{ROTULO_ETAPA[etapa]}</h2>
        <span className="text-sm text-muted-foreground">{formatarBRL(somarValores(negocios.map((n) => n.valor)))}</span>
      </header>
      {negocios.map((n) => (
        <CardNegocio key={n.id} negocio={n} aoAbrir={aoAbrir} />
      ))}
    </section>
  );
}
