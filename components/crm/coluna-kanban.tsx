'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CardNegocio } from '@/components/crm/card-negocio';
import { ROTULO_ETAPA, type Etapa } from '@/lib/etapas';
import { formatarBRL } from '@/lib/format';
import type { NegocioCard } from '@/lib/kanban';
import { somarValores } from '@/lib/metrics';
import { cn } from '@/lib/utils';

export function ColunaKanban({
  etapa,
  negocios,
  aoAbrir,
}: {
  etapa: Etapa;
  negocios: NegocioCard[];
  aoAbrir: (n: NegocioCard) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `coluna:${etapa}` });
  return (
    <section
      ref={setNodeRef}
      data-testid={`coluna-${etapa}`}
      aria-label={ROTULO_ETAPA[etapa]}
      className={cn(
        'flex min-h-64 flex-col gap-2 rounded-lg border bg-muted/40 p-3',
        isOver && 'ring-2 ring-primary',
      )}
    >
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">{ROTULO_ETAPA[etapa]}</h2>
        <span className="text-sm text-muted-foreground">{formatarBRL(somarValores(negocios.map((n) => n.valor)))}</span>
      </header>
      <SortableContext id={etapa} items={negocios.map((n) => n.id)} strategy={verticalListSortingStrategy}>
        {negocios.map((n) => (
          <CardNegocio key={n.id} negocio={n} aoAbrir={aoAbrir} />
        ))}
      </SortableContext>
    </section>
  );
}
