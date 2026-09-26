'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { formatarBRL } from '@/lib/format';
import type { NegocioCard } from '@/lib/kanban';
import { cn } from '@/lib/utils';

export function CardNegocio({ negocio, aoAbrir }: { negocio: NegocioCard; aoAbrir: (n: NegocioCard) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: negocio.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-start gap-2 rounded-md border bg-background p-3 text-sm shadow-sm',
        isDragging && 'opacity-50',
      )}
    >
      {/* só o handle arrasta */}
      <button
        type="button"
        aria-label={`Arrastar ${negocio.titulo}`}
        className="mt-0.5 cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      {/* o corpo abre a edição, por clique ou por teclado */}
      <button type="button" onClick={() => aoAbrir(negocio)} className="flex-1 text-left">
        <span className="block font-medium">{negocio.titulo}</span>
        <span className="block text-muted-foreground">{negocio.clienteNome}</span>
        <span className="mt-1 block font-semibold">{formatarBRL(negocio.valor)}</span>
      </button>
    </div>
  );
}
